import { segmentBuffer } from "./buffer.js";
import { encodeOgg } from "./encode.js";
import { uploadTo } from "./upload.js";
import { initState } from "./state.js";
import { loadStorage } from "./storage.js";
// TODO: add doc
function encodeUpload(state) {
    const encoder = encodeOgg(state.getState().sampleRate);
    const { upload } = uploadTo(state);
    return {
        encode: (channel) => async (segment) => {
            upload({ data: await encoder(segment), channel });
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
    const state = {
        output: false
    };
    const emptyBuffer = new Float32Array(bufferSize);
    recorder.onaudioprocess = (event) => {
        /**
         * chrome and safari reuse the buffer, so it needs to be copied
         */
        const data = Float32Array.from(event.inputBuffer.getChannelData(0));
        if (isRunning())
            feed(data);
        event.outputBuffer
            .getChannelData(0)
            .set(state.output ? data : emptyBuffer);
    };
    return {
        output: recorder,
        stopRec: stop,
        input: biquadFilter,
        startRec: init,
        outOn: () => {
            state.output = true;
        },
        outOff: () => {
            state.output = false;
        },
        outputting: () => state.output,
        recording: () => isRunning()
    };
}
function stopChannelStream({ channel, getState, updateState }) {
    const { processors, connections, merger } = getState();
    const { output: dOutput, outputting, stopRec } = processors[channel];
    stopRec();
    if (!outputting()) {
        const newConn = [...connections];
        for (const chan of newConn[channel]) {
            dOutput.disconnect(merger[0], 0, chan);
        }
        newConn[channel] = [];
        updateState({ connections: newConn });
    }
}
// toggles recording of channel
function streamChannel({ channel, getState, updateState }) {
    const { processors, connections, merger } = getState();
    const { output, startRec, recording } = processors[channel];
    // we are already recording
    if (recording())
        return { deactivate: () => { } };
    // output needs a destination
    // check if channel has current output channels
    if (connections[channel].length === 0) {
        output.connect(merger[0], 0, 0);
        const newConn = [...connections];
        newConn[channel].push(0);
        updateState({ connections: newConn });
    }
    startRec();
    return {
        deactivate: () => stopChannelStream({ channel, getState, updateState })
    };
}
function muteOutput({ inputChannel, outputChannel, getState, updateState }) {
    const { connections, merger, processors } = getState();
    const { output, outOff, recording } = processors[inputChannel];
    // if there are more than 1 channel
    // just disconnect this channel, remove from list
    // if not, turn off outputting
    if (!recording() || connections[inputChannel].length > 1) {
        output.disconnect(merger[0], 0, outputChannel);
        const newConn = [...connections];
        newConn[inputChannel].splice(connections[inputChannel].indexOf(outputChannel), 1);
        updateState({ connections: newConn });
        if (!connections[inputChannel].length) {
            outOff();
        }
    }
    else if (recording() && connections[inputChannel].length === 1) {
        outOff();
    }
}
// toggles output of channel
function sendToOutput({ inputChannel, outputChannel, getState, updateState }) {
    const { processors, connections, merger } = getState();
    const { output, outOn, outputting } = processors[inputChannel];
    const newConn = [...connections];
    // ensure buffer is outputting
    if (!outputting() && connections[inputChannel].length) {
        const chan = newConn[inputChannel];
        for (const c of chan) {
            if (c !== outputChannel)
                output.disconnect(merger[0], 0, c);
        }
        if (chan.indexOf(outputChannel) === -1) {
            output.connect(merger[0], 0, outputChannel);
        }
        newConn[inputChannel] = [outputChannel];
        updateState({ connections: newConn });
    }
    else if (connections[inputChannel].indexOf(outputChannel) === -1) {
        // if not already outputting to channel, output to channel
        output.connect(merger[0], 0, outputChannel);
        newConn[inputChannel].push(outputChannel);
        updateState({ connections: newConn });
    }
    if (!outputting())
        outOn();
    return {
        mute: () => muteOutput({ getState, inputChannel, outputChannel, updateState })
    };
}
async function initRecording({ ctx, handleInput }) {
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
// TODO: add doc
export async function main(onGetAudio) {
    if (!navigator.mediaDevices) {
        // TODO: display this kind of error in UI
        throw Error("No media devices, recording improbable.");
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    ctx.suspend();
    if (ctx.destination.maxChannelCount > ctx.destination.channelCount)
        ctx.destination.channelCount = ctx.destination.maxChannelCount;
    ctx.destination.channelInterpretation = "discrete";
    const state = initState({
        tracks: [],
        source: [],
        merger: [],
        processors: [],
        connections: [],
        streams: [],
        streamsInUse: {},
        sampleRate: ctx.sampleRate
    });
    const { getState, updateState } = state;
    const { encode } = encodeUpload(state);
    loadStorage({ state });
    async function handleInput(stream) {
        const tracks = [];
        stream.getAudioTracks().forEach((track) => {
            tracks.push(track);
        });
        const source = [];
        source.push(ctx.createMediaStreamSource(stream));
        const splitter = ctx.createChannelSplitter(source[0].channelCount);
        source[0].connect(splitter);
        const processors = [];
        const connections = [];
        for (let i = 0; i < source[0].channelCount; i++) {
            processors[i] = streamProcesser(ctx, encode(i));
            connections[i] = [];
            splitter.connect(processors[i].input, i, 0);
        }
        const merger = [];
        merger.push(ctx.createChannelMerger(ctx.destination.channelCount));
        merger[0].connect(ctx.destination);
        updateState({
            tracks,
            source,
            processors,
            connections,
            merger
        });
        onGetAudio();
    }
    return {
        state,
        record: () => initRecording({ ctx, handleInput }),
        end: () => {
            const { processors, tracks } = getState();
            for (const p of processors) {
                p.stopRec();
            }
            for (const t of tracks) {
                t.stop();
            }
            updateState({
                source: [],
                merger: [],
                processors: [],
                connections: [],
                tracks: []
            });
        },
        inChannels: () => getState().source[0].channelCount || 0,
        outChannels: () => ctx.destination.channelCount || 0,
        activate: (channel) => streamChannel({ getState, channel, updateState }),
        listen: (args) => sendToOutput(Object.assign(Object.assign({}, args), { getState, updateState }))
    };
}
