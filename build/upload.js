import { streamingSel } from "./selectors.js";
// TODO: add doc
export function uploadTo({ getState }) {
    return {
        upload: ({ channel, data }) => {
            const formData = new FormData();
            const file = new File([new Blob([data])], new Date().toISOString() + ".opus");
            formData.append("audio", file);
            for (const stream of streamingSel(getState())[channel]) {
                fetch(stream, {
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
        }
    };
}
