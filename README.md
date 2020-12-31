# splutter

Record audio in compressed segments and stream them to a [sludge server](https://github.com/gaxge/sludge).

## Demo

To view the example:
- Ensure you have the latest version of nodejs installed
- Clone this repository
- In the root of the project, run: `npm i`
- Run the example app server: `npm run example:serve`
- Open the browser and go to [http://localhost:5557](http://localhost:5557)
- **Note** don't output to your computer speakers with your computer's microphone active, you'll get feedback.

## What does it do?

Gets audio from the audio input in the browser, and makes it bandwidth friendly to be streamed to another computer for listening.

## What problem does this solve?

### General

Common streaming involves a complex and somewhat hack-y system of send chunks of encoded audio to an "icecast" server, which uses a protocol that keeps a connection open to the listening client for a really long time. To do this from the browser isn't ideal, browsers and normal http usage doesn't so much work so well (as it wasn't design to) have extremely long requests. This problem as been addressed with modern live streaming systems that encode the data into discrete files, which are then decoded and "buffered" to be played seamlessly.

This package implements one component of this modern technique for audio in the browser. It segments the recorded raw audio, then encodes each segment as a separate file and sends it to a server for distribution and decoding. This also means you can distribute your audio via a much more bandwidth, cost and cache friendly CDN service. The main difference from common modern live streaming is the lack of adaptive bit rate, which is unnecessary due to the highly compressed, tiny file size.

### Non-general

[gaxge](https://github.com/gaxge) uses this component to receive audio from participants in the audio jamming platform. Keeping the process in the browser makes it easily accessible to people who can't or don't want to set up any additional software outside of the web application. It's difficult to set up a home server, and many live streaming tools don't really think too much about bandwidth, so hopefully this increases ease of use and decreases cost for the participant.

## How does it do this?

The Web Audio API is given access to the user's audio input, such as a microphone, which sends it to a Script Processor Node (soon, Audio Worklet Node). The chunks of raw audio data buffer are collected into 1 second chunks and encoded using the opus encoding format and ogg container format. As audio encoding is computationally intensive, the bulk of this process occurs in a Web Worker (soon, Audio Worklet) and the encoder is implemented using WASM. 

When a segment is encoded, it is send to a provided URL, that is provided to the library by the context importing library. Generally, this endpoint should know how to appropriately handle these segments, see the [sludge server](https://github.com/gaxge/sludge). To listen to the audio stream, a decoding and playback tool can be used, see the [syllid library](https://github.com/gaxge/syllid). Audio can also be monitored during recording by requesting for the audio to be unmuted on a given output audio channel.

## How to use it?

After setting up your project using NPM, install this library:

```shell
npm install --save splutter
```

You will also need to set up your app/server/bundler to allow access to the worker script. The file is:

```shell
node_modules/splutter/build/encoder/encoderWorker.min.js
```

It should be on the same path as this code, so if you're loading `https://example.com/app.bundle.js` as your bundle including this library, you'll want to have the file available at `https://example.com/encoder/encoderWorker.min.js` as well.

**NOTE** How this file is accessed will likely vary based on the environment and tools you are using, so if you are unsure, there is likely an answer if you search for it. Otherwise, post the question as an issue so it can be addressed.

You can then use it in your project by importing it:

```ts
import { Splutter } from "splutter"
```

To use the Splutter class in your project, implement a class to interface with it (example using Typescript):

```ts
import { SplutterContextInterface, OnUploadedData } from "splutter"

class SomeInterfaceClass implements SplutterContextInterface
{
	// Indicates whether this context wants to handle data passed to the `onUploaded` method
	public handlePostUpload: boolean

	// Receive a warning from the underlying system, not catastrophic so this is mostly helpful
	// for development and bug-catching purposes. Message is related to the warning event.
	public onWarning(message: string | Error | ErrorEvent): void

	// Catastrophic failure occurred, most of the time this will be called when something
	// went wrong with the buffers/recording/encoding, and should've triggered the
	// recording and uploading to stop. Error is related to the failure event.
	public onFailure(error: Error): void

	// When a channel starts recording, it will request a list of upload URLs, this
	// method is required to pass that data to the library.
	public getStreamURLsForChannel(channel: number): URL[]
	
	// If the handlePostUpload flag is true, the library will call this method every time
	// a new segment is uploaded (not per endpoint, just per file). This can be used
	// for UI or development purposes.
	public onUploaded(data: OnUploadedData[], form: FormData, channel: number): void
}
```

The Splutter class also exposes an API to allow your app to control the library (example using Typescript):

```ts
// On user interaction, such as clicking an "enable audio recording" button, call this function
// to enable a prompt to get user permissions for audio input. Without these permissions,
// the library can't record audio.
startCapture(): Promise<void>

// This deactivates the underlying audio input stream, so the input device is no longer
// displayed as "active" to the user. You will need to call startCapture() again.
stopCapture(): void

// Stop sending audio from an input device channel to an output device channel.
muteOutputChannelForInputChannel( input: number, output: number ): void

// Send audio from an input device channel to an output device channel for monitoring.
// Requires startCapture() to have been called.
unmuteOutputChannelForInputChannel( input: number, output: number ): void

// Start recording an input channel. Requires startCapture() to have been called.
// Your interface class should also return an array of URLs for the channel number
// via the getStreamURLsForChannel(channel: number) method.
recordInputChannel( input: number ): void

// Stop recording an input channel.
stopRecordInputChannel( input: number ): void

// Get information about the audio device, useful for displaying to the user.
// Requires startCapture() to have been called.
inputDeviceInformation(): DeviceInformation

/**
 * export interface DeviceInformation
 * {
 * 	id: string
 * 	label: string
 * 	inputChannels: number
 * 	outputChannels: number
 * }
 * /
```

### How to handle the encoded files?

[sludge server](https://github.com/gaxge/sludge): To handle the files as they are uploaded to a server, such that other people can download and listen to them.

[syllid library](https://github.com/gaxge/syllid): To download the files from sludge, decode and listen to them.


## What are the upcoming features or known issues?

This information is managed in the [issues](https://github.com/gaxge/splutter/issues) section of this repository. You are encouraged to submit tickets here if you have any problems or questions related to this project.

## How to contribute?

There's no official guidelines for contributing at the moment. Feel free to create a pull request for any changes you would like to make and we can discuss it. If your code is merged you'll receive a mention on this README.

### Prior art

- The people behind the [opus codec](https://opus-codec.org/).
- opus-recorder by [Chris Rudmin](https://github.com/chris-rudmin/opus-recorder).

## What's the license?

See the [license](https://github.com/gaxge/splutter/blob/master/LICENSE.md) file.