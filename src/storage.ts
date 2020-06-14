import { Maybe, SFn } from "./interfaces.js"

function validateStreams(streams: Maybe<string[]>): string[] {
    return (streams as string[]).map((stream: string): string =>
        new URL(stream).toString()
    )
}

function getStreamsStore(): string[] {
    try {
        const streams: string | null = localStorage.getItem("streams")
        if (!streams) return []
        return validateStreams(JSON.parse(streams))
    } catch {
        return []
    }
}

export function loadStorage({ state: { updateState } }: { state: SFn }): void {
    updateState({ streams: getStreamsStore() })
    window.addEventListener("storage", (): void => {
        updateState({ streams: getStreamsStore() })
    })
}
