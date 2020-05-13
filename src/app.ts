import { main, Main } from "./main.js"
import { getEl } from "./common/utils.js"
import { ui } from "./ui.js"
import { VF, F } from "./common/interfaces.js"

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
        const container: HTMLDivElement = await getEl<HTMLDivElement>({
            selector: "#container"
        })

        async function setUI(
            inChannels: number,
            outChannels: number,
            activate: (
                channel: number
            ) => {
                deactivate: F<void>
            },
            listen: (
                iChan: number,
                oChan: number
            ) => {
                mute: F<void>
            }
        ): Promise<void> {
            const deactivate: VF[] = []
            const mute: VF[] = []

            await ui(
                inChannels,
                outChannels,
                container,
                (cIn: number, cOut: number, mode: boolean): void => {
                    if (cOut === -1) {
                        if (mode) {
                            deactivate[cIn] = activate(cIn).deactivate
                        } else {
                            deactivate[cIn]()
                        }
                    } else {
                        if (mode) {
                            mute[outChannels * cIn + cOut] = listen(
                                cIn,
                                cOut
                            ).mute
                        } else {
                            mute[outChannels * cIn + cOut]()
                        }
                    }
                }
            )
        }

        runBtn.addEventListener(
            "click",
            async (): Promise<void> => {
                const {
                    record,
                    end,
                    activate,
                    inChannels,
                    listen,
                    outChannels
                }: Main = await main((): void => {
                    setUI(inChannels(), outChannels(), activate, listen)
                })
                toggleVisible([recordBtn, stopBtn, runBtn])
                recordBtn.addEventListener("click", record)
                stopBtn.addEventListener("click", (): void => {
                    end()
                    container.innerHTML = ""
                })
            }
        )
    } catch (e) {
        console.error("Application Error", e)
    }
})()
