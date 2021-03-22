import { MachineConfig, send, Action, assign, actions } from "xstate";
import { say, listen } from "./voice";
import { reprompt, startRepromptTimer, cancelRepromptTimer, resetRepromptCount } from "./dmReprompt";
import { digitGrammar, yes_no_grammar } from "./grammars/grammar"
import { dmHowToPlayMachine } from "./dmHowToPlay";

const sendQuery: Action<SDSContext, SDSEvent> = send((context: SDSContext) => ({
    type: "QUERY", value: context.recResult
}))

function generateDigits(): Array<number> {
    let digits: Array<number> = [];

    for (var i = 0; i < 4; i++) {
        digits.push(Math.floor(Math.random() * 10));
    }
    return digits;
}

function splitDigitString(inputStr: string): Array<string> {
    const preSplit = inputStr.split(' ');
    preSplit.forEach((element, idx, arr) => {
        if (digitGrammar[element] != undefined && 'digit' in digitGrammar[element]) {
            arr[idx] = digitGrammar[element].digit || '';
        }
    });
    const joinStr = preSplit.join('');
    const pruneStr = joinStr.replace(/[^0-9]/g, '');
    const splitStr = Array.from(pruneStr);
    return splitStr
}

function getCount(inputStr: string): number {
    return splitDigitString(inputStr).length;
}

function isDigits(inputStr: string): boolean {
    const splitStr = splitDigitString(inputStr);
    for (let i in splitStr) {
        const parsed = Number(splitStr[i])
        if (isNaN(parsed)) {
            return false;
        }
    }
    return true;
}
function isValidInput(inputStr: string): boolean {
    return (getCount(inputStr) == 4) && isDigits(inputStr);
}

function convertToDigits(inputStr: string): Array<number> {
    const splitStr = splitDigitString(inputStr);
    var digits: Array<number> = [];
    for (let i in splitStr) {
        let parsed = Number(splitStr[i]);
        digits.push(parsed);
    }
    return digits;
}

function allCorrect(soughtDigits: Array<number>, guessedDigits: string): boolean {
    const d = convertToDigits(guessedDigits);
    for (let i = 0; i < 4; i++) {
        if (d[i] != soughtDigits[i]) {
            return false;
        }
    }
    return true;
}

function addToHistory(context: SDSContext, guess: string, catCount: number, kittenCount: number) {
    context.guessHistory.push({
        guess: guess,
        catCount: catCount,
        kittenCount: kittenCount
    });
}
function addCatsAndKittensHistory(context: SDSContext) {
    let cats = 0;
    let kittens = 0;
    let soughtDigits = [...context.digits]
    let guessedDigits = [...context.digitsResponse]
    let availablekittens = [...soughtDigits];
    let guessesLeft = guessedDigits;
    for (let i = 0; i < 4; i++) {
        if (guessedDigits[i] == soughtDigits[i]) {
            cats += 1;
            availablekittens[i] = NaN;
            guessesLeft[i] = NaN;
        }
    }
    for (let i = 0; i < 4; i++) {
        if (!isNaN(guessesLeft[i])) {
            for (let j = 0; j < 4; j++) {
                if (!isNaN(availablekittens[j]) && (guessesLeft[i] == availablekittens[j])) {
                    kittens += 1;
                    guessesLeft[i] = NaN;
                    availablekittens[j] = NaN;
                }
            }
        }
    }
    addToHistory(context, context.digitsResponse.join(""), cats, kittens);
}

function getCatsAndKittensMessage(context: SDSContext): string {
    addCatsAndKittensHistory(context)
    const idx = context.guessHistory.length - 1;
    let cats = 0;
    let kittens = 0;
    if (idx >= 0) {
        cats = context.guessHistory[idx].catCount;
        kittens = context.guessHistory[idx].kittenCount;
    }
    const catStr = (cats == 1) ? "cat" : "cats";
    const kittenStr = (kittens == 1) ? "kitten" : "kittens";
    return `${cats} ${catStr}, ${kittens} ${kittenStr}`;
}

function getWinMessage(context: SDSContext): string {
    addCatsAndKittensHistory(context);
    const guessCount = context.guessHistory.length
    return `Meow meow meow meow! Purrfect! You got it in ${guessCount} tries!`;
}


const saveDigits: Action<SDSContext, SDSEvent> = assign((context: SDSContext) => {
    return { digitsResponse: convertToDigits(context.recResult) }
})

