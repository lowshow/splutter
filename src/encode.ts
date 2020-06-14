import { Resolve } from "./interfaces"

// a, b TypedArray of same type
// TODO: add doc
function concatTypedArrays(a: Uint8Array, b: Uint8Array): Uint8Array {
    const c: Uint8Array = new Uint8Array(a.length + b.length)
    c.set(a, 0)
    c.set(b, a.length)
    return c
}

// TODO: add doc
export function encodeOgg(
    sampleRate: number
): (arrayBuffer: Float32Array) => Promise<Uint8Array> {
    const encodeWorker: Worker = new Worker("vendor/encoderWorker.min.js")
    const bufferLength: number = 4096

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
    })

    return (arrayBuffer: Float32Array): Promise<Uint8Array> =>
        new Promise((resolve: Resolve<Uint8Array>): void => {
            let totalArray: Uint8Array = new Uint8Array(0)

            encodeWorker.postMessage({
                command: "getHeaderPages"
            })

            const typedArray: Float32Array = new Float32Array(arrayBuffer)

            for (let i: number = 0; i < typedArray.length; i += bufferLength) {
                const tmpBuffer: Float32Array = new Float32Array(bufferLength)
                for (let j: number = 0; j < bufferLength; j++) {
                    tmpBuffer[j] = typedArray[i + j]
                }

                encodeWorker.postMessage({
                    command: "encode",
                    buffers: [tmpBuffer]
                })
            }

            encodeWorker.postMessage({
                command: "done"
            })

            encodeWorker.onmessage = (e: MessageEvent): void => {
                if (e.data.message === "done") {
                    resolve(totalArray)
                } else if (e.data.message === "page") {
                    const newArray: Uint8Array = concatTypedArrays(
                        totalArray,
                        e.data.page
                    )
                    totalArray = newArray
                }
            }
        })
}
