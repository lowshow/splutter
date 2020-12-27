import { Channel } from "./_channel"

export interface AudioBufferChunkHandler
{
	onChunk: ( chunk: Float32Array, channelIndex: number ) => void
}

enum ConnectionState
{
	notConnected,
	connected,
}

export class Audio
{
	private context: AudioContext

	private source?: MediaStreamAudioSourceNode

	private splitter?: ChannelSplitterNode

	private merger: ChannelMergerNode

	private bufferSize: number

	private channels: Channel[]

	private connections: ConnectionState[][]

	constructor(
		private processor: AudioBufferChunkHandler
	)
	{
		const _AudioContext: typeof AudioContext = window.AudioContext || window.webkitAudioContext
	
		this.context = new _AudioContext()
	
		// Some browsers initially suspend context, but if you
		// resume in other browsers without suspending, you 
		// get an error. This avoids that error.
		this.context.suspend()

		this.setDestinationChannels()

		this.merger = this.context.createChannelMerger( this.context.destination.channelCount )

		this.merger.connect( this.context.destination )

		this.bufferSize = 2048

		this.channels = []

		this.connections = []
	}

	private setDestinationChannels()
	{
		if ( this.context.destination.maxChannelCount > this.context.destination.channelCount )
		{
			this.context.destination.channelCount = this.context.destination.maxChannelCount
		}

		// This (sometimes, it's inconsistent and buggy) ensures each channel
		// is treated as its own and not combined with others
		this.context.destination.channelInterpretation = `discrete`
	}

	private disconnectSplitter()
	{
		if ( !this.splitter || this.channels.length === 0 ) return

		for ( const channel of this.channels )
		{
			this.splitter.disconnect( channel.input )
		}
	}

	public stopRecordChannel( channel: number ): void 
	{
		this.channels[ channel ].stop()
	
		// If we aren't muted, we keep channels connected
		// because they're outputting
		if ( !this.channels[ channel ].isMuted() ) return

		// If we are muted, then we don't need to keep connections
		for ( let o = 0; o < this.connections[ channel ].length; o++ )
		{
			if ( this.connections[ channel ][ o ] === ConnectionState.connected )
			{
				this.channels[ channel ].output.disconnect( this.merger, 0, o )

				this.connections[ channel ][ o ] = ConnectionState.notConnected
			}
		}
	}
	
	// sets recording of channel
	public recordChannel( channel: number ): void
	{
		// we are already recording
		if ( this.channels[ channel ].isRecording() ) return
	
		// output needs a destination
		// check if channel has current output channels
		if ( !this.connections[ channel ].some( output => output === ConnectionState.connected ) )
		{
			this.channels[ channel ].output.connect( this.merger, 0, 0 )
	
			this.connections[ channel ][ 0 ] = ConnectionState.connected
		}
	
		this.channels[ channel ].record()
	}
	
	public muteChannelOnOutput( input: number, output: number ): void 
	{
		/**
		 * If we aren't recording the channel, or if we are and there's more than 1
		 * channel connected, we can safely disconnect the output channel.
		 * 
		 * Otherwise, we need to keep it connected so that the channel can continue
		 * recording (required for some browsers)
		 */
		if ( !this.channels[ input ].isRecording() || 
			this.connections[ input ]
				.filter( v => v === ConnectionState.connected )
				.length > 1 ) 
		{
			this.channels[ input ].output.disconnect( this.merger, 0, output )

			this.connections[ input ][ output ] = ConnectionState.notConnected
		}

		/**
		 * We are now filtering for connected items, this is kind of a weird hack,
		 * if we aren't recording and nothing is connected, we can mute the channel
		 * if we are recording, have 1 connection and that connection is the output channel,
		 * we can also mute because of the above block condition
		 * 
		 * the splice is because we only need to check the single condition once, then
		 * exit early, which is how it is done in a reduce fn
		 */
		if (  this.connections[ input ]
			.filter( v => v === ConnectionState.connected )
			.reduce( ( _, v, __, a ) => 
			{
				const x = ( this.channels[ input ].isRecording() && a.length === 1 && v === output ) || a.length === 0

				a.splice( 1 )

				return x
			}, false ) )
		{
			this.channels[ input ].mute()
		}
	}
	
	// toggles output of channel
	public unmuteChannelOnOutput( input: number, output: number ): void 
	{
		if ( !this.channels[ input ] ) return

		if ( this.connections[ input ][ output ] === ConnectionState.notConnected )
		{
			this.channels[ input ].output.connect( this.merger, 0, output )

			this.connections[ input ][ output ] = ConnectionState.connected
		}

		/**
		 * If the channel was muted and not recording, whatever channels
		 * were connected shouldn't be connected once the channel is unmuted
		 * (not including the selected output channel)
		 */
		if ( this.channels[ input ].isRecording() && this.channels[ input ].isMuted() ) 
		{
			for ( let o = 0; this.connections[ input ].length; o++ )
			{
				if ( o !== output && this.connections[ input ][ o ] === ConnectionState.connected )
				{
					this.channels[ input ].output.disconnect( this.merger, 0, o )

					this.connections[ input ][ o ] = ConnectionState.notConnected
				}
			}
		}
	
		if ( this.channels[ input ].isMuted() ) this.channels[ input ].unmute()
	}

	public sampleRate(): number
	{
		return this.context.sampleRate
	}

	public processorBufferSize(): number
	{
		return this.bufferSize
	}

	public resume(): void
	{
		if ( this.context.state === `suspended` )
		{
			this.context.resume()
		}
	}

	public async handleInputStream( stream: MediaStream ): Promise<Channel[]> 
	{
		this.source = this.context.createMediaStreamSource( stream )

		this.disconnectSplitter()

		this.splitter = this.context.createChannelSplitter( this.source.channelCount )

		this.source.connect( this.splitter )

		for ( let channelIndex = 0; channelIndex < this.source.channelCount; channelIndex++ ) 
		{
			if ( !this.channels[ channelIndex ] )
			{
				this.channels[ channelIndex ] = new Channel(
					channelIndex, 
					this.processor.onChunk, 
					this.context, 
					this.bufferSize )
			}

			this.splitter?.connect( this.channels[ channelIndex ].input, channelIndex, 0 )

			for ( let outputChannel = 0; outputChannel < this.context.destination.channelCount; outputChannel++ )
			{
				if ( this.connections[ channelIndex ] === undefined )
				{
					this.connections[ channelIndex ][ outputChannel ] = ConnectionState.notConnected
				}
			}
		}

		return this.channels
	}
}