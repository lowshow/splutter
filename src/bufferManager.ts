import type { AudioBufferChunkHandler } from "./audio"
import type { SegmentBufferGenerator } from "./segmentBufferGenerator"



export class BufferManager
implements 
	AudioBufferChunkHandler
{
	private buffers: SegmentBufferGenerator[]
	
	constructor()
	{
		this.buffers = []

		this.onChunk = this.onChunk.bind( this )
	}

	public setBuffer( buffer: SegmentBufferGenerator, index: number ): void
	{
		this.buffers[ index ] = buffer
	}

	public bufferExists( index: number ): boolean
	{
		return this.buffers[ index ] !== undefined
	}

	public onChunk( chunk: Float32Array, index: number ): void
	{
		this.buffers[ index ].feed( chunk )
	}

	public stopBuffer( index: number ): void
	{
		this.buffers[ index ].stop()
	}

	public stopAll(): void
	{
		for ( const buffer of this.buffers )
		{
			buffer.stop()
		}
	}

	public initBuffer( index: number ): void
	{
		this.buffers[ index ].init()
	}
}