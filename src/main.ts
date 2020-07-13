import { segmentBuffer, Buffer } from "./buffer.js"
import { encodeOgg } from "./encode.js"
import { uploadTo, Upload } from "./upload.js"
import { VF, F, State, Processor, SFn } from "./interfaces.js"
import { initState, GetStateFn, UpdateStateFn } from "./state.js"
import { loadStorage } from "./storage.js"

// TODO: add docs
declare global {
    interface Window {
        AudioContext: typeof AudioContext
        webkitAudioContext: typeof AudioContext
    }
}

interface ListenFnArgs {
    inputChannel: number
    outputChannel: number
}

interface SendFnArgs extends ListenFnArgs {
    getState: GetStateFn<State>
    updateState: UpdateStateFn<State>
}

type Mute = {
    mute: VF
}

interface ActivateFnArgs {
    getState: GetStateFn<State>
    updateState: UpdateStateFn<State>
    channel: number
}

type Deactivate = {
    deactivate: VF
}

// TODO: add doc
export interface Main {
    record: F<Promise<void>>
    end: VF
    inChannels: F<number>
    outChannels: F<number>
    activate: (channel: number) => Deactivate
    listen: (args: Omit<ListenFnArgs, "getState">) => Mute
    state: SFn
}

// TODO: add doc
type EncoderFn = (segment: Float32Array) => Promise<void>
type EncoderFnGen = (channel: number) => EncoderFn
// TODO: add doc
interface EncodeUpload {
    encode: EncoderFnGen
}

// TODO: add doc
function encodeUpload(state: SFn): EncodeUpload {
    const encoder: (
        arrayBuffer: Float32Array
    ) => Promise<Uint8Array> = encodeOgg(state.getState().sampleRate)

    const { upload }: Upload = uploadTo(state)

    return {
        encode: (channel: number): EncoderFn => async (
            segment: Float32Array
        ): Promise<void> => {
            upload({ data: await encoder(segment), channel })
        }
    }
}

// TODO: add doc
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

    const state: { output: boolean } = {
        output: false
    }

    const emptyBuffer: Float32Array = new Float32Array(bufferSize)

    recorder.onaudioprocess = (event: AudioProcessingEvent): void => {
        /**
         * chrome and safari reuse the buffer, so it needs to be copied
         */
        const data: Float32Array = Float32Array.from(
            event.inputBuffer.getChannelData(0)
        )

        if (isRunning()) feed(data)

        event.outputBuffer
            .getChannelData(0)
            .set(state.output ? data : emptyBuffer)
    }

    return {
        output: recorder,
        stopRec: stop,
        input: biquadFilter,
        startRec: init,
        outOn: (): void => {
            state.output = true
        },
        outOff: (): void => {
            state.output = false
        },
        outputting: (): boolean => state.output,
        recording: (): boolean => isRunning()
    }
}

function stopChannelStream({
    channel,
    getState,
    updateState
}: ActivateFnArgs): void {
    const { processors, connections, merger }: State = getState()
    const { output: dOutput, outputting, stopRec }: Processor = processors[
        channel
    ]
    stopRec()
    if (!outputting()) {
        const newConn: number[][] = [...connections]
        for (const chan of newConn[channel]) {
            dOutput.disconnect(merger[0], 0, chan)
        }
        newConn[channel] = []
        updateState({ connections: newConn })
    }
}

// toggles recording of channel
function streamChannel({
    channel,
    getState,
    updateState
}: ActivateFnArgs): Deactivate {
    const { processors, connections, merger }: State = getState()

    const { output, startRec, recording }: Processor = processors[channel]
    // we are already recording
    if (recording()) return { deactivate: (): void => {} }

    // output needs a destination
    // check if channel has current output channels
    if (connections[channel].length === 0) {
        output.connect(merger[0], 0, 0)
        const newConn: number[][] = [...connections]
        newConn[channel].push(0)
        updateState({ connections: newConn })
    }

    startRec()

    return {
        deactivate: (): void =>
            stopChannelStream({ channel, getState, updateState })
    }
}

