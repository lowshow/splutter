export interface SegmentBuffer {
    buffer: Float32Array;
    channel: number;
}
export interface SegmentHandler {
    buffers: SegmentBuffer[];
    getFreeBufferIndex: (channel: number) => number;
    onSegment: (index: number) => void;
}
export interface SegmentBufferGeneratorErrorHandler {
    onWarning: (message: string) => void;
    onFailure: (error: Error) => void;
}
export declare class SegmentBufferGenerator {
    private segmentHandler;
    private fail;
    private channel;
    private subBufferCount;
    private queue;
    private queueProcessedState;
    private queueCount;
    private queueIndex;
    private queueCursor;
    private interval;
    private state;
    private bufferRef;
    private hang;
    private hangLength;
    private bufferIndex;
    /**
     * SegmentBufferGenerator builds types arrays of 1 second size relative
     * to the sample rate (samples per second) of the audio context.
     * This array (the buffer) is created from a queue of smaller
     * arrays fed from the calling context's script processor node,
     * which has a limited size (around 2048).
     *
     * There is 1 instance of SegmentBufferGenerator per device channel,
     * and 1 script processor node for each channel feeding this instance.
     * However, there is only one SegmentHandler instance shared between
     * each generator instance.
     *
     * **NOTE**
     * As the script processor node is deprecated, this system may need
     * to be updated to use the recommended "audio worklet" in future.
     *
     * @param segmentHandler Receiver for buffer segments
     * @param fail Handler for errors and warnings
     * @param channel State reference for channel related data
     * @param sampleRate Audio Context sample rate
     * @param bufferSize Size of buffer in script processer node
     */
    constructor(segmentHandler: SegmentHandler, fail: SegmentBufferGeneratorErrorHandler, channel: number, sampleRate: number, bufferSize: number);
    /**
     * It is assumed that this will complete in less than a second
     * otherwise we might have race conditions.
     */
    private generateSegment;
    /**
     * Send audio samples to queue from a script processor node
     *
     * @param data Array of audio samples
     */
    feed(data: Float32Array): void;
    /**
     * Deactivat and reset state
     */
    stop(): void;
    /**
     * Begin segment generation, throws error if already active
     */
    init(): void;
}
//# sourceMappingURL=segmentBufferGenerator.d.ts.map