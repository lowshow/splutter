import { VF, F } from "./common/interfaces"

// TODO: add doc
export interface State {
    tracks: MediaStreamTrack[]
    source: MediaStreamAudioSourceNode[]
    merger: ChannelMergerNode[]
    processors: Processor[]
    connections: number[][]
}

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

export type UpdateStateFn = (args: Partial<State>) => void

export type GetStateFn = () => State

export interface StateFns {
    getState: GetStateFn
    updateState: UpdateStateFn
}

export function initState(state: State): StateFns {
    return {
        getState: (): State => state,
        updateState: (newState: Partial<State>): void => {
            state = { ...state, ...newState }
        }
    }
}
