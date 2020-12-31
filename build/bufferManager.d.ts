import type { AudioBufferChunkHandler } from "./audio";
import type { SegmentBufferGenerator } from "./segmentBufferGenerator";
export declare class BufferManager implements AudioBufferChunkHandler {
    private buffers;
    constructor();
    setBuffer(buffer: SegmentBufferGenerator, index: number): void;
    bufferExists(index: number): boolean;
    onChunk(chunk: Float32Array, index: number): void;
    stopBuffer(index: number): void;
    stopAll(): void;
    initBuffer(index: number): void;
}
//# sourceMappingURL=bufferManager.d.ts.map