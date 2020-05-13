import { el } from "./common/utils.js"

export type ToggleFn = (
    cIn: number,
    cOut: number, // -1 input toggle
    mode: boolean
) => void

function getBox(
    appendTo: HTMLElement,
    labelText: string,
    id: string,
    onChange: (mode: boolean) => void
): void {
    const box: HTMLDivElement = el("div")
    box.classList.add("item__box")
    appendTo.appendChild(box)
    const title: HTMLLabelElement = el("label")
    title.textContent = labelText
    title.classList.add("item__label")
    title.htmlFor = id
    box.appendChild(title)
    const check: HTMLInputElement = el("input")
    check.type = "checkbox"
    check.classList.add("item__check")
    check.id = id
    title.appendChild(check)
    check.addEventListener("change", (): void => {
        onChange(check.checked)
    })
}

export async function ui(
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
        container.appendChild(row)
        const left: HTMLDivElement = el("div")
        left.classList.add("item__left")
        const right: HTMLDivElement = el("div")
        right.classList.add("item__right")
        row.appendChild(left)
        row.appendChild(right)
        getBox(left, `Input ${i + 1}`, `i${i}`, (mode: boolean): void => {
            onEvent(i, -1, mode)
        })

        for (let o: number = 0; o < outputCount; o++) {
            getBox(
                right,
                `Output ${o + 1}`,
                `o${o}i${i}`,
                (mode: boolean): void => {
                    onEvent(i, o, mode)
                }
            )
        }
    }
}
