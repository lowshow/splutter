import { Splutter } from "../build/splutter.js";
class App {
    handlePostUpload;
    splutter;
    urls;
    channels;
    info;
    static init() {
        new App();
    }
    constructor() {
        this.splutter = new Splutter(this);
        this.urls = [];
        this.handleStartCapture = this.handleStartCapture.bind(this);
        this.handleStopCapture = this.handleStopCapture.bind(this);
        const [channels, info] = this.setUI();
        this.channels = channels;
        this.info = info;
        this.handlePostUpload = false;
    }
    existsOrThrow(item, selector) {
        if (!item) {
            throw Error(`No item ${selector}`);
        }
        return item;
    }
    getEl(selector) {
        return this.existsOrThrow(document.querySelector(selector), selector);
    }
    setUI() {
        const captureBtn = this.getEl(`#capture`);
        captureBtn.addEventListener(`click`, () => {
            if (captureBtn.dataset.state === `inactive`) {
                this.handleStartCapture();
                captureBtn.dataset.state = `active`;
                captureBtn.textContent = `Stop Capture`;
            }
            else {
                this.handleStopCapture();
                captureBtn.dataset.state = `inactive`;
                captureBtn.textContent = `Start Capture`;
            }
        });
        const channels = this.getEl(`#channels`);
        const info = this.getEl(`#info`);
        return [channels, info];
    }
    div() {
        return document.createElement(`div`);
    }
    btn() {
        return document.createElement(`button`);
    }
    createRecord(channel) {
        const channelButton = this.btn();
        channelButton.dataset.state = `inactive`;
        channelButton.textContent = `Record ${channel}`;
        channelButton.addEventListener(`click`, () => {
            if (channelButton.dataset.state === `inactive`) {
                this.splutter.recordInputChannel(channel);
                channelButton.dataset.state = `active`;
                channelButton.textContent = `Stop Record ${channel}`;
            }
            else {
                this.splutter.stopRecordInputChannel(channel);
                channelButton.dataset.state = `inactive`;
                channelButton.textContent = `Record ${channel}`;
            }
        });
        return channelButton;
    }
    createOutput(inputChannel, outputChannel) {
        const outputButton = this.btn();
        outputButton.dataset.state = `inactive`;
        outputButton.textContent = `Listen on ${outputChannel}`;
        outputButton.addEventListener(`click`, () => {
            if (outputButton.dataset.state === `inactive`) {
                this.splutter.unmuteOutputChannelForInputInput(inputChannel, outputChannel);
                outputButton.dataset.state = `active`;
                outputButton.textContent = `Mute on ${outputChannel}`;
            }
            else {
                this.splutter.muteOutputChannelForInputChannel(inputChannel, outputChannel);
                outputButton.dataset.state = `inactive`;
                outputButton.textContent = `Listen on ${outputChannel}`;
            }
        });
        return outputButton;
    }
    handleStartCapture() {
        this.splutter.startCapture()
            .then(() => {
            const { id, outputChannels, inputChannels, label } = this.splutter.inputDeviceInformation();
            this.info.textContent = `Device ID: ${id}\nDevice label: ${label}`;
            for (let i = 0; i < inputChannels; i++) {
                const ch = this.div();
                ch.appendChild(this.createRecord(i));
                for (let o = 0; o < outputChannels; o++) {
                    ch.appendChild(this.createOutput(i, o));
                }
                this.urls[i] = [new URL(`/uploadAudio`, window.location.origin)];
                this.channels.appendChild(ch);
            }
        });
    }
    handleStopCapture() {
        this.splutter.stopCapture();
        this.channels.innerHTML = ``;
        this.info.textContent = ``;
    }
    preloadData() {
        // returns data from storage, not implemented
    }
    onWarning(message) {
        console.warn(message);
    }
    getStreamURLsForChannel(channel) {
        return this.urls[channel];
    }
    onUploaded(data, form, channel) {
        // console.log( data, form, channel )
    }
    onFailure(error) {
        throw error;
    }
}
App.init();
