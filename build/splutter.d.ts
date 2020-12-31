import { DeviceWarningHandler } from "./device";
import { EncoderErrorHandler } from "./encode";
import { SegmentBufferGeneratorErrorHandler } from "./segmentBufferGenerator";
import { ChannelUploadStore, InternalPostUploadHandler, UploaderErrorHandler } from "./upload";
export type { OnUploadedData } from './upload';
export interface SplutterContextInterface extends DeviceWarningHandler, ChannelUploadStore, InternalPostUploadHandler, EncoderErrorHandler, UploaderErrorHandler {
    onWarning: (message: string | Error | ErrorEvent) => void;
    onFailure: (error: Error) => void;
}
export interface DeviceInformation {
    id: string;
    label: string;
    inputChannels: number;
    outputChannels: number;
}
export declare class Splutter implements SegmentBufferGeneratorErrorHandler {
    private context;
    private device;
    private audio;
    private encoder;
    private uploader;
    private bufferManager;
    /**
     *
     * @param context Interface to the context importing this lib
     */
    constructor(context: SplutterContextInterface);
    private createBuffers;
    startCapture(): Promise<void>;
    stopCapture(): void;
    muteOutputChannelForInputChannel(input: number, output: number): void;
    unmuteOutputChannelForInputChannel(input: number, output: number): void;
    recordInputChannel(input: number): void;
    stopRecordInputChannel(input: number): void;
    inputDeviceInformation(): DeviceInformation;
    onWarning(message: string): void;
    onFailure(error: Error): void;
}
//# sourceMappingURL=splutter.d.ts.map