import { StateFns } from "./state"

// TODO: add doc
export type Resolve<T> = (value?: T | PromiseLike<T> | undefined) => void

// TODO: add doc
export type Reject = (reason?: any) => void

// TODO: add doc
export type Maybe<T> = T | void

// TODO: add doc
export type ValueOf<T> = T[keyof T]

// TODO: add doc
export type StringObject = { [index: string]: string }

export type Fn<I, O> = (_: I) => O

export type F<T> = Fn<void, T>

export type VF = F<void>

// TODO: add doc
export interface State {
    sampleRate: number
    tracks: MediaStreamTrack[]
    source: MediaStreamAudioSourceNode[]
    merger: ChannelMergerNode[]
    processors: Processor[]
    connections: number[][]
    streams: string[]
    streamsInUse: StreamUse
}

export type SFn = StateFns<State>

export type StreamUse = { [channel: number]: string[] }

// TODO: add doc
export interface Processor {
    output: AudioNode
    stopRec: VF
    input: AudioNode
    startRec: VF
    outOn: VF
    outOff: VF
    outputting: F<boolean>
    recording: F<boolean>
}
