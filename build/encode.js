// a, b TypedArray of same type
// TODO: add doc
function concatTypedArrays(a, b) {
    const c = new Uint8Array(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
}
// TODO: add doc
export function encodeOgg(sampleRate) {
    const encodeWorker = new Worker("vendor/encoderWorker.min.js");
    const bufferLength = 4096;
    encodeWorker.postMessage({
        command: "init",
        encoderSampleRate: 12000,
        bufferLength,
        originalSampleRate: sampleRate,
        maxFramesPerPage: 480,
        encoderApplication: 2049,
        encoderFrameSize: 20,
        encoderComplexity: 0,
        resampleQuality: 0,
        bitRate: 12000,
        reuseWorker: true
    });
    return (arrayBuffer) => new Promise((resolve) => {
        let totalArray = new Uint8Array(0);
        encodeWorker.postMessage({
            command: "getHeaderPages"
        });
        const typedArray = new Float32Array(arrayBuffer);
        for (let i = 0; i < typedArray.length; i += bufferLength) {
            const tmpBuffer = new Float32Array(bufferLength);
            for (let j = 0; j < bufferLength; j++) {
                tmpBuffer[j] = typedArray[i + j];
            }
            encodeWorker.postMessage({
                command: "encode",
                buffers: [tmpBuffer]
            });
        }
        encodeWorker.postMessage({
            command: "done"
        });
        encodeWorker.onmessage = (e) => {
            if (e.data.message === "done") {
                resolve(totalArray);
            }
            else if (e.data.message === "page") {
                const newArray = concatTypedArrays(totalArray, e.data.page);
                totalArray = newArray;
            }
        };
    });
}
