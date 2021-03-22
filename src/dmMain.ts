import { MachineConfig, send, Action, assign } from "xstate";
import { dmMastermindMachine } from "./dmMastermind";
import { dmHowToPlayMachine } from "./dmHowToPlay";
import { reprompt, startRepromptTimer, cancelRepromptTimer, resetRepromptCount } from "./dmReprompt";
import { say, listen} from "./voice";

const sendQuery: Action<SDSContext, SDSEvent> = send((context: SDSContext) => ({
    type: "QUERY", value: context.recResult
}))

const yes_no_grammar: { [index: string]: {} } = {
    "yes": true,
    "you bet": true,
    "yeah": true,
    "no": false,
    "no way": false,
    "nope": false,
}

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
            initial: 'prompt',
            states: {
                prompt: {
                    entry: say("Welcome to cats and kittens!"),
                    on: { ENDSPEECH: '#intro' },
                },
            }
        },
	    intro: {
            id: 'intro',
            initial: 'prompt',
            states: {
                prompt: {
                    entry: say("Let's play! Or I can give you some options on what to do!"),
                    on: { ENDSPEECH: 'ask' },
                    exit: startRepromptTimer
                },
                ask: {
                    entry: listen(),
                    exit: cancelRepromptTimer
                },
                reprompt: {
                    ...reprompt("I can give you some options on what to do, if you need to!", '#intro.ask'),
                    onDone: '#done'
                },
                nomatch: {
                    entry: say("Sorry, I don't know how to do this."),
                    on: { ENDSPEECH: 'prompt' }
                },
                pending: {
                    id: 'pending',
                    on: {
                        RESPONSE: [
                            {
                                cond: (context, event) => event.value === "play_game",
                                target: '#dmMastermind'
                            },
                            {
                                cond: (context, event) => event.value === "quit",
                                target: '#quit'
                            },
                            {
                                cond: (context, event) => event.value === "how_to_play",
                                target: '#howToPlay'
                            },
                            {
                                cond: (context, event) => event.value === "options",
                                target: '#options'
                            },
                            {
                                cond: (context, event) => event.value === "help",
                                target: '#help'
                            },
                            { target: 'nomatch' }
                        ],
                        RESPONSE_ERROR: {
                            target: '#error',
                        }
                    }
                },
            },
	        on: {
                TIMER: '.reprompt.repromptCounter',
	    	    RECOGNISED: {
	    	        actions: sendQuery,
	    	        target: '.pending',
                }
            },
	    },
        quit: {
            id: 'quit',
            initial: 'prompt',
            states: {
                prompt: {
                    entry: say("Are you sure you want to exit the game?"),
                    on: { ENDSPEECH: 'ask' },
                    exit: startRepromptTimer
                },
                ask: {
                    id: 'ask',
                    entry: listen(),
                    exit: cancelRepromptTimer
                },
                reprompt: {
                    ...reprompt("Do you want to exit the game?", '#quit.ask'),
                    onDone: '#done'
                },
                nomatch: {
                    entry: say("Sorry, I didn't catch that."),
                    on: { ENDSPEECH: 'prompt' }
                },
                pending: {
                    id: 'pending',
                    on: {
                        RESPONSE: [
                            {
                                cond: (context, event) => event.value === "affirm",
                                target: '#done'
                            },
                            {
                                cond: (context, event) => event.value === "deny",
                                target: '#intro'
                            },
                            { target: 'nomatch' }
                        ],
                        RESPONSE_ERROR: {
                            target: '#error',
                        }
                    }
                },
            },
	        on: {
                TIMER: '.reprompt.repromptCounter',
	    	    RECOGNISED: {
	    	        actions: sendQuery,
	    	        target: '.pending',
                }
            },
        },
        howToPlay: {
            id: 'howToPlay',
            ...dmHowToPlayMachine,
            onDone: {
                target: 'intro'
            }
        },
        options: {
            id: 'options',
            initial: 'prompt',
            states: {
                prompt: {
                    entry: say("These are your options!"),
                    on: { ENDSPEECH: '#intro' },
                },
            },
        },
        help: {
            id: 'help',
            initial: 'prompt',
            states: {
                prompt: {
                    entry: say("I'll help you!"),
                    on: { ENDSPEECH: '#intro' },
                },
            },
        },
        dmMastermind: {
            id: 'dmMastermind',
            ...dmMastermindMachine,
            onDone: {
                target: 'init' 
            }
        },
        error: {
            id: 'error',
            entry: say("Sorry, something went wrong. Maybe try again later?"),
            on: { ENDSPEECH: 'done' }
        },
        done: {
            id: 'done',
            entry: say("Bye bye!"),
            type: 'final',
        },
    },
    onDone: {
        target: '.init'
    }
})