import { main, Main } from "./main.js"
import { recorderUI, buttonUI } from "./ui.js"
import { VF, F } from "./common/interfaces.js"
import { getEl, emt } from "./common/dom.js"
import { runAll } from "./common/utils.js"

// TODO: add doc
;(async (): Promise<void> => {
    try {
        const streamAlias: string = window.location.pathname
            .split("/")
            .filter((p: string): boolean => !!p)[1]

        const buttons: HTMLDivElement = await getEl<HTMLDivElement>({
            selector: "#buttons"
        })
        const container: HTMLDivElement = await getEl<HTMLDivElement>({
            selector: "#container"
        })

        const onEnd: VF[] = []

        buttonUI(
            buttons,
            async (): Promise<void> => {
                const {
                    record,
                    end,
                    activate,
                    inChannels,
                    listen,
                    outChannels
                }: Main = await main(streamAlias, (): void => {
                    setUI(inChannels(), outChannels(), activate, listen)
                })
                onEnd.push(end)
                record()
            },
            (): void => {
                runAll(onEnd)
                emt(container)
            }
        )

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

            await recorderUI(
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
    } catch (e) {
        console.error("Application Error", e)
    }
})()
