import { Resolve, Reject, ValueOf, Fn } from "./interfaces.js"

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

            const l: T | null = document.querySelector<T>(selector)
            if (l) return resolve(l)
        })
    })
}

type PropObj<T> = { [property in keyof T]: ValueOf<T> }
type SetAttrObj<T> = (attributes: Partial<PropObj<T>>) => T
interface ElOptions<T> {
    onMount?: Fn<void, void>
    attr?: Partial<PropObj<T>>
}
type El<T extends keyof HTMLElementTagNameMap> = HTMLElementTagNameMap[T]
// TODO: add doc
export function el<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    options?: ElOptions<El<K>>
): El<K> {
    const element: El<K> = document.createElement(tagName)
    if (options) {
        const { onMount, attr }: ElOptions<El<K>> = options
        if (onMount) Object.assign(element, { onMount })
        if (attr) atr(element).obj(attr)
    }
    return element
}

type SetAttr<T> = (property: keyof T) => SetAttrAs<T>
type SetAttrAs<T> = (value: ValueOf<T>) => T
type SetAttrMap<T> = (attributeMap: [keyof T, ValueOf<T>][]) => T
type AtrReturn<T> = { prop: SetAttr<T>; map: SetAttrMap<T>; obj: SetAttrObj<T> }
export function atr<T extends HTMLElement>(element: T): AtrReturn<T> {
    return {
        map: (attributeMap: [keyof T, ValueOf<T>][]): T => {
            attributeMap.forEach(([p, v]: [keyof T, ValueOf<T>]): void => {
                element[p] = v
            })
            return element
        },
        prop: (property: keyof T): SetAttrAs<T> => (value: ValueOf<T>): T => {
            element[property] = value
            return element
        },
        obj: (attributes: Partial<PropObj<T>>): T => {
            ;(Object.entries(attributes) as [keyof T, ValueOf<T>][]).forEach(
                ([p, v]: [keyof T, ValueOf<T>]): void => {
                    element[p] = v
                }
            )
            return element
        }
    }
}

export type MntFn<T extends HTMLElement> = (
    children: HTMLElement | HTMLElement[],
    options?: { prepend?: boolean }
) => T

interface Mountable extends HTMLElement {
    onMount: Fn<void, void>
}

function isMountable(element: HTMLElement): element is Mountable {
    return typeof (element as Mountable).onMount === "function"
}

// TODO: add doc
export function mnt<T extends HTMLElement>(parent: T): MntFn<T> {
    return (
        children: HTMLElement | HTMLElement[],
        options: { prepend?: boolean } = {
            prepend: false
        }
    ): T => {
        const c: HTMLElement[] = Array.isArray(children) ? children : [children]
        c.forEach((child: HTMLElement): void => {
            if (options.prepend) {
                parent.prepend(child)
            } else {
                parent.append(child)
            }
            if (isMountable(child)) {
                child.onMount()
            }
        })
        return parent
    }
}

// TODO: add doc
type ListenFn = <K extends keyof HTMLElementEventMap>(
    ev: HTMLElementEventMap[K]
) => void

// TODO: add doc
interface ListenAction {
    do: (fn: ListenFn) => void
}

// TODO: add doc
interface Listen {
    on: <K extends keyof HTMLElementEventMap>(type: K) => ListenAction
}

// TODO: add doc
export function lstn<T extends HTMLElement>(element: T): Listen {
    const fns: ListenFn[] = []
    return {
        on: <K extends keyof HTMLElementEventMap>(type: K): ListenAction => {
            element.addEventListener(
                type,
                (e: HTMLElementEventMap[K]): void => {
                    fns.forEach((f: ListenFn): void => {
                        f(e)
                    })
                }
            )
            return {
                do: (fn: ListenFn): void => {
                    fns.push(fn)
                }
            }
        }
    }
}

// TODO: add doc
export function umnt(element: HTMLElement): void {
    element.remove()
}

// TODO: add doc
export function emt(element: HTMLElement): void {
    element.innerHTML = ""
}

// TODO: add doc
export function cls<T extends HTMLElement>(
    element: T
): (className: string | string[]) => T {
    return (className: string | string[]): T => {
        if (Array.isArray(className)) {
            className.forEach((c: string): void => {
                element.classList.toggle(c)
            })
        } else {
            element.classList.toggle(className)
        }
        return element
    }
}
