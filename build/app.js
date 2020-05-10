import { main } from "./main.js";
import { getEl } from "./common/utils.js";
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
        runBtn.addEventListener("click", () => {
            const { record, end } = main();
            toggleVisible([recordBtn, stopBtn, runBtn]);
            recordBtn.addEventListener("click", record);
            stopBtn.addEventListener("click", end);
        });
    }
    catch (e) {
        console.error("Application Error", e);
    }
})();
