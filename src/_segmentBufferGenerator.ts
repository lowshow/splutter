export interface SegmentBuffer
{
	buffer: Float32Array
	channelId: string
}

export interface SegmentHandler
{
	buffers: SegmentBuffer[]
	getFreeBufferIndex: ( channelId: string ) => number
	onSegment: ( index: number ) => void
}

enum BufferingState
{
	inactive,
	standby,
	buffering,
	error
}

export class SegmentBufferGenerator
{
	// aka queue minimum
	// number of script processor node feeds
	// to create at least a full segment buffer
	private subBufferCount: number

	// Holder for sub-buffers.
	// This is about 10 seconds worth of sub-buffers, as its
	// unlikely we'll get this far behind
	private queue: Float32Array[]

	// Number to set total sub-buffers available in queue
	private queueCount: number

	// reusable position marker for indicating item in queue
	// to use when in segment generator
	private queueIndex: number

	// interval for storing loop reference
	// perhaps this should alternatively come from
	// a higher interval loop to reduce number of
	// total app loops, and perhaps fn should
	// run in some other thread/ async due to blocking loop
	private interval: number

	// State representing whether segment buffer is running or not
	private state: BufferingState

	// Reference for acting upon the assigned segment buffer
	private bufferRef: number

	// aka hanging buffer
	// hang will always be less than the segment buffer	
	private hang: Float32Array

	// We only need as much as what we inserted, but
	// hang buffer will always be longer than this,
	// so we use this value as a reference to set
	// the segment buffer insertion index after we
	// add any overhang
	private hangLength: number

	// reusable position marker for indicating item in queue
	// to use when in segment generator
	private bufferIndex: number

	/**
	 * SegmentBufferGenerator builds types arrays of 1 second size relative
	 * to the sample rate (samples per second) of the audio context.
	 * This array (the buffer) is created from a queue of smaller 
	 * arrays fed from the calling context's script processor node,
	 * which has a limited size (around 2048).
	 * 
	 * There is 1 instance of SegmentBufferGenerator per device channel,
	 * and 1 script processor node for each channel feeding this instance.
	 * However, there is only one SegmentHandler instance shared between
	 * each generator instance.
	 * 
	 * **NOTE**
	 * As the script processor node is deprecated, this system may need
	 * to be updated to use the recommended "audio worklet" in future.
	 * 
	 * @param segmentHandler Receiver for buffer segments
	 * @param channelId State reference for channel related data
	 * @param sampleRate Audio Context sample rate
	 * @param bufferSize Size of buffer in script processer node
	 */
	constructor(
		private segmentHandler: SegmentHandler,
		private channelId: string,
		sampleRate: number,
		bufferSize: number,
	)
	{
		this.subBufferCount = Math.ceil( sampleRate / bufferSize )

		this.queue = Array( this.subBufferCount * 10 ).fill( new Float32Array( bufferSize ) )
		
		this.interval = 0

		this.state = BufferingState.inactive

		this.bufferRef = -1

		this.hang = new Float32Array( 0 )

		this.hangLength = 0

		this.bufferIndex = 0

		this.queueCount = 0

		this.queueIndex = 0
	}

	/**
	 * It is assumed that this will complete in less than a second
	 * otherwise we might have race conditions.
	 */
	private generateSegment()
	{
		/**
		 * Shouldn't run if:
		 * - Already running (BufferingState not standby)
		 * - The queue doesn't have enough items to fill a full segment
		 */
		if ( 
			this.state !== BufferingState.standby ||
			this.queueCount < this.subBufferCount
		) return

		this.state = BufferingState.buffering

		// initial position for buffer insertion
		this.bufferIndex = 0

		this.bufferRef = this.segmentHandler.getFreeBufferIndex( this.channelId )

		/**
		 * Set current buffer initially to use any left over 
		 * data from previous buffer generation
		 * 
		 * this will likely always be less than a full buffer
		 */
		if ( this.hangLength > 0 ) 
		{
			// Although we set the whole buffer to hang, the hanglength
			// being used to set the buffer index ensures only what is
			// relevant is actually used
			this.segmentHandler.buffers[ this.bufferRef ].buffer.set( this.hang, 0 )

			// Index in current buffer now at end of hang length
			this.bufferIndex = this.hangLength

			// set hang to empty for re-use
			this.hangLength = 0
		}

		for ( ; this.queueIndex < this.queueCount; this.queueIndex += 1 )
		{
			// If our index is past the buffer end, we don't process any more
			if ( this.bufferIndex >= this.segmentHandler.buffers[ this.bufferRef ].buffer.length ) break

			// ensure buffer doesn't overflow (ie put remainer in hanging)
			const remainder: number = this.segmentHandler.buffers[ this.bufferRef ].buffer.length - this.bufferIndex

			const hanging: boolean = remainder < this.queue[ this.queueIndex ].length

			// check if we have any excess data, and either get the amount we need or the whole array
			const addToBuffer: Float32Array = hanging 
				? this.queue[ this.queueIndex ].subarray( 0, remainder ) 
				: this.queue[ this.queueIndex ]

			// Add whatever the data is to the buffer at the current index
			this.segmentHandler.buffers[ this.bufferRef ].buffer.set( addToBuffer, this.bufferIndex )

			// Increase buffer index to the end of our added data length
			this.bufferIndex += addToBuffer.length

			// check we had any hanging data
			if ( hanging ) 
			{
				// set hanging buffer to remainder of the sub-buffer we used
				this.hang.set( this.queue[ this.queueIndex ].subarray( remainder ), 0 )

				// hang actual length is the length of the current queue item less 
				// the remainder size we already used in the buffer
				this.hangLength = this.queue[ this.queueIndex ].length - remainder
			}
		}

		// If at a position in the queue beyond the length, reset both values
		if ( this.queueIndex >= this.queueCount )
		{
			this.queueIndex = 0

			this.queueCount = 0
		}

		// Something may have changed state while in loop
		if ( this.state !== BufferingState.buffering ) return

		this.state = BufferingState.standby

		this.segmentHandler.onSegment( this.bufferRef )
	}

	/**
	 * Send audio samples to queue from a script processor node
	 * 
	 * @param data Array of audio samples
	 */
	public feed( data: Float32Array ): void 
	{
		this.queue[ this.queueCount ].set( data )

		this.queueCount += 1
	}

	/**
	 * Deactivat and reset state
	 */
	public stop(): void 
	{
		window.clearInterval( this.interval )

		this.state = BufferingState.inactive

		this.queueCount = 0

		this.queueIndex = 0

		this.hangLength = 0
	}

	/**
	 * Begin segment genereation, throws error if already active
	 */
	public init(): void
	{
		if ( this.state !== BufferingState.inactive )
		{
			this.state = BufferingState.error

			throw Error( `Initing segment buffer while not inactive` )
		}

		this.state = BufferingState.standby

		this.interval = window.setInterval( this.generateSegment, 1000 )
	}
}