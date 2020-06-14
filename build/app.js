import { main } from "./main.js";
import { recorderUI, buttonUI } from "./ui.js";
import { getEl, emt } from "./dom.js";
import { runAll } from "./utils.js";
(async () => {
    try {
        const buttons = await getEl({
            selector: "#buttons"
        });
        const container = await getEl({
            selector: "#container"
        });
        const onEnd = [];
        buttonUI({
            container: buttons,
            onInit: async () => {
                const { record, end, activate, inChannels, listen, outChannels, state } = await main(() => {
                    setUI({
                        state,
                        inChannels: inChannels(),
                        outChannels: outChannels(),
                        activate,
                        listen
                    });
                });
                onEnd.push(end);
                record();
            },
            onStop: () => {
                runAll(onEnd);
                emt(container);
            }
        });
        async function setUI({ activate, inChannels, listen, outChannels, state }) {
            const deactivate = [];
            const mute = [];
            await recorderUI({
                state,
                container,
                inputCount: inChannels,
                outputCount: outChannels,
                onEvent: ({ inputChannel, mode, outputChannel }) => {
                    if (outputChannel === -1) {
                        if (mode) {
                            deactivate[inputChannel] = activate(inputChannel).deactivate;
                        }
                        else {
                            deactivate[inputChannel]();
                        }
                    }
                    else {
                        if (mode) {
                            mute[outChannels * inputChannel + outputChannel] = listen({
                                inputChannel,
                                outputChannel
                            }).mute;
                        }
                        else {
                            mute[outChannels * inputChannel + outputChannel]();
                        }
                    }
                }
            });
        }
    }
    catch (e) {
        console.error("Application Error", e);
    }
})();
