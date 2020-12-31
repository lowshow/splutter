import { Splutter, SplutterContextInterface, OnUploadedData } from "../build/splutter.js"

class App implements SplutterContextInterface
{
	public handlePostUpload: boolean

	private splutter: Splutter

	private urls: URL[][]

	private channels: HTMLDivElement

	private info: HTMLPreElement

	public static init()
	{
		new App()
	}

	constructor()
	{
		this.splutter = new Splutter( this )

		this.urls = []

		this.handleStartCapture = this.handleStartCapture.bind( this )

		this.handleStopCapture = this.handleStopCapture.bind( this )

		const [ channels, info ] = this.setUI()

		this.channels = channels

		this.info = info

		this.handlePostUpload = false
	}

	private existsOrThrow<T>( item: unknown, selector: string )
	{
		if ( !item )
		{
			throw Error( `No item ${selector}` )
		}

		return item as T
	}

	private getEl<T extends HTMLElement>( selector: string ): T
	{
		return this.existsOrThrow( document.querySelector( selector ), selector )
	}

	private setUI(): [HTMLDivElement, HTMLPreElement]
	{
		const captureBtn = this.getEl<HTMLButtonElement>( `#capture` )

		captureBtn.addEventListener( `click`, () =>
		{
			if ( captureBtn.dataset.state === `inactive` )
			{
				this.handleStartCapture()

				captureBtn.dataset.state = `active`

				captureBtn.textContent = `Stop Capture`
			}
			else
			{
				this.handleStopCapture()

				captureBtn.dataset.state = `inactive`

				captureBtn.textContent = `Start Capture`
			}
		} )

		const channels = this.getEl<HTMLDivElement>( `#channels` )

		const info = this.getEl<HTMLPreElement>( `#info` )

		return [ channels, info ]
	}

	private div(): HTMLDivElement
	{
		return document.createElement( `div` )
	}

	private btn(): HTMLButtonElement
	{
		return document.createElement( `button` )
	}

	private createRecord( channel: number )
	{
		const channelButton = this.btn()

		channelButton.dataset.state = `inactive`

		channelButton.textContent = `Record ${channel}`

		channelButton.addEventListener( `click`, () =>
		{
			if ( channelButton.dataset.state === `inactive` )
			{
				this.splutter.recordInputChannel( channel )

				channelButton.dataset.state = `active`

				channelButton.textContent = `Stop Record ${channel}`
			}
			else
			{
				this.splutter.stopRecordInputChannel( channel )

				channelButton.dataset.state = `inactive`

				channelButton.textContent = `Record ${channel}`
			}
		} )

		return channelButton
	}

	private createOutput( inputChannel: number, outputChannel: number )
	{
		const outputButton = this.btn()

		outputButton.dataset.state = `inactive`

		outputButton.textContent = `Listen on ${outputChannel}`

		outputButton.addEventListener( `click`, () =>
		{
			if ( outputButton.dataset.state === `inactive` )
			{
				this.splutter.unmuteOutputChannelForInputInput( inputChannel, outputChannel )

				outputButton.dataset.state = `active`

				outputButton.textContent = `Mute on ${outputChannel}`
			}
			else
			{
				this.splutter.muteOutputChannelForInputChannel( inputChannel, outputChannel )

				outputButton.dataset.state = `inactive`

				outputButton.textContent = `Listen on ${outputChannel}`
			}
		} )

		return outputButton
	}

	private handleStartCapture()
	{
		this.splutter.startCapture()
			.then( () =>
			{
				const { id, outputChannels, inputChannels, label } = this.splutter.inputDeviceInformation()

				this.info.textContent = `Device ID: ${id}\nDevice label: ${label}`

				for ( let i = 0; i < inputChannels; i++ )
				{
					const ch = this.div()

					ch.appendChild( this.createRecord( i ) )

					for ( let o = 0; o < outputChannels; o++ )
					{
						ch.appendChild( this.createOutput( i, o ) )
					}

					this.urls[ i ] = [ new URL( `/uploadAudio`, window.location.origin ) ]

					this.channels.appendChild( ch )
				}
			} )
	}

	private handleStopCapture()
	{
		this.splutter.stopCapture()

		this.channels.innerHTML = ``

		this.info.textContent = ``
	}

	public preloadData(): void
	{
		// returns data from storage, not implemented
	}

	public onWarning( message: string | Error | ErrorEvent ): void
	{
		console.warn( message )
	}

	public getStreamURLsForChannel( channel: number ): URL[]
	{
		return this.urls[ channel ]
	}

	public onUploaded( data: OnUploadedData[], form: FormData, channel: number ): void
	{
		// console.log( data, form, channel )
	}

	public onFailure( error: Error ): void
	{
		throw error
	}
}

App.init()