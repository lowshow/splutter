import { el, mnt, lstn, umnt, MntFn } from "./common/dom.js"

// TODO: add doc
export type ToggleFn = (
    cIn: number,
    cOut: number, // -1 input toggle
    mode: boolean
) => void

// TODO: add doc
function getBox(
    appendTo: HTMLElement,
    labelText: string,
    id: string,
    onChange: (mode: boolean) => void
): void {
    const box: HTMLDivElement = el("div")
    box.classList.add("item__box")
    mnt(appendTo)(box)
    const check: HTMLInputElement = el("input")
    check.type = "checkbox"
    check.classList.add("item__check")
    check.id = id
    mnt(box)(check)
    check.addEventListener("change", (): void => {
        onChange(check.checked)
    })
    const title: HTMLLabelElement = el("label")
    title.textContent = labelText
    title.classList.add("item__label")
    title.htmlFor = id
    mnt(box)(title)
}

// TODO: add doc
export async function recorderUI(
    inputCount: number,
    outputCount: number,
    container: HTMLElement,
    onEvent: ToggleFn
): Promise<void> {
    // row per input
    // make titles labels, emit events on label clicks with details, call arg fn
    for (let i: number = 0; i < inputCount; i++) {
        const row: HTMLDivElement = el("div")
        row.classList.add("item__row")
        mnt(container)(row)
        const left: HTMLDivElement = el("div")
        left.classList.add("item__left")
        const right: HTMLDivElement = el("div")
        right.classList.add("item__right")
        mnt(row)([left, right])
        getBox(
            left,
            `Upload input channel ${i + 1}`,
            `i${i}`,
            (mode: boolean): void => {
                onEvent(i, -1, mode)
            }
        )

        for (let o: number = 0; o < outputCount; o++) {
            getBox(
                right,
                `Send to output channel ${o + 1}`,
                `o${o}i${i}`,
                (mode: boolean): void => {
                    onEvent(i, o, mode)
                }
            )
        }
    }
}

// TODO: add doc
export function buttonUI(
    container: HTMLElement,
    onInit: () => void,
    onStop: () => void
): void {
    const initBtn: HTMLButtonElement = el("button")
    initBtn.textContent = "Start stream"
    const push: MntFn = mnt(container)
    push(initBtn)
    const stopBtn: HTMLButtonElement = el("button")
    stopBtn.textContent = "Stop stream"

    lstn(initBtn)
        .on("click")
        .do((): void => {
            onInit()
            umnt(initBtn)
            push(stopBtn)
        })

    lstn(stopBtn)
        .on("click")
        .do((): void => {
            onStop()
            umnt(stopBtn)
            push(initBtn)
        })
}
