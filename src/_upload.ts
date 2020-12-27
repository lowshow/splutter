import type { EncodedBuffer, EncodedHandler } from "./_encode"

export interface ChannelUploadStore
{
	getStreamURLsForChannel: ( channelId: string ) => URL[]
}

export interface OnUploadedData
{
	url: URL
	response?: Response
	error?: Error
}

export interface InternalPostUploadHandler
{
	handlePostUpload: boolean
	onUploaded: ( data: OnUploadedData[], form: FormData ) => void
}

enum EncodedBufferState
{
	free,
	buffering,
	ready,
	uploading
}

interface UploaderEncodedBuffer extends EncodedBuffer
{
	state: EncodedBufferState
}

enum UploaderState
{
	running,
	active,
	uploading,
	idle
}

export class Uploader implements EncodedHandler
{
	// List of buffers for use, and state related to the buffer
	public buffers: UploaderEncodedBuffer[]

	// Uploader state to keep upload loop manageable
	private state: UploaderState

	// Index of buffer being uploaded
	private uploading: number

	// Loop interval reference to be cancelled when nothing to upload
	private interval: number

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
	constructor(
		private streamStore: ChannelUploadStore,
		private postUpload: InternalPostUploadHandler,
		private maxBytes: number
	)
	{
		this.buffers = []

		this.state = UploaderState.idle

		this.uploading = -1

		this.interval = 0

		this.runUploader = this.runUploader.bind( this )
	}

	private createBuffer( channelId: string ): UploaderEncodedBuffer
	{
		const buffer = new Uint8Array( this.maxBytes )

		return {
			buffer,
			state: EncodedBufferState.free,
			channelId,
			length: 0
		}
	}

	private runUploader()
	{
		if ( this.state !== UploaderState.active ) return

		this.state = UploaderState.uploading

		this.uploading = this.buffers.findIndex( ( { state } ) => state === EncodedBufferState.ready )

		// there's no buffer to upload, so set to idle and kill upload loop
		if ( this.uploading === -1 )
		{
			this.state = UploaderState.idle

			window.clearInterval( this.interval )
		}
		// otherwise, upload the selected buffer 
		else
		{
			this.state = UploaderState.uploading

			this.upload()
		}
	}

	/**
	 * Upload data must be converted into a blob in order for it to be
	 * attached to file to go into a form.
	 * 
	 * We only need a part of the upload data as the full length
	 * of the the buffer is an expected maximum length
	 */
	private getBlob()
	{
		return new Blob( [ this.buffers[ this.uploading ].buffer.subarray(
			0, 
			this.buffers[ this.uploading ].length ) ] ) 
	}

	/**
	 * Upload the data, return values after resolution
	 * 
	 * @param url URL for upload endpoint
	 * @param form Upload data form
	 */
	private post( url: URL, form: FormData )
	{
		return new Promise<OnUploadedData>( resolve =>
		{
			fetch( url.toString(), {
				method: `POST`,
				body: form
			} )
				.then( ( response: Response ) =>
				{
					resolve( { response, url } )
				} )
				.catch( ( error: Error )  => 
				{
					resolve( { error, url } )
				} )
		} )
	}

	private upload()
	{
		const form: FormData = new FormData()

		const file: File = new File( [ this.getBlob() ], new Date().toISOString() + `.opus` )

		form.append( `audio`, file )

		// The buffer is no longer being used as it's copied now
		// to the uploadable file object
		this.buffers[ this.uploading ].state = EncodedBufferState.free

		Promise.all(
			this.streamStore.getStreamURLsForChannel( this.buffers[ this.uploading ].channelId )
				.map( stream => this.post( stream, form ) ) )
			.then( result =>
			{
				// We can continue with the next loop
				this.state = UploaderState.active

				// We don't need to call if we aren't handling data internally
				if ( this.postUpload.handlePostUpload )
				{
					this.postUpload.onUploaded( result, form )
				}
			} )
	}

	public getFreeBufferIndex( channelId: string ): number
	{
		const i = this.buffers.findIndex( ( { state } ) => state === EncodedBufferState.free )

		this.buffers[ i ].state = EncodedBufferState.buffering

		this.buffers[ i ].channelId = channelId

		this.buffers[ i ].length = 0

		return i
	}

	public onEncoded( index: number ): void
	{
		this.buffers[ index ].state = EncodedBufferState.ready

		if ( this.state === UploaderState.idle )
		{
			this.state = UploaderState.active

			this.interval = window.setInterval( this.runUploader, 50 )
			
			this.runUploader()
		}
	}

	public setChannels( channelIdList: string[] ): void
	{
		this.buffers.length = 0
		
		for ( const channelId of channelIdList )
		{
			this.buffers.push( 
				this.createBuffer( channelId ), 
				this.createBuffer( channelId ),
				this.createBuffer( channelId ) )
		}
	}
}