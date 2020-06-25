import { Fn } from "./interfaces"

export type UpdateStateFn<T> = (args: Partial<T>) => void

export type GetStateFn<T> = () => T

type UnsubscribeStateFn = Fn<void, void>

type SubscribeStateFn<T> = (fn: Fn<T, void>) => UnsubscribeStateFn

export interface StateFns<T> {
    getState: GetStateFn<T>
    updateState: UpdateStateFn<T>
    subscribe: SubscribeStateFn<T>
}

export function initState<T>(state: T): StateFns<T> {
    const subscribers: Fn<T, void>[] = []
    const deadFn = (): void => {}
    return {
        getState: (): T => state,
        updateState: (newState: Partial<T>): void => {
            const oldState: T = JSON.parse(JSON.stringify(state))
            Object.assign(state, newState)
            subscribers.forEach((sub: Fn<T, void>): void => sub(oldState))
        },
        subscribe: (fn: Fn<T, void>): UnsubscribeStateFn => {
            subscribers.push(fn)
            const index: number = subscribers.length
            return (): void => {
                subscribers[index] = deadFn
            }
        }
    }
}

export function onDiff<T, U>({
    current,
    previous,
    selector
}: {
    previous: T
    current: T
    selector: (state: T) => U
}): { do: Fn<Fn<U, void>, void> } {
    return {
        do: (fn: Fn<U, void>): void => {
            const curr: U = selector(current)
            if (JSON.stringify(selector(previous)) !== JSON.stringify(curr))
                fn(curr)
        }
    }
}
