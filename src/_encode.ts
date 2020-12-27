import type { SegmentBuffer, SegmentHandler } from "./_segmentBufferGenerator"

export interface EncodedBuffer
{
	buffer: Uint8Array
	length: number
	channelId: string
}

export interface EncodedHandler
{
	buffers: EncodedBuffer[]
	getFreeBufferIndex: ( channelId: string ) => number
	onEncoded: ( index: number ) => void
}

enum SegmentBufferState
{
	free,
	buffering,
	ready,
	encoding
}

/**
 * SegmentBuffer is extended to add external state:
 * - array is used for posting data to the Worker
 * - encodedRef is the index of the encoded data buffer
 * - state represents the state of the buffer
 */
interface EncoderSegmentBuffer extends SegmentBuffer
{
	array: [Float32Array]
	encodedRef: number
	state: SegmentBufferState
}

enum EncoderState
{
	running,
	encoding,
	idle,
	active
}

export class Encoder implements SegmentHandler
{
	// Worker for encoding raw audio to opus
	private encodeWorker: Worker

	// Interval reference for audio encoding loop
	private interval: number

	// Current encoding state of this instance
	private state: EncoderState

	// Reference to currenct encoding buffer index
	private encoding: number

	// List of buffers for use, and state related to the buffer
	public buffers: EncoderSegmentBuffer[]

	/**
	 * Encoder instance receives segments via it's extension of the
	 * SegmentHandler interface. Segments of 1 second of PCM audio data
	 * is send to a worker that is used to encode the segment buffer into
	 * opus format. When a segment is encoded it is passed to an instance
	 * of EncodedHandler.
	 * 
	 * There are 3 buffers per channel, such that there are enough buffers
	 * for encoding and handling to be completed.
	 * 
	 * @param encodedHandler Instance for handling the encoded data
	 * @param sampleRate Audio context sample rate
	 * @param channelIdList Audio input device channel ids
	 */
	constructor(
		private encodedHandler: EncodedHandler,
		private sampleRate: number
	)
	{
		this.encodeWorker = new Worker( `vendor/encoderWorker.min.js` )

		this.buffers = []

		this.interval = 0

		this.state = EncoderState.idle

		this.encoding = -1

		this.onEncoderMessage = this.onEncoderMessage.bind( this )

		this.runEncoder = this.runEncoder.bind( this )

		this.initWorker()
	}

	private createBuffer( channelId: string ): EncoderSegmentBuffer
	{
		const buffer = new Float32Array( this.sampleRate )

		return {
			buffer,
			state: SegmentBufferState.free,
			array: [ buffer ],
			encodedRef: -1,
			channelId
		}
	}

	private initWorker()
	{
		this.encodeWorker.postMessage( 
			{
				command: `init`,
				// minimum sample rate for good audio
				encoderSampleRate: 12000,
				originalSampleRate: this.sampleRate,
				// the higher the less overhead
				maxFramesPerPage: 480,
				// music optimisation
				encoderApplication: 2049,
				encoderFrameSize: 20,
				// faster
				encoderComplexity: 0,
				// faster
				resampleQuality: 0,
				// lowest bitrate for decent audio
				bitRate: 12000,
				reuseWorker: true
			} )

		
	
		this.encodeWorker.onmessage = this.onEncoderMessage
	}

	/**
	 * This function is called when the worker posts a message. If the message is,
	 * - "done":
	 * 	it will complete the encoded data appending and call the encoded hanlder to update state
	 * 	it will also update state to allow the buffer to be freed and return to active state
	 * - "page"
	 * 	it has received a page of encoded data to add to the encoded handler buffer
	 * @param event Event/message/data sent from worker
	 */
	private onEncoderMessage( event: MessageEvent )
	{
		if ( event.data.message === `done` ) 
		{
			this.encodedHandler.onEncoded( this.buffers[ this.encoding ].encodedRef )

			this.buffers[ this.encoding ].state = SegmentBufferState.free

			this.state = EncoderState.active
		}
		else if ( event.data.message === `page` ) 
		{
			this.encodedHandler.buffers[ this.buffers[ this.encoding ].encodedRef ].buffer.set(
				event.data.page,
				this.encodedHandler.buffers[ this.buffers[ this.encoding ].encodedRef ].length )
		}
	}

	private runEncoder()
	{
		if ( this.state !== EncoderState.active ) return

		this.state = EncoderState.running

		this.encoding = this.buffers.findIndex( ( { state } ) => state === SegmentBufferState.ready )

		// there's no buffer to encode, so set to idle and kill encoding loop
		if ( this.encoding === -1 )
		{
			this.state = EncoderState.idle

			window.clearInterval( this.interval )
		}
		// otherwise, encode the selected buffer 
		else
		{
			this.state = EncoderState.encoding

			this.encode()
		}
	}

	private encode()
	{
		this.buffers[ this.encoding ].encodedRef = this.encodedHandler.getFreeBufferIndex( 
			this.buffers[ this.encoding ].channelId )

		this.encodeWorker.postMessage( {
			command: `getHeaderPages`
		} )

		// its not clear why we need to send data into the encoder in chunks
		// if we need to chunk, why not make it 128 bytes per chunk?
		this.encodeWorker.postMessage( {
			command: `encode`,
			// each buffer array index relates to channel, we only want mono channels
			buffers: this.buffers[ this.encoding ].array
		} )

		this.encodeWorker.postMessage( {
			command: `done`
		} )
	}

	public getFreeBufferIndex( channelId: string ): number
	{
		const i = this.buffers.findIndex( ( { state } ) => state === SegmentBufferState.free )

		this.buffers[ i ].state = SegmentBufferState.buffering

		this.buffers[ i ].channelId = channelId

		return i
	}

	public onSegment( index: number ): void
	{
		this.buffers[ index ].state = SegmentBufferState.ready

		if ( this.state === EncoderState.idle )
		{
			this.state = EncoderState.active

			this.interval = window.setInterval( this.runEncoder, 100 )
			
			this.runEncoder()
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