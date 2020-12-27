import { Audio } from "./_audio"
import { BufferManager } from "./_bufferManager"
import type { Channel } from "./_channel"
import { Device, DeviceWarningHandler } from "./_device"
import { Encoder } from "./_encode"
import { SegmentBufferGenerator } from "./_segmentBufferGenerator"
import { ChannelUploadStore, InternalPostUploadHandler, Uploader } from "./_upload"

export interface SplutterContextInterface 
extends 
	DeviceWarningHandler,
	ChannelUploadStore, 
	InternalPostUploadHandler
{
	// enable fetching of existing state
	preloadData: () => void
}

export class Splutter
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

		this.uploader = new Uploader( this.context, this.context, 3000 )

		this.encoder = new Encoder( this.uploader, this.audio.sampleRate() )

		this.createBuffers = this.createBuffers.bind( this )

		this.startCapture = this.startCapture.bind( this )
	}

	private createBuffers( channels: Channel[] )
	{
		for ( const channel of channels )
		{
			// get id for channel from device?

			if ( !this.bufferManager.bufferExists( channel.index ) )
			{
				this.bufferManager.setBuffer(
					new SegmentBufferGenerator(
						this.encoder,
						`${channel.index}`,
						this.audio.sampleRate(),
						this.audio.processorBufferSize()
					),
					channel.index
				)
			}
		}
	}

	public startCapture(): void 
	{
		this.audio.resume()

		const deviceError = this.device.hasError()
	
		if ( deviceError === `` )
		{
			this.device.requestDeviceAccess()
				.then( stream =>
				{
					if ( !stream )
					{
						// TODO: handle error
						this.context.onWarning( `No stream available` )

						return []
					}

					return this.audio.handleInputStream( stream )
				} )
				.then( this.createBuffers )
		}
		else
		{
			// TODO: handle error
			this.context.onWarning( deviceError )
		}
	}
}