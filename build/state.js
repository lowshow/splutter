export function initState(state) {
    const subscribers = [];
    const deadFn = () => { };
    return {
        getState: () => state,
        updateState: (newState) => {
            const oldState = JSON.parse(JSON.stringify(state));
            Object.assign(state, newState);
            subscribers.forEach((sub) => sub(oldState));
        },
        subscribe: (fn) => {
            subscribers.push(fn);
            const index = subscribers.length;
            return () => {
                subscribers[index] = deadFn;
            };
        }
    };
}
export function onDiff({ current, previous, selector }) {
    return {
        do: (fn) => {
            const curr = selector(current);
            if (JSON.stringify(selector(previous)) !== JSON.stringify(curr))
                fn(curr);
        }
    };
}
