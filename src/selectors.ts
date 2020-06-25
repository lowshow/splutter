import { State } from "./interfaces"

export function streamsSel(state: State): string[] {
    return state.streams
}

export function streamingSel(state: State): { [channel: number]: string[] } {
    return state.streamsInUse
}
