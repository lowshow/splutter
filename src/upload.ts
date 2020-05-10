// TODO: add doc
export interface Upload {
    upload: (data: Uint8Array) => void
}

// TODO: add doc
export function uploadTo(): Upload {
    return {
        upload: (data: Uint8Array): void => {
            const formData: FormData = new FormData()

            const file: File = new File(
                [new Blob([data])],
                new Date().toISOString() + ".opus"
            )

            formData.append("audio", file)

            fetch("/upload", {
                method: "POST",
                body: formData
            })
                .then((response: Response): Promise<string> => response.text())
                .then((result: string): void => {
                    console.log("Success:", result)
                })
                .catch((error: Error): void => {
                    console.error("Error:", error)
                })
        }
    }
}
