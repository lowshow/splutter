import { main, Main } from "./main.js"
import { recorderUI, buttonUI, ToggleFnArgs } from "./ui.js"
import type { VF, F, Fn, SFn } from "./interfaces.js"
import { getEl, emt } from "./dom.js"
import { runAll } from "./utils.js"

// TODO: add doc
;( async (): Promise<void> => 
{
	async function setUI( {
		activate,
		inChannels,
		listen,
		outChannels,
		state,
		container
	}: {
        state: SFn
        inChannels: number
        outChannels: number
        activate: (
            channel: number
        ) => {
            deactivate: F<void>
        }
        listen: ( args: {
            inputChannel: number
            outputChannel: number
        } ) => {
            mute: F<void>
        },
        container: HTMLDivElement
    } ): Promise<void> 
	{
		const deactivate: VF[] = []

		const mute: VF[] = []

		await recorderUI( {
			state,
			container,
			inputCount: inChannels,
			outputCount: outChannels,
			onEvent: ( {
				inputChannel,
				mode,
				outputChannel
			}: ToggleFnArgs ): void => 
			{
				if ( outputChannel === -1 ) 
				{
					if ( mode ) 
					{
						deactivate[ inputChannel ] = activate(
							inputChannel
						).deactivate
					}
					else 
					{
						deactivate[ inputChannel ]()
					}
				}
				else 
				{
					if ( mode ) 
					{
						mute[
							outChannels * inputChannel + outputChannel
						] = listen( {
							inputChannel,
							outputChannel
						} ).mute
					}
					else 
					{
						mute[ outChannels * inputChannel + outputChannel ]()
					}
				}
			}
		} )
	}

	try 
	{
		const buttons: HTMLDivElement = await getEl<HTMLDivElement>( {
			selector: `#buttons`
		} )

		const container: HTMLDivElement = await getEl<HTMLDivElement>( {
			selector: `#container`
		} )

		const onEnd: Fn<unknown, unknown>[] = []

		buttonUI( {
			container: buttons,
			onInit: async (): Promise<void> => 
			{
				const {
					record,
					end,
					activate,
					inChannels,
					listen,
					outChannels,
					state
				}: Main = await main( (): void => 
				{
					setUI( {
						state,
						inChannels: inChannels(),
						outChannels: outChannels(),
						activate,
						listen,
						container
					} )
				} )

				onEnd.push( end as Fn<unknown, unknown> )

				record()
			},
			onStop: (): void => 
			{
				runAll( onEnd )

				emt( container )
			}
		} )
	}
	catch ( e ) 
	{
		console.error( `Application Error`, e )
	}
} )()
