import { segmentBuffer, Buffer } from "./buffer.js"
import { encodeOgg } from "./encode.js"
import { uploadTo, Upload } from "./upload.js"
import { VF, F } from "./common/interfaces.js"

// TODO: add docs
declare global {
    interface Window {
        AudioContext: typeof AudioContext
        webkitAudioContext: typeof AudioContext
    }
}

// TODO: add doc
export interface Main {
    record: F<Promise<void>>
    end: VF
    inChannels: F<number>
    outChannels: F<number>
    activate: (channel: number) => { deactivate: VF }
    listen: (iChan: number, oChan: number) => { mute: VF }
}

// TODO: add doc
type EncoderFn = (segment: Float32Array) => Promise<void>

// TODO: add doc
interface EncodeUpload {
    encode: EncoderFn
}

interface Processor {
    output: AudioNode
    stopRec: VF
    input: AudioNode
    startRec: VF
    outOn: VF
    outOff: VF
    outputting: F<boolean>
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

function streamProcesser(ctx: AudioContext, encode: EncoderFn): Processor {
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

    const { feed, isRunning, init, stop }: Buffer = segmentBuffer(
        ctx.sampleRate,
        bufferSize,
        encode
    )

    let output: boolean = false

    recorder.onaudioprocess = (event: AudioProcessingEvent): void => {
        /**
         * chrome and safari reuse the buffer, so it needs to be copied
         */
        const data: Float32Array = Float32Array.from(
            event.inputBuffer.getChannelData(0)
        )

        if (isRunning()) feed(data)

        if (output) event.outputBuffer.getChannelData(0).set(data)
    }

    return {
        output: recorder,
        stopRec: (): void => {
            stop()
            output = false
        },
        input: biquadFilter,
        startRec: init,
        outOn: (): void => {
            output = true
        },
        outOff: (): void => {
            output = false
        },
        outputting: (): boolean => output
    }
}

// TODO: add doc
export async function main(onGetAudio: VF): Promise<Main> {
    if (!navigator.mediaDevices) {
        throw Error("No media devices, recording improbable.")
    }

    const Ctx: typeof AudioContext =
        window.AudioContext || window.webkitAudioContext
    const ctx: AudioContext = new Ctx()
    ctx.suspend()

    const { encode }: EncodeUpload = encodeUpload(ctx.sampleRate)

    const tracks: MediaStreamTrack[] = []
    const source: MediaStreamAudioSourceNode[] = []
    const merger: ChannelMergerNode[] = []
    const processors: Processor[] = []
    const connections: number[][] = []

    // toggles recording of channel
    function activate(channel: number): { deactivate: VF } {
        const { output, stopRec, outputting, startRec }: Processor = processors[
            channel
        ]
        // we are already recording
        if (!outputting() && connections[channel].length)
            return { deactivate: (): void => {} }
        // output needs a destination
        // check if channel has current output channels
        if (connections[channel].length === 0) {
            output.connect(merger[0], 0, 0)
            connections[channel].push(0)
        }

        startRec()

        function deactivate(): void {
            stopRec()
            if (!outputting()) {
                while (connections[channel].length) {
                    const chan: number | undefined = connections[channel].pop()
                    if (chan !== undefined)
                        output.disconnect(merger[0], 0, chan)
                }
            }
        }

        return {
            deactivate
        }
    }

    // toggles output of channel
    function listen(iChan: number, oChan: number): { mute: VF } {
        const { output, outOn, outputting, outOff }: Processor = processors[
            iChan
        ]
        // ensure buffer is outputting
        if (!outputting() && connections[iChan].length) {
            // is recording but not outputting
            // need to make sure our connections are
            // correct, then run outputter
            const old: number[] = connections[iChan].splice(
                0,
                connections[iChan].length,
                oChan
            )
            old.forEach((c: number): void => {
                if (c !== oChan) output.disconnect(merger[0], 0, c)
            })
            if (old.indexOf(oChan) === -1) {
                output.connect(merger[0], 0, oChan)
            }
        } else if (connections[iChan].indexOf(oChan) === -1) {
            // if not already outputting to channel, output to channel
            output.connect(merger[0], 0, oChan)
            connections[iChan].push(oChan)
        }

        if (!outputting()) {
            outOn()
        }

        function mute(): void {
            // if there are more than 1 channel
            // just disconnect this channel, remove from list
            // if not, turn off outputting
            if (connections[iChan].length) {
                output.disconnect(merger[0], 0, oChan)
                connections[iChan].splice(connections[iChan].indexOf(oChan), 1)
            } else {
                outOff()
            }
        }

        return {
            mute
        }
    }

    async function handleInput(stream: MediaStream): Promise<void> {
        stream.getAudioTracks().forEach((track: MediaStreamTrack): void => {
            tracks.push(track)
        })
        source.push(ctx.createMediaStreamSource(stream))
        const splitter: ChannelSplitterNode = ctx.createChannelSplitter(
            source[0].channelCount
        )
        source[0].connect(splitter)
        for (let i: number = 0; i < source[0].channelCount; i++) {
            processors[i] = streamProcesser(ctx, encode)
            connections[i] = []
            splitter.connect(processors[i].input, i, 0)
        }
        merger.push(ctx.createChannelMerger(source[0].channelCount))
        merger[0].connect(ctx.destination)
        onGetAudio()
    }

    async function record(): Promise<void> {
        /**
         * Safari doesn't auto-start context
         */
        ctx.resume()
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
            .catch((err: Error): void => {
                console.log("The following error occurred: " + err)
            })
    }

    function end(): void {
        source.pop()
        merger.pop()
        while (processors.length) {
            processors.pop()?.stopRec()
            connections.pop()
        }
        ctx.suspend()
        while (tracks.length) {
            tracks.pop()?.stop()
        }
    }

    return {
        record,
        end,
        inChannels: (): number => source[0].channelCount || 0,
        outChannels: (): number => ctx.destination.channelCount || 0,
        activate,
        listen
    }
}
