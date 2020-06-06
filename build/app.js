import { main } from "./main.js";
import { recorderUI, buttonUI } from "./ui.js";
import { getEl, emt } from "./common/dom.js";
import { runAll } from "./common/utils.js";
(async () => {
    try {
        const streamAlias = window.location.pathname
            .split("/")
            .filter((p) => !!p)[1];
        const buttons = await getEl({
            selector: "#buttons"
        });
        const container = await getEl({
            selector: "#container"
        });
        const onEnd = [];
        buttonUI(buttons, async () => {
            const { record, end, activate, inChannels, listen, outChannels } = await main(streamAlias, () => {
                setUI(inChannels(), outChannels(), activate, listen);
            });
            onEnd.push(end);
            record();
        }, () => {
            runAll(onEnd);
            emt(container);
        });
        async function setUI(inChannels, outChannels, activate, listen) {
            const deactivate = [];
            const mute = [];
            await recorderUI(inChannels, outChannels, container, ({ inputChannel, mode, outputChannel }) => {
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
            });
        }
    }
    catch (e) {
        console.error("Application Error", e);
    }
})();
