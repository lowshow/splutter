import type { EncodedBuffer, EncodedHandler } from "./encode";
export interface ChannelUploadStore {
    getStreamURLsForChannel: (channel: number) => URL[];
}
export interface OnUploadedData {
    url: URL;
    response?: Response;
    error?: Error;
}
export interface InternalPostUploadHandler {
    handlePostUpload: boolean;
    onUploaded: (data: OnUploadedData[], form: FormData, channel: number) => void;
}
export interface UploaderErrorHandler {
    onWarning: (message: string) => void;
    onFailure: (error: Error) => void;
}
declare enum EncodedBufferState {
    free = 0,
    buffering = 1,
    ready = 2,
    uploading = 3
}
interface UploaderEncodedBuffer extends EncodedBuffer {
    state: EncodedBufferState;
}
export declare class Uploader implements EncodedHandler {
    private streamStore;
    private postUpload;
    private fail;
    private maxBytes;
    buffers: UploaderEncodedBuffer[];
    private state;
    private uploading;
    private interval;
    /**
     * Uploader is used to receive data that has been encoded and upload the data
     * as an opus file to a list of provided URLs. The endpoints are generally from
     * a sludge server and are provided by the library's external context. Uploads
     * are around 1 second in length and the data is passed from an Encoder instance.
     *
     * There are 3 buffers per channel to ensure there are enough buffers to allow
     * for delays in uploading.
     *
     * @param streamStore State related to stream upload URLs associated with a given channel
     * @param postUpload Handler for upload data within app, usually for debugging/testing
     * @param maxBytes Byte size maximum expected for encoded data to be uploaded
     * @param channelIdList List of channel ids available for streaming
     */
    constructor(streamStore: ChannelUploadStore, postUpload: InternalPostUploadHandler, fail: UploaderErrorHandler, maxBytes: number);
    private createBuffer;
    private checkInitState;
    private runUploader;
    /**
     * Upload data must be converted into a blob in order for it to be
     * attached to file to go into a form.
     *
     * We only need a part of the upload data as the full length
     * of the the buffer is an expected maximum length
     */
    private getBlob;
    /**
     * Upload the data, return values after resolution
     *
     * @param url URL for upload endpoint
     * @param form Upload data form
     */
    private post;
    private upload;
    getFreeBufferIndex(channel: number): number;
    onEncoded(index: number): void;
    setChannels(channels: number): void;
    stopUploader(): void;
}
export {};
//# sourceMappingURL=upload.d.ts.map