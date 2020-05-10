import { Resolve, Reject } from "./interfaces"

// TODO: add doc
export function randStr(): string {
    return Math.random().toString(36).substr(2)
}

// TODO: add doc
export function token(): string {
    return randStr() + randStr()
}

// TODO: add doc
export function getEl<T extends HTMLElement>({
    selector,
    timeout = 1000
}: {
    selector: string
    timeout?: number
}): Promise<T> {
    return new Promise((resolve: Resolve<T>, reject: Reject): void => {
        const base: number = performance.now()
        requestAnimationFrame((time: number): void => {
            if (time - base >= timeout) return reject()

            const el: T | null = document.querySelector<T>(selector)
            if (el) return resolve(el)
        })
    })
}