export const dmMastermindMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
    initial: 'catsnkittens',
    entry: [
        resetRepromptCount,
        assign({ guessHistory: context => [] }),
    ],
    states: {
        catsnkittens: {
            id: 'catsnkittens',
            initial: 'welcome',
            states: {
                welcome: {
                    entry: [
                        assign(context => { return { digits: generateDigits() } }),
                        say("Let's play cats and kittens!"),
                    ],
                    on: {
                        ENDSPEECH: 'play',
                    }
                },
                play: {
                    id: 'play',
                    initial: 'prompt',
                    states: {
                        prompt: {
                            entry: say("Give me four digits!"),
                            on: {
                                ENDSPEECH: 'ask'
                            },
                            exit: startRepromptTimer
                        },
                        ask: {
                            entry: listen(),
                            exit: cancelRepromptTimer
                        },
                        reprompt: {
                            ...reprompt("You can ask me for help if you need to.", '#play.ask'),
                            onDone: '#done'
                        },
                        result: {
                            entry: [
                                send((context) => ({
                                    type: "SPEAK",
                                    value: getCatsAndKittensMessage(context)
                                }))],
                            on: {
                                ENDSPEECH: 'prompt'
                            }
                        },
                        tooMany: {
                            entry: [
                                (context) => (addToHistory(context, context.digitsResponse.join(""), 0, 0)),
                                say("That's too many digits"),
                            ],
                            on: {
                                ENDSPEECH: 'prompt',
                            }
                        },
                        tooFew: {
                            entry: [
                                (context) => (addToHistory(context, context.digitsResponse.join(""), 0, 0)),
                                say("That's too few digits"),
                            ],
                            on: {
                                ENDSPEECH: 'prompt',
                            }
                        },
                        invalid: {
                            entry: [
                                (context) => (addToHistory(context, "<not digits>", 0, 0)),
                                say("That's not four digits"),
                            ],
                            on: {
                                ENDSPEECH: 'prompt',
                            }
                        }
                    },
                    on: {
                        TIMER: '.reprompt.repromptCounter',
                        RECOGNISED: [{
                            cond: (context) => context.recResult === 'help',
                            target: '#helpgame'
                        },
                        {
                            cond: (context) => context.recResult === 'quit',
                            target: '#quitgame'
                        },
                        {
                            cond: (context) => allCorrect(context.digits, context.recResult),
                            actions: saveDigits,
                            target: 'finished'
                        },
                        {
                            cond: (context) => isValidInput(context.recResult),
                            actions: saveDigits,
                            target: '.result'
                        },
                        {
                            cond: (context) => getCount(context.recResult) > 4,
                            actions: saveDigits,
                            target: '.tooMany'
                        },
                        {
                            cond: (context) => getCount(context.recResult) < 4 && getCount(context.recResult) > 0,
                            actions: saveDigits,
                            target: '.tooFew'
                        },
                        {
                            target: '.invalid'
                        }
                        ]
                    }
                },
                finished: {
                    entry: [
                        send((context) => ({
                            type: "SPEAK",
                            value: getWinMessage(context)
                        })),
                    ],
                    on: {
                        ENDSPEECH: '#playprompt'
                    }
                },
                gamehist: {
                    type: 'history',
                    history: 'shallow'
                },
            },
        },
        playprompt: {
            id: 'playprompt',
            initial: 'prompt',
            states: {
                prompt: {
                    entry: say("Do you want to play again?"),
                    on: {
                        ENDSPEECH: 'ask'
                    },
                    exit: startRepromptTimer
                },
                ask: {
                    entry: listen(),
                    exit: cancelRepromptTimer
                },
                reprompt: {
                    ...reprompt("Play again?", '#playprompt.ask'),
                    onDone: '#done'
                },
            },
            on: {
                TIMER: '.reprompt.repromptCounter',
                RECOGNISED: [{
                    cond: (context) => yes_no_grammar[context.recResult] === true,
                    actions: [
                        assign({ guessHistory: context => [] }),
                    ],
                    target: 'catsnkittens'
                },
                {
                    cond: (context) => yes_no_grammar[context.recResult] === false,
                    target: 'done'
                },
                {
                    target: '.prompt'
                }
                ]
            }
        },
        common: {
            id: 'common',
            states: {
                help: {
                    id: 'helpgame',
                    initial: 'prompt',
                    states: {
                        prompt: {
                            entry: say("Do you want to know the rules of the game, quit the game, or continue playing?"),
                            on: { ENDSPEECH: 'ask' },
                            exit: startRepromptTimer
                        },
                        ask: {
                            entry: listen(),
                            exit: cancelRepromptTimer
                        },
                        howToPlayInGame: {
                            ...dmHowToPlayMachine,
                            onDone: {
                                target: '#catsnkittens.gamehist'
                            }
                        },
                        reprompt: {
                            ...reprompt("Do you want to know the rules of the game, quit the game, or continue playing?", '#helpgame.ask'),
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
                                        cond: (context, event) => event.value === "continue",
                                        target: '#catsnkittens.gamehist',
                                    },
                                    {
                                        cond: (context, event) => event.value === "quit",
                                        target: '#quitgame'
                                    },
                                    {
                                        cond: (context, event) => event.value === "how_to_play",
                                        target: 'howToPlayInGame'
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
                quitgame: {
                    id: 'quitgame',
                    initial: 'prompt',
                    states: {
                        prompt: {
                            entry: say("Are you sure you want to quit?"),
                            on: {
                                ENDSPEECH: 'ask'
                            },
                            exit: startRepromptTimer
                        },
                        ask: {
                            entry: listen(),
                            exit: cancelRepromptTimer
                        },
                        reprompt: {
                            ...reprompt("Do you want to exit the game?", '#quitgame.ask'),
                            onDone: '#done'
                        },
                    },
                    on: {
                        TIMER: '.reprompt.repromptCounter',
                        RECOGNISED: [{
                            cond: (context) => yes_no_grammar[context.recResult] === true,
                            target: '#done'
                        },
                        {
                            cond: (context) => yes_no_grammar[context.recResult] === false,
                            target: '#catsnkittens.gamehist',
                        },
                        {
                            target: '.prompt'
                        }
                        ]
                    }
                }
            },
        },
        done: {
            id: 'done',
            entry: say("Bye bye!"),
            type: 'final',
        },
    },
})
