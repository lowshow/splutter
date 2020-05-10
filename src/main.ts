import { segmentBuffer, Buffer } from "./buffer.js"
import { encodeOgg } from "./encode.js"
import { uploadTo, Upload } from "./upload.js"

// TODO: add docs
declare global {
    interface Window {
        AudioContext: typeof AudioContext
        webkitAudioContext: typeof AudioContext
    }
}

// TODO: add doc
export interface Main {
    record: () => void
    end: () => void
}

// TODO: add doc
interface EncodeUpload {
    encode: (segment: Float32Array) => Promise<void>
}

// TODO: add doc
function encodeUpload(sampleRate: number): EncodeUpload {
    const encoder: (
        arrayBuffer: Float32Array
    ) => Promise<Uint8Array> = encodeOgg(sampleRate)

    const { upload }: Upload = uploadTo()

    return {
        encode: async (segment: Float32Array): Promise<void> => {
            upload(await encoder(segment))
        }
    }
}

// TODO: add doc
export function main(): Main {
    if (!navigator.mediaDevices) {
        throw Error("No media devices, recording improbable.")
    }

    const Ctx: typeof AudioContext =
        window.AudioContext || window.webkitAudioContext
    const ctx: AudioContext = new Ctx()
    ctx.suspend()

    const biquadFilter: BiquadFilterNode = ctx.createBiquadFilter()
    biquadFilter.type = "lowpass"
    biquadFilter.channelCount = 1
    biquadFilter.frequency.setValueAtTime(6000, ctx.currentTime)

    const bufferSize: number = 2048
    const recorder: ScriptProcessorNode = ctx.createScriptProcessor(
        bufferSize,
        1,
        1
    )
    biquadFilter.connect(recorder)
    // need to connect to a destination for it to work on safari
    recorder.connect(ctx.destination)

    const { encode }: EncodeUpload = encodeUpload(ctx.sampleRate)

    const { feed, init, stop, isRunning }: Buffer = segmentBuffer(
        ctx.sampleRate,
        bufferSize,
        encode
    )

    recorder.onaudioprocess = (event: AudioProcessingEvent): void => {
        if (!isRunning()) return

        /**
         * chrome and safari reuse the buffer, so it needs to be copied
         */

        feed(Float32Array.from(event.inputBuffer.getChannelData(0)))
    }

    const tracks: MediaStreamTrack[] = []

    const record = (): void => {
        /**
         * Safari doesn't auto-start context
         */
        ctx.resume()
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
            .then((stream: MediaStream): void => {
                const source: MediaStreamAudioSourceNode = ctx.createMediaStreamSource(
                    stream
                )
                source.connect(biquadFilter)
                init()
                stream
                    .getAudioTracks()
                    .forEach((track: MediaStreamTrack): void => {
                        tracks.push(track)
                    })
            })
            .catch((err: Error): void => {
                console.log("The following error occurred: " + err)
            })
    }

    const end = (): void => {
        stop()
        ctx.suspend()
        while (tracks.length > 0) {
            tracks.pop()?.stop()
        }
    }

    return {
        record,
        end
    }
}
