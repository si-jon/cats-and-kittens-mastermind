import { MachineConfig, send, Action, assign } from "xstate";
import { dmMastermindMachine } from "./dmMastermind";

function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}

function listen(): Action<SDSContext, SDSEvent> {
    return send('LISTEN')
}

const sendQuery: Action<SDSContext, SDSEvent> = send((context: SDSContext) => ({
    type: "QUERY", value: context.recResult
}))

export const dmMainMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
    id: 'main',
    initial: 'init',
    states: {
        init: {
            on: {
                CLICK: 'welcome'
            }
        },
	    welcome: {
	        on: {
	    	    RECOGNISED: {
	    	        actions: sendQuery,
	    	        target: 'wait',
                }
            },
            initial: 'prompt',
            states: {
                prompt: {
                    entry: say("Welcome to cats and kittens!"),
                    on: { ENDSPEECH: 'ask' }
                },
                ask: {
                    entry: listen(),
                },
            },
	    },
        wait: {
            on: {
                RESPONSE: [
                    {
                        cond: (context, event) => event.value === "play_game",
                        target: 'dmMastermind'
                    },
                    {
                        cond: (context, event) => event.value === "quit",
                        target: 'quit'
                    },
                    {
                        cond: (context, event) => event.value === "how_to_play",
                        target: 'howToPlay'
                    },
                    { target: 'nomatch' }
                ],
                RESPONSE_ERROR: {
                    target: 'error'
                }
            }
        },
        error: {
            entry: say("Oh no, an error!"),
            on: { ENDSPEECH: 'init' }
        },
        nomatch: {
            entry: say("Sorry, I don't know how to do this."),
            on: { ENDSPEECH: 'init' }
        },
        quit: {
            type: 'final',
        },
        howToPlay: {
            entry: say("Soon to be implemented!"),
            on: {
                ENDSPEECH: 'welcome'
            }
        },
        dmMastermind: {
            ...dmMastermindMachine,
            onDone: {
                target: 'init' 
            }
        },
    },
})