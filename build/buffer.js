// TODO: add doc
export function segmentBuffer(sampleRate, bufferSize, onSegment) {
    // 1 second buffer
    const bufferCount = Math.ceil(sampleRate / bufferSize);
    const queue = [];
    // holds buffer remainder
    let hangingBuffer = new Float32Array(0);
    const run = () => {
        const buffer = new Float32Array(sampleRate);
        const useHang = hangingBuffer.length > 0;
        if (queue.length < bufferCount)
            return;
        let index = 0;
        if (useHang) {
            buffer.set(hangingBuffer, 0);
            index += hangingBuffer.length;
            hangingBuffer = new Float32Array(0);
        }
        // then get the number of buffers required
        while (index < buffer.length) {
            const array = queue.shift() || new Float32Array(0);
            if (array.length === 0) {
                return;
            }
            // ensure buffer doesn't overflow (ie put remainer in hanging)
            const remainder = buffer.length - index;
            const useArray = remainder < array.length ? array.subarray(0, remainder) : array;
            buffer.set(useArray, index);
            index += useArray.length;
            if (remainder < array.length) {
                hangingBuffer = array.subarray(remainder);
                break;
            }
        }
        onSegment(buffer);
    };
    let interval = 0;
    let running = false;
    return {
        feed: (data) => {
            queue.push(data);
        },
        stop: () => {
            clearInterval(interval);
            running = false;
        },
        init: () => {
            if (!running) {
                interval = setInterval(run, 1000);
                running = true;
            }
        },
        isRunning: () => running
    };
}