function muteOutput({
    inputChannel,
    outputChannel,
    getState,
    updateState
}: SendFnArgs): void {
    const { connections, merger, processors }: State = getState()
    const { output, outOff, recording }: Processor = processors[inputChannel]
    // if there are more than 1 channel
    // just disconnect this channel, remove from list
    // if not, turn off outputting
    if (!recording() || connections[inputChannel].length > 1) {
        output.disconnect(merger[0], 0, outputChannel)
        const newConn: number[][] = [...connections]
        newConn[inputChannel].splice(
            connections[inputChannel].indexOf(outputChannel),
            1
        )
        updateState({ connections: newConn })

        if (!connections[inputChannel].length) {
            outOff()
        }
    } else if (recording() && connections[inputChannel].length === 1) {
        outOff()
    }
}

// toggles output of channel
function sendToOutput({
    inputChannel,
    outputChannel,
    getState,
    updateState
}: SendFnArgs): Mute {
    const { processors, connections, merger }: State = getState()
    const { output, outOn, outputting }: Processor = processors[inputChannel]
    const newConn: number[][] = [...connections]
    // ensure buffer is outputting
    if (!outputting() && connections[inputChannel].length) {
        const chan: number[] = newConn[inputChannel]
        for (const c of chan) {
            if (c !== outputChannel) output.disconnect(merger[0], 0, c)
        }
        if (chan.indexOf(outputChannel) === -1) {
            output.connect(merger[0], 0, outputChannel)
        }
        newConn[inputChannel] = [outputChannel]
        updateState({ connections: newConn })
    } else if (connections[inputChannel].indexOf(outputChannel) === -1) {
        // if not already outputting to channel, output to channel
        output.connect(merger[0], 0, outputChannel)
        newConn[inputChannel].push(outputChannel)
        updateState({ connections: newConn })
    }

    if (!outputting()) outOn()

    return {
        mute: (): void =>
            muteOutput({ getState, inputChannel, outputChannel, updateState })
    }
}

async function initRecording({
    ctx,
    handleInput
}: {
    ctx: AudioContext
    handleInput: (stream: MediaStream) => Promise<void>
}): Promise<void> {
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

// TODO: add doc
export async function main(onGetAudio: VF): Promise<Main> {
    if (!navigator.mediaDevices) {
        // TODO: display this kind of error in UI
        throw Error("No media devices, recording improbable.")
    }

    const Ctx: typeof AudioContext =
        window.AudioContext || window.webkitAudioContext
    const ctx: AudioContext = new Ctx()
    ctx.suspend()
    ctx.destination.channelCount = ctx.destination.maxChannelCount
    ctx.destination.channelInterpretation = "discrete"

    const state: SFn = initState<State>({
        tracks: [],
        source: [],
        merger: [],
        processors: [],
        connections: [],
        streams: [],
        streamsInUse: {},
        sampleRate: ctx.sampleRate
    })

    const { getState, updateState }: SFn = state

    const { encode }: EncodeUpload = encodeUpload(state)

    loadStorage({ state })

    async function handleInput(stream: MediaStream): Promise<void> {
        const tracks: MediaStreamTrack[] = []
        stream.getAudioTracks().forEach((track: MediaStreamTrack): void => {
            tracks.push(track)
        })
        const source: MediaStreamAudioSourceNode[] = []
        source.push(ctx.createMediaStreamSource(stream))
        const splitter: ChannelSplitterNode = ctx.createChannelSplitter(
            source[0].channelCount
        )
        source[0].connect(splitter)
        const processors: Processor[] = []
        const connections: number[][] = []
        for (let i: number = 0; i < source[0].channelCount; i++) {
            processors[i] = streamProcesser(ctx, encode(i))
            connections[i] = []
            splitter.connect(processors[i].input, i, 0)
        }
        const merger: ChannelMergerNode[] = []
        merger.push(ctx.createChannelMerger(ctx.destination.channelCount))
        merger[0].connect(ctx.destination)
        updateState({
            tracks,
            source,
            processors,
            connections,
            merger
        })
        onGetAudio()
    }

    return {
        state,
        record: (): Promise<void> => initRecording({ ctx, handleInput }),
        end: (): void => {
            const { processors, tracks }: State = getState()
            for (const p of processors) {
                p.stopRec()
            }
            for (const t of tracks) {
                t.stop()
            }
            updateState({
                source: [],
                merger: [],
                processors: [],
                connections: [],
                tracks: []
            })
        },
        inChannels: (): number => getState().source[0].channelCount || 0,
        outChannels: (): number => ctx.destination.channelCount || 0,
        activate: (channel: number): Deactivate =>
            streamChannel({ getState, channel, updateState }),
        listen: (args: ListenFnArgs): Mute =>
            sendToOutput({ ...args, getState, updateState })
    }
}
