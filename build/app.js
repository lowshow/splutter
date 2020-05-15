import { main } from "./main.js";
import { recorderUI, buttonUI } from "./ui.js";
import { getEl, emt } from "./common/dom.js";
import { runAll } from "./common/utils.js";
(async () => {
    try {
        const buttons = await getEl({
            selector: "#buttons"
        });
        const container = await getEl({
            selector: "#container"
        });
        const onEnd = [];
        buttonUI(buttons, async () => {
            const { record, end, activate, inChannels, listen, outChannels } = await main(() => {
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
            await recorderUI(inChannels, outChannels, container, (cIn, cOut, mode) => {
                if (cOut === -1) {
                    if (mode) {
                        deactivate[cIn] = activate(cIn).deactivate;
                    }
                    else {
                        deactivate[cIn]();
                    }
                }
                else {
                    if (mode) {
                        mute[outChannels * cIn + cOut] = listen(cIn, cOut).mute;
                    }
                    else {
                        mute[outChannels * cIn + cOut]();
                    }
                }
            });
        }
    }
    catch (e) {
        console.error("Application Error", e);
    }
})();
