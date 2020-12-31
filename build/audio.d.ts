export interface AudioBufferChunkHandler {
    onChunk: (chunk: Float32Array, channelIndex: number) => void;
}
export declare class Audio {
    private processor;
    private context;
    private source?;
    private splitter?;
    private merger;
    private bufferSize;
    private channels;
    private connections;
    constructor(processor: AudioBufferChunkHandler);
    private setDestinationChannels;
    private disconnectSplitter;
    stopRecordChannel(channel: number): void;
    recordChannel(channel: number): void;
    muteOutputForInput(input: number, output: number): void;
    unmuteOutputForInput(input: number, output: number): void;
    sampleRate(): number;
    processorBufferSize(): number;
    resume(): void;
    handleInputStream(stream: MediaStream): Promise<number>;
    stopAll(): void;
    inputChannelCount(): number;
    outputChannelCount(): number;
    recordingChannelCount(): number;
}
//# sourceMappingURL=audio.d.ts.map