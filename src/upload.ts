import { SFn, Fn } from "./interfaces.js"
import { streamingSel } from "./selectors.js"

// TODO: add doc
type UploadFn = Fn<UploadFnArgs, void>
interface UploadFnArgs {
    data: Uint8Array
    channel: number
}

export interface Upload {
    upload: UploadFn
}

// TODO: add doc
export function uploadTo({ getState }: SFn): Upload {
    return {
        upload: ({ channel, data }: UploadFnArgs): void => {
            const formData: FormData = new FormData()

            const file: File = new File(
                [new Blob([data])],
                new Date().toISOString() + ".opus"
            )

            formData.append("audio", file)

            for (const stream of streamingSel(getState())[channel]) {
                fetch(stream, {
                    method: "POST",
                    body: formData
                })
                    .then(
                        (response: Response): Promise<string> => response.text()
                    )
                    .then((result: string): void => {
                        console.log("Success:", result)
                    })
                    .catch((error: Error): void => {
                        console.error("Error:", error)
                    })
            }
        }
    }
}
