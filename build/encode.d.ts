import type { SegmentBuffer, SegmentHandler } from "./segmentBufferGenerator";
export interface EncodedBuffer {
    buffer: Uint8Array;
    length: number;
    channel: number;
}
export interface EncodedHandler {
    buffers: EncodedBuffer[];
    getFreeBufferIndex: (channel: number) => number;
    onEncoded: (index: number) => void;
}
export interface EncoderErrorHandler {
    onWarning: (message: string | Error | ErrorEvent) => void;
    onFailure: (error: Error) => void;
}
declare enum SegmentBufferState {
    free = 0,
    buffering = 1,
    ready = 2,
    encoding = 3
}
/**
 * SegmentBuffer is extended to add external state:
 * - array is used for posting data to the Worker
 * - encodedRef is the index of the encoded data buffer
 * - state represents the state of the buffer
 */
interface EncoderSegmentBuffer extends SegmentBuffer {
    array: [Float32Array];
    encodedRef: number;
    state: SegmentBufferState;
}
export declare class Encoder implements SegmentHandler {
    private encodedHandler;
    private fail;
    private sampleRate;
    private encodeWorker;
    private interval;
    private state;
    private encoding;
    buffers: EncoderSegmentBuffer[];
    /**
     * Encoder instance receives segments via it's extension of the
     * SegmentHandler interface. Segments of 1 second of PCM audio data
     * is send to a worker that is used to encode the segment buffer into
     * opus format. When a segment is encoded it is passed to an instance
     * of EncodedHandler.
     *
     * There are 3 buffers per channel, such that there are enough buffers
     * for encoding and handling to be completed.
     *
     * @param encodedHandler Instance for handling the encoded data
     * @param sampleRate Audio context sample rate
     * @param channelIdList Audio input device channel ids
     */
    constructor(encodedHandler: EncodedHandler, fail: EncoderErrorHandler, sampleRate: number);
    private createBuffer;
    private initWorker;
    /**
     * This function is called when the worker posts a message. If the message is,
     * - "done":
     * 	it will complete the encoded data appending and call the encoded hanlder to update state
     * 	it will also update state to allow the buffer to be freed and return to active state
     * - "page"
     * 	it has received a page of encoded data to add to the encoded handler buffer
     * @param event Event/message/data sent from worker
     */
    private onEncoderMessage;
    private onEncoderError;
    private checkInitState;
    private runEncoder;
    private encode;
    getFreeBufferIndex(channel: number): number;
    onSegment(index: number): void;
    setChannels(channels: number): void;
    stopEncoder(): void;
}
export {};
//# sourceMappingURL=encode.d.ts.map