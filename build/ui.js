import { el, mnt, lstn, umnt, emt } from "./dom.js";
import { onDiff } from "./state.js";
import { streamsSel, streamingSel } from "./selectors.js";
// TODO: add doc
function getBox({ appendTo, id, labelText, onChange }) {
    const box = el("div", { attr: { className: "item__box" } });
    mnt(appendTo)(box);
    const check = el("input", {
        attr: { type: "checkbox", className: "item__check", id }
    });
    lstn(check)
        .on("change")
        .do(() => {
        onChange(check.checked);
    });
    const title = el("label", {
        attr: { textContent: labelText, className: "item__label", htmlFor: id }
    });
    mnt(box)([check, title]);
}
function optionsGen({ streams, streamsInUse, channel }) {
    return streams.reduce((arr, stream) => {
        const attr = Object.entries(streamsInUse).reduce((obj, [c, s]) => {
            if (c === `${channel}`) {
                s.forEach((cs) => {
                    if (cs === stream) {
                        obj.selected = true;
                    }
                });
            }
            else {
                s.forEach((cs) => {
                    if (cs === stream) {
                        obj.disabled = true;
                    }
                });
            }
            return obj;
        }, { disabled: false, selected: false });
        arr.push(el("option", {
            attr: Object.assign({ value: stream, textContent: stream }, attr)
        }));
        return arr;
    }, []);
}
// TODO: add doc
export async function recorderUI({ container, inputCount, onEvent, outputCount, state: { getState, subscribe, updateState } }) {
    // row per input
    // make titles labels, emit events on label clicks with details, call arg fn
    for (let i = 0; i < inputCount; i++) {
        const select = el("select", {
            attr: { multiple: true }
        });
        const mntSel = mnt(select);
        lstn(select)
            .on("change")
            .do(() => {
            var _a;
            const selected = [];
            for (let sel = 0; sel < select.selectedOptions.length; sel++) {
                const option = (_a = select.selectedOptions.item(sel)) === null || _a === void 0 ? void 0 : _a.value;
                if (option)
                    selected.push(option);
            }
            updateState({
                streamsInUse: Object.assign(Object.assign({}, streamingSel(getState())), { [i]: selected })
            });
        });
        const state = getState();
        mntSel(optionsGen({
            streams: streamsSel(state),
            streamsInUse: streamingSel(state),
            channel: i
        }));
        subscribe((previous) => {
            const current = getState();
            onDiff({
                current,
                previous,
                selector: streamsSel
            }).do((streams) => {
                emt(select);
                mntSel(optionsGen({
                    streams,
                    streamsInUse: streamingSel(current),
                    channel: i
                }));
            });
            onDiff({
                current,
                previous,
                selector: streamingSel
            }).do((streamsInUse) => {
                emt(select);
                mntSel(optionsGen({
                    streams: streamsSel(current),
                    streamsInUse,
                    channel: i
                }));
            });
        });
        const inputWrap = el("div", {
            attr: { className: "item__wrap item__red" }
        });
        const outputWrap = el("div", {
            attr: { className: "item__wrap item__grey" }
        });
        mnt(container)(mnt(el("div", { attr: { className: "item__row" } }))([
            select,
            inputWrap,
            outputWrap
        ]));
        getBox({
            appendTo: inputWrap,
            id: `i${i}`,
            labelText: `Upload input channel ${i + 1}`,
            onChange: (mode) => {
                onEvent({ inputChannel: i, mode, outputChannel: -1 });
            }
        });
        for (let o = 0; o < outputCount; o++) {
            getBox({
                appendTo: outputWrap,
                id: `o${o}i${i}`,
                labelText: `Send to output channel ${o + 1}`,
                onChange: (mode) => {
                    onEvent({ inputChannel: i, mode, outputChannel: o });
                }
            });
        }
    }
}
// TODO: add doc
export function buttonUI({ container, onInit, onStop }) {
    const initBtn = el("button", {
        attr: { textContent: "Activate inputs" }
    });
    const push = mnt(container);
    push(initBtn);
    lstn(initBtn)
        .on("click")
        .do(() => {
        onInit();
        umnt(initBtn);
        push(stopBtn);
    });
    const stopBtn = el("button", {
        attr: { textContent: "Deactivate" }
    });
    lstn(stopBtn)
        .on("click")
        .do(() => {
        onStop();
        umnt(stopBtn);
        push(initBtn);
    });
}
