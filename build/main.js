import { segmentBuffer } from "./buffer.js";
import { encodeOgg } from "./encode.js";
import { uploadTo } from "./upload.js";
// TODO: add doc
function encodeUpload(sampleRate) {
    const encoder = encodeOgg(sampleRate);
    const { upload } = uploadTo();
    return {
        encode: async (segment) => {
            upload(await encoder(segment));
        }
    };
}
// TODO: add doc
export function main() {
    if (!navigator.mediaDevices) {
        throw Error("No media devices, recording improbable.");
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    ctx.suspend();
    const biquadFilter = ctx.createBiquadFilter();
    biquadFilter.type = "lowpass";
    biquadFilter.channelCount = 1;
    biquadFilter.frequency.setValueAtTime(6000, ctx.currentTime);
    const bufferSize = 2048;
    const recorder = ctx.createScriptProcessor(bufferSize, 1, 1);
    biquadFilter.connect(recorder);
    // need to connect to a destination for it to work on safari
    recorder.connect(ctx.destination);
    const { encode } = encodeUpload(ctx.sampleRate);
    const { feed, init, stop, isRunning } = segmentBuffer(ctx.sampleRate, bufferSize, encode);
    recorder.onaudioprocess = (event) => {
        if (!isRunning())
            return;
        /**
         * chrome and safari reuse the buffer, so it needs to be copied
         */
        feed(Float32Array.from(event.inputBuffer.getChannelData(0)));
    };
    const tracks = [];
    const record = () => {
        /**
         * Safari doesn't auto-start context
         */
        ctx.resume();
        navigator.mediaDevices
            .getUserMedia({
            audio: {
                channelCount: 1,
                autoGainControl: false,
                echoCancellation: false,
                noiseSuppression: false
            },
            video: false
        })
            .then((stream) => {
            const source = ctx.createMediaStreamSource(stream);
            source.connect(biquadFilter);
            init();
            stream
                .getAudioTracks()
                .forEach((track) => {
                tracks.push(track);
            });
        })
            .catch((err) => {
            console.log("The following error occurred: " + err);
        });
    };
    const end = () => {
        var _a;
        stop();
        ctx.suspend();
        while (tracks.length > 0) {
            (_a = tracks.pop()) === null || _a === void 0 ? void 0 : _a.stop();
        }
    };
    return {
        record,
        end
    };
}
