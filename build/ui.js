import { el } from "./common/utils.js";
function getBox(appendTo, labelText, id, onChange) {
    const box = el("div");
    box.classList.add("item__box");
    appendTo.appendChild(box);
    const title = el("label");
    title.textContent = labelText;
    title.classList.add("item__label");
    title.htmlFor = id;
    box.appendChild(title);
    const check = el("input");
    check.type = "checkbox";
    check.classList.add("item__check");
    check.id = id;
    title.appendChild(check);
    check.addEventListener("change", () => {
        onChange(check.checked);
    });
}
export async function ui(inputCount, outputCount, container, onEvent) {
    // row per input
    // make titles labels, emit events on label clicks with details, call arg fn
    for (let i = 0; i < inputCount; i++) {
        const row = el("div");
        row.classList.add("item__row");
        container.appendChild(row);
        const left = el("div");
        left.classList.add("item__left");
        const right = el("div");
        right.classList.add("item__right");
        row.appendChild(left);
        row.appendChild(right);
        getBox(left, `Input ${i + 1}`, `i${i}`, (mode) => {
            onEvent(i, -1, mode);
        });
        for (let o = 0; o < outputCount; o++) {
            getBox(right, `Output ${o + 1}`, `o${o}i${i}`, (mode) => {
                onEvent(i, o, mode);
            });
        }
    }
}
