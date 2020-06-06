import { el, mnt, lstn, umnt } from "./common/dom.js";
// TODO: add doc
function getBox(appendTo, labelText, id, onChange) {
    const box = el("div");
    box.classList.add("item__box");
    mnt(appendTo)(box);
    const check = el("input");
    check.type = "checkbox";
    check.classList.add("item__check");
    check.id = id;
    mnt(box)(check);
    check.addEventListener("change", () => {
        onChange(check.checked);
    });
    const title = el("label");
    title.textContent = labelText;
    title.classList.add("item__label");
    title.htmlFor = id;
    mnt(box)(title);
}
// TODO: add doc
export async function recorderUI(inputCount, outputCount, container, onEvent) {
    // row per input
    // make titles labels, emit events on label clicks with details, call arg fn
    for (let i = 0; i < inputCount; i++) {
        const row = el("div");
        row.classList.add("item__row");
        mnt(container)(row);
        const left = el("div");
        left.classList.add("item__left");
        const right = el("div");
        right.classList.add("item__right");
        mnt(row)([left, right]);
        getBox(left, `Upload input channel ${i + 1}`, `i${i}`, (mode) => {
            onEvent({ inputChannel: i, mode, outputChannel: -1 });
        });
        for (let o = 0; o < outputCount; o++) {
            getBox(right, `Send to output channel ${o + 1}`, `o${o}i${i}`, (mode) => {
                onEvent({ inputChannel: i, mode, outputChannel: o });
            });
        }
    }
}
// TODO: add doc
export function buttonUI(container, onInit, onStop) {
    const initBtn = el("button");
    initBtn.textContent = "Start stream";
    const push = mnt(container);
    push(initBtn);
    const stopBtn = el("button");
    stopBtn.textContent = "Stop stream";
    lstn(initBtn)
        .on("click")
        .do(() => {
        onInit();
        umnt(initBtn);
        push(stopBtn);
    });
    lstn(stopBtn)
        .on("click")
        .do(() => {
        onStop();
        umnt(stopBtn);
        push(initBtn);
    });
}
