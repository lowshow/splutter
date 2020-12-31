export declare enum ChannelState {
    connecting = 0,
    connected = 1,
    outputting = 2,
    recording = 3,
    outputtingAndRecording = 4
}
export declare class Channel {
    index: number;
    private onChunk;
    input: BiquadFilterNode;
    output: ScriptProcessorNode;
    private state;
    private emptyBuffer;
    private unmutedStates;
    private recordingStates;
    constructor(index: number, onChunk: (chunk: Float32Array, channelIndex: number) => void, context: AudioContext, bufferSize: number);
    private processChunk;
    unmute(): void;
    mute(): void;
    record(): void;
    stop(): void;
    isMuted(): boolean;
    isRecording(): boolean;
    getState(): ChannelState;
}
//# sourceMappingURL=channel.d.ts.map