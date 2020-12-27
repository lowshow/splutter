export interface DeviceWarningHandler
{
	onWarning: ( message: string ) => void
}

enum DeviceState
{
	init,
	requesting,
	error,
	granted
}

enum DeviceError
{
	noDevices = `No media devices`,
	notGranted = `Access not granted`,
	stopped = `Device has stopped`,
	unknown = `Unknown error`,
	noError = `No error`
}

/**
 * TODO: check device change event
 */
export class Device
{
	private error: string

	private errorType: DeviceError

	private state: DeviceState

	private mediaTracks: MediaStreamTrack[]

	constructor(
		private warn: DeviceWarningHandler
	)
	{
		this.state = DeviceState.init

		this.error = ``

		this.errorType = DeviceError.noError

		this.checkDevices()

		this.mediaTracks = []
	}

	/**
	 * This is an extracted part of the public stop fn in
	 * case an internal stop mechanism is created
	 */
	private _stop()
	{
		for ( const track of this.mediaTracks ) 
		{
			track.stop()
		}

		this.state = DeviceState.error

		this.errorType = DeviceError.stopped
	}

	public checkDevices(): void
	{
		if ( !navigator.mediaDevices ) 
		{
			this.state = DeviceState.error

			this.error = `No media device API available.`

			this.errorType = DeviceError.noDevices
		}
	}

	public hasError(): string
	{
		return this.state === DeviceState.error
			? this.errorType
			: ``
	}

	public getErrorMessage(): string
	{
		return this.error
	}

	public tryReload(): void
	{
		this.state = DeviceState.init

		this.checkDevices()
	}

	public stop(): void
	{
		this._stop()

		this.error = `Device was stopped by the user`
	}

	public async requestDeviceAccess(): Promise<MediaStream | void>
	{
		switch( this.state )
		{
			// Correct state to continue
			case DeviceState.init:
				break

			// Method already called, exiting
			case DeviceState.requesting:

				return

			// Method already succeeded and granted access to device
			case DeviceState.granted:
				this.warn.onWarning( `Device already accessed. Stop device if you want to request again.` )

				return

			// Instance as errored
			case DeviceState.error:
				this.warn.onWarning( `Device has error. Check error and reload before proceeding.` )

				return
		}

		this.state = DeviceState.requesting

		return navigator.mediaDevices
			.getUserMedia( {
				audio: {
					autoGainControl: false,
					echoCancellation: false,
					noiseSuppression: false
				},
				video: false
			} )
			.then( stream =>
			{
				this.state = DeviceState.granted

				for ( const track of stream.getAudioTracks() )
				{
					this.mediaTracks.push( track )
				}
				
				return stream
			} )
			.catch( ( err: Error ) => 
			{
				this.state = DeviceState.error

				this.error = err.message

				this.errorType = DeviceError.notGranted
			} )
	}
}