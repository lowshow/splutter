// TODO: add doc
export function randStr() {
    return Math.random().toString(36).substr(2);
}
// TODO: add doc
export function token() {
    return randStr() + randStr();
}
// TODO: add doc
export function getEl({ selector, timeout = 1000 }) {
    return new Promise((resolve, reject) => {
        const base = performance.now();
        requestAnimationFrame((time) => {
            if (time - base >= timeout)
                return reject();
            const el = document.querySelector(selector);
            if (el)
                return resolve(el);
        });
    });
}
