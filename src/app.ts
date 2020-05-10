import { main, Main } from "./main.js"
import { getEl } from "./common/utils.js"

// TODO: add doc
function toggleVisible(el: HTMLElement[]): void {
    el.forEach((i: HTMLElement): void => {
        i.classList.toggle("visible")
    })
}

// TODO: add doc
;(async (): Promise<void> => {
    try {
        const recordBtn: HTMLButtonElement = await getEl<HTMLButtonElement>({
            selector: "#record"
        })
        const stopBtn: HTMLButtonElement = await getEl<HTMLButtonElement>({
            selector: "#stop"
        })
        const runBtn: HTMLButtonElement = await getEl<HTMLButtonElement>({
            selector: "#run"
        })

        runBtn.addEventListener("click", (): void => {
            const { record, end }: Main = main()
            toggleVisible([recordBtn, stopBtn, runBtn])
            recordBtn.addEventListener("click", record)
            stopBtn.addEventListener("click", end)
        })
    } catch (e) {
        console.error("Application Error", e)
    }
})()
