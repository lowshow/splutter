export interface DeviceWarningHandler {
    onWarning: (message: string) => void;
}
export declare enum DeviceError {
    noDevices = "No media devices",
    notGranted = "Access not granted",
    stopped = "Device has stopped",
    noTracks = "There are no media tracks",
    unknown = "Unknown error",
    noError = ""
}
/**
 * TODO: check device change event
 */
export declare class Device {
    private warn;
    private error;
    private errorType;
    private state;
    private mediaTrack?;
    private deviceId;
    private deviceLabel;
    constructor(warn: DeviceWarningHandler);
    /**
     * This is an extracted part of the public stop fn in
     * case an internal stop mechanism is created
     */
    private _stop;
    checkDevices(): void;
    hasError(): string;
    getErrorMessage(): string;
    tryReload(): void;
    stop(): void;
    requestDeviceAccess(): Promise<MediaStream | void>;
    label(): string;
    id(): string;
}
//# sourceMappingURL=device.d.ts.map