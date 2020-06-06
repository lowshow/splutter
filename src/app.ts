import { main, Main } from "./main.js"
import { recorderUI, buttonUI, ToggleFnArgs } from "./ui.js"
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
            listen: (args: {
                inputChannel: number
                outputChannel: number
            }) => {
                mute: F<void>
            }
        ): Promise<void> {
            const deactivate: VF[] = []
            const mute: VF[] = []

            await recorderUI(
                inChannels,
                outChannels,
                container,
                ({ inputChannel, mode, outputChannel }: ToggleFnArgs): void => {
                    if (outputChannel === -1) {
                        if (mode) {
                            deactivate[inputChannel] = activate(
                                inputChannel
                            ).deactivate
                        } else {
                            deactivate[inputChannel]()
                        }
                    } else {
                        if (mode) {
                            mute[
                                outChannels * inputChannel + outputChannel
                            ] = listen({
                                inputChannel,
                                outputChannel
                            }).mute
                        } else {
                            mute[outChannels * inputChannel + outputChannel]()
                        }
                    }
                }
            )
        }
    } catch (e) {
        console.error("Application Error", e)
    }
})()
