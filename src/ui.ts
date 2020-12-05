import { el, mnt, lstn, umnt, MntFn, emt } from "./dom.js"
import { SFn, State, StreamUse } from "./interfaces.js"
import { onDiff } from "./state.js"
import { streamsSel, streamingSel } from "./selectors.js"

// TODO: add doc
export interface ToggleFnArgs {
    inputChannel: number
    outputChannel: number // -1 input toggle
    mode: boolean
}
export type ToggleFn = (args: ToggleFnArgs) => void

// TODO: add doc
function getBox({
    appendTo,
    id,
    labelText,
    onChange
}: {
    appendTo: HTMLElement
    labelText: string
    id: string
    onChange: (mode: boolean) => void
}): void {
    const box: HTMLDivElement = el("div", { attr: { className: "item__box" } })
    mnt(appendTo)(box)

    const check: HTMLInputElement = el("input", {
        attr: { type: "checkbox", className: "item__check", id }
    })
    lstn(check)
        .on("change")
        .do((): void => {
            onChange(check.checked)
        })

    const title: HTMLLabelElement = el("label", {
        attr: { textContent: labelText, className: "item__label", htmlFor: id }
    })

    mnt(box)([check, title])
}

interface Options {
    selected: boolean
    disabled: boolean
}

function optionsGen({
    streams,
    streamsInUse,
    channel
}: {
    streams: string[]
    streamsInUse: StreamUse
    channel: number
}): HTMLOptionElement[] {
    return streams.reduce(
        (arr: HTMLOptionElement[], stream: string): HTMLOptionElement[] => {
            const attr: Options = Object.entries(streamsInUse).reduce(
                (obj: Options, [c, s]: [string, string[]]): Options => {
                    if (c === `${channel}`) {
                        s.forEach((cs: string): void => {
                            if (cs === stream) {
                                obj.selected = true
                            }
                        })
                    } else {
                        s.forEach((cs: string): void => {
                            if (cs === stream) {
                                obj.disabled = true
                            }
                        })
                    }
                    return obj
                },
                { disabled: false, selected: false }
            )
            arr.push(
                el("option", {
                    attr: { value: stream, textContent: stream, ...attr }
                })
            )
            return arr
        },
        [] as HTMLOptionElement[]
    )
}

// TODO: add doc
export async function recorderUI({
    container,
    inputCount,
    onEvent,
    outputCount,
    state: { getState, subscribe, updateState }
}: {
    inputCount: number
    outputCount: number
    container: HTMLElement
    onEvent: ToggleFn
    state: SFn
}): Promise<void> {
    // row per input
    // make titles labels, emit events on label clicks with details, call arg fn
    for (let i: number = 0; i < inputCount; i++) {
        const select: HTMLSelectElement = el("select", {
            attr: { multiple: true }
        })
        const mntSel: MntFn<HTMLSelectElement> = mnt(select)
        lstn(select)
            .on("change")
            .do((): void => {
                const selected: string[] = []
                for (
                    let sel: number = 0;
                    sel < select.selectedOptions.length;
                    sel++
                ) {
                    const option:
                        | string
                        | undefined = select.selectedOptions.item(sel)?.value
                    if (option) selected.push(option)
                }
                updateState({
                    streamsInUse: {
                        ...streamingSel(getState()),
                        [i]: selected
                    }
                })
            })

        const state: State = getState()
        mntSel(
            optionsGen({
                streams: streamsSel(state),
                streamsInUse: streamingSel(state),
                channel: i
            })
        )

        subscribe((previous: State): void => {
            const current: State = getState()
            onDiff({
                current,
                previous,
                selector: streamsSel
            }).do((streams: string[]): void => {
                emt(select)
                mntSel(
                    optionsGen({
                        streams,
                        streamsInUse: streamingSel(current),
                        channel: i
                    })
                )
            })
            onDiff({
                current,
                previous,
                selector: streamingSel
            }).do((streamsInUse: StreamUse): void => {
                emt(select)
                mntSel(
                    optionsGen({
                        streams: streamsSel(current),
                        streamsInUse,
                        channel: i
                    })
                )
            })
        })

        const inputWrap: HTMLDivElement = el("div", {
            attr: { className: "item__wrap item__red" }
        })
        const outputWrap: HTMLDivElement = el("div", {
            attr: { className: "item__wrap item__grey" }
        })

        mnt(container)(
            mnt(el("div", { attr: { className: "item__row" } }))([
                mnt(el("div", { attr: { className: "select__wrap" } }))([
                    select,
                ]),
                inputWrap,
                outputWrap
            ])
        )

        getBox({
            appendTo: inputWrap,
            id: `i${i}`,
            labelText: `Upload input channel ${i + 1}`,
            onChange: (mode: boolean): void => {
                onEvent({ inputChannel: i, mode, outputChannel: -1 })
            }
        })

        for (let o: number = 0; o < outputCount; o++) {
            getBox({
                appendTo: outputWrap,
                id: `o${o}i${i}`,
                labelText: `Send to output channel ${o + 1}`,
                onChange: (mode: boolean): void => {
                    onEvent({ inputChannel: i, mode, outputChannel: o })
                }
            })
        }
    }
}

// TODO: add doc
export function buttonUI({
    container,
    onInit,
    onStop
}: {
    container: HTMLElement
    onInit: () => void
    onStop: () => void
}): void {
    const initBtn: HTMLButtonElement = el("button", {
        attr: { textContent: "Activate inputs" }
    })

    const push: MntFn<HTMLElement> = mnt(container)
    push(initBtn)

    lstn(initBtn)
        .on("click")
        .do((): void => {
            onInit()
            umnt(initBtn)
            push(stopBtn)
        })

    const stopBtn: HTMLButtonElement = el("button", {
        attr: { textContent: "Deactivate" }
    })

    lstn(stopBtn)
        .on("click")
        .do((): void => {
            onStop()
            umnt(stopBtn)
            push(initBtn)
        })
}
