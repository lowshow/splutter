export function initState(state) {
    return {
        getState: () => state,
        updateState: (newState) => {
            state = Object.assign(Object.assign({}, state), newState);
        }
    };
}
