function validateStreams(streams) {
    return streams.map((stream) => new URL(stream).toString());
}
function getStreamsStore() {
    try {
        const streams = localStorage.getItem("streams");
        if (!streams)
            return [];
        return validateStreams(JSON.parse(streams));
    }
    catch (_a) {
        return [];
    }
}
export function loadStorage({ state: { updateState } }) {
    updateState({ streams: getStreamsStore() });
    window.addEventListener("storage", () => {
        updateState({ streams: getStreamsStore() });
    });
}
