import { Audio } from "./audio"
import { BufferManager } from "./bufferManager"
import { Device, DeviceWarningHandler, DeviceError } from "./device"
import { Encoder, EncoderErrorHandler } from "./encode"
import { SegmentBufferGenerator, SegmentBufferGeneratorErrorHandler } from "./segmentBufferGenerator"
import { ChannelUploadStore, InternalPostUploadHandler, Uploader, UploaderErrorHandler } from "./upload"

export type { OnUploadedData } from './upload'

export interface SplutterContextInterface 
extends 
	DeviceWarningHandler,
	ChannelUploadStore, 
	InternalPostUploadHandler,
	EncoderErrorHandler,
	UploaderErrorHandler
{
	onWarning: ( message: string | Error | ErrorEvent ) => void

	onFailure: ( error: Error ) => void
}

export interface DeviceInformation
{
	id: string
	label: string
	inputChannels: number
	outputChannels: number
}

export class Splutter
implements
	SegmentBufferGeneratorErrorHandler
{
	private device: Device

	private audio: Audio

	private encoder: Encoder

	private uploader: Uploader

	private bufferManager: BufferManager

	/**
	 * 
	 * @param context Interface to the context importing this lib
	 */
	constructor(
		private context: SplutterContextInterface
	)
	{
		this.device = new Device( this.context )

		this.bufferManager = new BufferManager()

		this.audio = new Audio( this.bufferManager )

		this.uploader = new Uploader( this.context, this.context, this.context, 3000 )

		this.encoder = new Encoder( this.uploader, this.context, this.audio.sampleRate() )

		this.createBuffers = this.createBuffers.bind( this )

		this.startCapture = this.startCapture.bind( this )

		this.stopCapture = this.stopCapture.bind( this )

		this.inputDeviceInformation = this.inputDeviceInformation.bind( this )
	}

	private createBuffers( channels: number )
	{
		for ( let i = 0; i < channels; i++ )
		{
			// get id for channel from device?

			if ( !this.bufferManager.bufferExists( i ) )
			{
				this.bufferManager.setBuffer(
					new SegmentBufferGenerator(
						this.encoder,
						this,
						i,
						this.audio.sampleRate(),
						this.audio.processorBufferSize()
					),
					i
				)
			}
		}

		this.encoder.setChannels( channels )

		this.uploader.setChannels( channels )
	}

	public async startCapture(): Promise<void> 
	{
		this.audio.resume()

		switch ( this.device.hasError() )
		{
			case DeviceError.stopped:

				this.device.tryReload()

				break

			case DeviceError.noError:

				break

			default:

				this.context.onWarning( this.device.hasError() )

				return
		}

		return this.device.requestDeviceAccess()
			.then( stream =>
			{
				if ( !stream )
				{
					// TODO: handle error
					this.context.onWarning( `No stream available` )

					return 0
				}

				return this.audio.handleInputStream( stream )
			} )
			.then( this.createBuffers )
	}

	public stopCapture(): void
	{
		this.audio.stopAll()

		this.bufferManager.stopAll()

		this.device.stop()
	}

	public muteOutputChannelForInputChannel( input: number, output: number ): void
	{
		this.audio.muteOutputForInput( input, output )
	}

	public unmuteOutputChannelForInputChannel( input: number, output: number ): void
	{
		this.audio.unmuteOutputForInput( input, output )
	}

	public recordInputChannel( input: number ): void
	{
		try 
		{
			this.bufferManager.initBuffer( input )

			this.audio.recordChannel( input )
		}
		catch ( e )
		{
			this.stopRecordInputChannel( input )

			this.context.onWarning( e )
		}
	}

	public stopRecordInputChannel( input: number ): void
	{
		this.bufferManager.stopBuffer( input )

		this.audio.stopRecordChannel( input )

		if ( this.audio.recordingChannelCount() === 0 )
		{
			this.encoder.stopEncoder()

			this.uploader.stopUploader()
		}
	}

	public inputDeviceInformation(): DeviceInformation
	{
		return {
			id: this.device.id(),
			label: this.device.label(),
			inputChannels: this.audio.inputChannelCount(),
			outputChannels: this.audio.outputChannelCount()
		}
	}
	
	public onWarning( message: string ): void
	{
		this.context.onWarning( message )
	}
	
	public onFailure( error: Error ): void
	{
		this.context.onFailure( error )

		this.audio.stopAll()

		this.bufferManager.stopAll()

		if ( this.audio.recordingChannelCount() === 0 )
		{
			this.encoder.stopEncoder()

			this.uploader.stopUploader()
		}
	}
}