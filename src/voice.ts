import { send, Action } from "xstate";

export function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: 'SPEAK', value: text }))
}

export function listen(): Action<SDSContext, SDSEvent> {
    return send('LISTEN')
}