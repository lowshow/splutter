// TODO: add doc
export function randStr() {
    return Math.random().toString(36).substr(2);
}
// TODO: add doc
export function token() {
    return randStr() + randStr();
}
// TODO: add doc
export function runAll(fns, args) {
    while (fns.length) {
        const fn = fns.pop();
        if (fn)
            fn(args);
    }
}
