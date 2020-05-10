// TODO: add doc
export function uploadTo() {
    return {
        upload: (data) => {
            const formData = new FormData();
            const file = new File([new Blob([data])], new Date().toISOString() + ".opus");
            formData.append("audio", file);
            fetch("/upload", {
                method: "POST",
                body: formData
            })
                .then((response) => response.text())
                .then((result) => {
                console.log("Success:", result);
            })
                .catch((error) => {
                console.error("Error:", error);
            });
        }
    };
}