import { VF, F } from "./common/interfaces"

// TODO: add doc
export interface Buffer {
    feed: (data: Float32Array) => void
    stop: VF
    init: VF
    isRunning: F<boolean>
}

// TODO: add doc
export function segmentBuffer(
    sampleRate: number,
    bufferSize: number,
    onSegment: (buffer: Float32Array) => void
): Buffer {
    // 1 second buffer
    const bufferCount: number = Math.ceil(sampleRate / bufferSize)
    const queue: Float32Array[] = []
    // holds buffer remainder
    let hangingBuffer: Float32Array = new Float32Array(0)

    const run = (): void => {
        const buffer: Float32Array = new Float32Array(sampleRate)
        const useHang: boolean = hangingBuffer.length > 0
        if (queue.length < bufferCount) return

        let index: number = 0

        if (useHang) {
            buffer.set(hangingBuffer, 0)
            index += hangingBuffer.length
            hangingBuffer = new Float32Array(0)
        }

        // then get the number of buffers required
        while (index < buffer.length) {
            const array: Float32Array = queue.shift() || new Float32Array(0)

            if (array.length === 0) {
                return
            }

            // ensure buffer doesn't overflow (ie put remainer in hanging)
            const remainder: number = buffer.length - index
            const useArray: Float32Array =
                remainder < array.length ? array.subarray(0, remainder) : array
            buffer.set(useArray, index)
            index += useArray.length
            if (remainder < array.length) {
                hangingBuffer = array.subarray(remainder)
                break
            }
        }

        onSegment(buffer)
    }

    let interval: number = 0
    let running: boolean = false

    return {
        feed: (data: Float32Array): void => {
            queue.push(data)
        },
        stop: (): void => {
            clearInterval(interval)
            running = false
        },
        init: (): void => {
            if (!running) {
                interval = setInterval(run, 1000)
                running = true
            }
        },
        isRunning: (): boolean => running
    }
}
