// TODO: add doc
export function randStr(): string {
    return Math.random().toString(36).substr(2)
}

// TODO: add doc
export function token(): string {
    return randStr() + randStr()
}

// TODO: add doc
export function runAll<K, A, T extends (args?: A) => K>(
    fns: T[],
    args?: A
): void {
    while (fns.length) {
        const fn: T | undefined = fns.pop()
        if (fn) fn(args)
    }
}
