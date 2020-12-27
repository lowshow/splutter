import type { AudioBufferChunkHandler } from "./_audio"
import type { SegmentBufferGenerator } from "./_segmentBufferGenerator"



export class BufferManager
implements 
	AudioBufferChunkHandler
{
	private buffers: SegmentBufferGenerator[]
	
	constructor()
	{
		this.buffers = []
	}

	public setBuffer( buffer: SegmentBufferGenerator, index: number ): void
	{
		this.buffers[ index ] = buffer
	}

	public bufferExists( index: number ): boolean
	{
		return this.buffers[ index ] !== undefined
	}

	public onChunk( chunk: Float32Array, channelIndex: number ): void
	{
		this.buffers[ channelIndex ]?.feed( chunk )
	}
}