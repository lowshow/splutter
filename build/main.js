import { segmentBuffer } from "./buffer.js";
import { encodeOgg } from "./encode.js";
import { uploadTo } from "./upload.js";
// TODO: add doc
function encodeUpload(sampleRate, streamAlias) {
    const encoder = encodeOgg(sampleRate);
    const { upload } = uploadTo(streamAlias);
    return {
        encode: async (segment) => {
            upload(await encoder(segment));
        }
    };
}
// TODO: add doc
function streamProcesser(ctx, encode) {
    const biquadFilter = ctx.createBiquadFilter();
    biquadFilter.type = "lowpass";
    biquadFilter.channelCount = 1;
    biquadFilter.frequency.setValueAtTime(6000, ctx.currentTime);
    const bufferSize = 2048;
    const recorder = ctx.createScriptProcessor(bufferSize, 1, 1);
    biquadFilter.connect(recorder);
    const { feed, isRunning, init, stop } = segmentBuffer(ctx.sampleRate, bufferSize, encode);
    let output = false;
    recorder.onaudioprocess = (event) => {
        /**
         * chrome and safari reuse the buffer, so it needs to be copied
         */
        const data = Float32Array.from(event.inputBuffer.getChannelData(0));
        if (isRunning())
            feed(data);
        if (output)
            event.outputBuffer.getChannelData(0).set(data);
    };
    return {
        output: recorder,
        stopRec: () => {
            stop();
            output = false;
        },
        input: biquadFilter,
        startRec: init,
        outOn: () => {
            output = true;
        },
        outOff: () => {
            output = false;
        },
        outputting: () => output
    };
}
// TODO: add doc
export async function main(streamAlias, onGetAudio) {
    if (!navigator.mediaDevices) {
        throw Error("No media devices, recording improbable.");
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    ctx.suspend();
    ctx.destination.channelCount = ctx.destination.maxChannelCount;
    ctx.destination.channelInterpretation = "discrete";
    const { encode } = encodeUpload(ctx.sampleRate, streamAlias);
    const tracks = [];
    const source = [];
    const merger = [];
    const processors = [];
    const connections = [];
    // toggles recording of channel
    function activate(channel) {
        const { output, stopRec, outputting, startRec } = processors[channel];
        // we are already recording
        if (!outputting() && connections[channel].length)
            return { deactivate: () => { } };
        // output needs a destination
        // check if channel has current output channels
        if (connections[channel].length === 0) {
            output.connect(merger[0], 0, 0);
            connections[channel].push(0);
        }
        startRec();
        function deactivate() {
            stopRec();
            if (!outputting()) {
                while (connections[channel].length) {
                    const chan = connections[channel].pop();
                    if (chan !== undefined)
                        output.disconnect(merger[0], 0, chan);
                }
            }
        }
        return {
            deactivate
        };
    }
    // toggles output of channel
    function listen(iChan, oChan) {
        const { output, outOn, outputting, outOff } = processors[iChan];
        // ensure buffer is outputting
        if (!outputting() && connections[iChan].length) {
            // is recording but not outputting
            // need to make sure our connections are
            // correct, then run outputter
            const old = connections[iChan].splice(0, connections[iChan].length, oChan);
            old.forEach((c) => {
                if (c !== oChan)
                    output.disconnect(merger[0], 0, c);
            });
            if (old.indexOf(oChan) === -1) {
                output.connect(merger[0], 0, oChan);
            }
        }
        else if (connections[iChan].indexOf(oChan) === -1) {
            // if not already outputting to channel, output to channel
            output.connect(merger[0], 0, oChan);
            connections[iChan].push(oChan);
        }
        if (!outputting())
            outOn();
        function mute() {
            // if there are more than 1 channel
            // just disconnect this channel, remove from list
            // if not, turn off outputting
            if (connections[iChan].length) {
                output.disconnect(merger[0], 0, oChan);
                connections[iChan].splice(connections[iChan].indexOf(oChan), 1);
            }
            else {
                outOff();
            }
        }
        return {
            mute
        };
    }
    async function handleInput(stream) {
        stream.getAudioTracks().forEach((track) => {
            tracks.push(track);
        });
        source.push(ctx.createMediaStreamSource(stream));
        const splitter = ctx.createChannelSplitter(source[0].channelCount);
        source[0].connect(splitter);
        for (let i = 0; i < source[0].channelCount; i++) {
            processors[i] = streamProcesser(ctx, encode);
            connections[i] = [];
            splitter.connect(processors[i].input, i, 0);
        }
        merger.push(ctx.createChannelMerger(ctx.destination.channelCount));
        merger[0].connect(ctx.destination);
        onGetAudio();
    }
    async function record() {
        /**
         * Safari doesn't auto-start context
         */
        ctx.resume();
        await navigator.mediaDevices
            .getUserMedia({
            audio: {
                autoGainControl: false,
                echoCancellation: false,
                noiseSuppression: false
            },
            video: false
        })
            .then(handleInput)
            .catch((err) => {
            console.log("The following error occurred: " + err);
        });
    }
    function end() {
        var _a, _b;
        source.pop();
        merger.pop();
        while (processors.length) {
            (_a = processors.pop()) === null || _a === void 0 ? void 0 : _a.stopRec();
            connections.pop();
        }
        ctx.suspend();
        while (tracks.length) {
            (_b = tracks.pop()) === null || _b === void 0 ? void 0 : _b.stop();
        }
    }
    return {
        record,
        end,
        inChannels: () => source[0].channelCount || 0,
        outChannels: () => ctx.destination.channelCount || 0,
        activate,
        listen
    };
}
