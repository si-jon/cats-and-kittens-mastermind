import { MachineConfig, send, Action } from "xstate";


function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}

function listen(): Action<SDSContext, SDSEvent> {
    return send('LISTEN')
}

export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
    initial: 'init',
    states: {
        init: {
            on: {
                CLICK: 'welcome'
            }
        },
        welcome: {
            entry: say("Let's play cats and kittens!"),
            on: {
                ENDSPEECH: "play"
            }
        },
        play: {
            initial: 'prompt',
            states: {
                prompt: {
                    entry: say("Give me four digits!"),
                    on: {
                        ENDSPEECH: "ask"
                    }
                },
                ask: {
                    entry: listen()
                }
            },
            on: {
                ENDSPEECH: "play"
            }
        }
    }
})
