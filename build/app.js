import { main } from "./main.js";
import { getEl } from "./common/utils.js";
import { ui } from "./ui.js";
// TODO: add doc
function toggleVisible(el) {
    el.forEach((i) => {
        i.classList.toggle("visible");
    });
}
// TODO: add doc
;
(async () => {
    try {
        const recordBtn = await getEl({
            selector: "#record"
        });
        const stopBtn = await getEl({
            selector: "#stop"
        });
        const runBtn = await getEl({
            selector: "#run"
        });
        const container = await getEl({
            selector: "#container"
        });
        async function setUI(inChannels, outChannels, activate, listen) {
            const deactivate = [];
            const mute = [];
            await ui(inChannels, outChannels, container, (cIn, cOut, mode) => {
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
        runBtn.addEventListener("click", async () => {
            const { record, end, activate, inChannels, listen, outChannels } = await main(() => {
                setUI(inChannels(), outChannels(), activate, listen);
            });
            toggleVisible([recordBtn, stopBtn, runBtn]);
            recordBtn.addEventListener("click", record);
            stopBtn.addEventListener("click", () => {
                end();
                container.innerHTML = "";
            });
        });
    }
    catch (e) {
        console.error("Application Error", e);
    }
})();
