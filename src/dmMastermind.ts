import { MachineConfig, send, Action, assign, actions } from "xstate";


function say(text: string): Action<SDSContext, SDSEvent> {
    return send((_context: SDSContext) => ({ type: "SPEAK", value: text }))
}

function listen(): Action<SDSContext, SDSEvent> {
    return send('LISTEN')
}

function generateDigits(): Array<number> {
    let digits: Array<number> = [];

    for (var i = 0; i < 4; i++) {
        digits.push(Math.floor(Math.random() * 10));
    }
    return digits;
}

const digitGrammar: { [index: string]: { digit?: string } } = {
    "zero": { digit: '0' },
    "one": { digit: '1' },
    "two": { digit: '2' },
    "three": { digit: '3' },
    "four": { digit: '4' },
    "for": { digit: '4' },
    "five": { digit: '5' },
    "six": { digit: '6' },
    "seven": { digit: '7' },
    "eight": { digit: '8' },
    "nine": { digit: '9' },
}

const yes_no_grammar: { [index: string]: {} } = {
    "yes": true,
    "you bet": true,
    "yeah": true,
    "no": false,
    "no way": false,
    "nope": false,
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
    console.log(pruneStr);
    const splitStr = Array.from(pruneStr);
    return splitStr
}

function isCorrectCount(inputStr: string): boolean {
    return (splitDigitString(inputStr).length == 4);
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
    return isCorrectCount(inputStr) && isDigits(inputStr);
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

function getCatsAndKittens(context: SDSContext): string {
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
    const catStr = (cats == 1) ? "cat" : "cats";
    const kittenStr = (kittens == 1) ? "kitten" : "kittens";
    console.log(`${cats} ${catStr}, ${kittens} ${kittenStr}`);
    context.guessHistory.push(context.digitsResponse.join("") + ` ${cats} ${catStr}, ${kittens} ${kittenStr}`);

    return `${cats} ${catStr}, ${kittens} ${kittenStr}`
}

export const dmMastermindMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
    id: "mastermind",
    initial: 'catsnkittens',
    entry: assign({ guessHistory: context => [] }),
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
                    initial: 'prompt',
                    states: {
                        prompt: {
                            entry: say("Give me four digits!"),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        ask: {
                            entry: listen()
                        },
                        result: {
                            entry: send((context) => ({
                                type: "SPEAK",
                                value: getCatsAndKittens(context)
                            })),
                            on: {
                                ENDSPEECH: 'prompt'
                            }
                        },
                        invalid: {
                            entry: say("That's not four digits"),
                            on: {
                                ENDSPEECH: 'prompt'
                            }
                        }
                    },
                    on: {
                        RECOGNISED: [{
                            cond: (context) => context.recResult === 'help',
                            target: '#common.help'
                        },
                        {
                            cond: (context) => context.recResult === 'quit',
                            target: '#common.quit'
                        },
                        {
                            cond: (context) => allCorrect(context.digits, context.recResult),
                            target: 'finished'
                        },
                        {
                            cond: (context) => isValidInput(context.recResult),
                            actions:
                                assign((context) => {
                                    return { digitsResponse: convertToDigits(context.recResult) }
                                }),
                            target: '.result'
                        },
                        {
                            target: '.invalid'
                        }
                        ]
                    }
                },
                finished: {
                    entry: say("Meow meow meow meow! Congratulations, you won!"),
                    on: {
                        ENDSPEECH: '#playprompt'
                    }
                },
                hist: {
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
                    }
                },
                ask: {
                    entry: listen()
                },
            },
            on: {
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
                    entry: say("This is a help message"),
                    on: {
                        ENDSPEECH: [
                            {
                                target: '#catsnkittens.hist',
                                actions: (context: SDSContext) => {
                                    console.log('You cheat! ' + context.digits);
                                }
                            }
                        ]
                    },
                },
                quit: {
                    initial: 'prompt',
                    states: {
                        prompt: {
                            entry: say("Are you sure you want to quit?"),
                            on: {
                                ENDSPEECH: 'ask'
                            }
                        },
                        ask: {
                            entry: listen()
                        },
                    },
                    on: {
                        RECOGNISED: [{
                            cond: (context) => yes_no_grammar[context.recResult] === true,
                            target: '#done'
                        },
                        {
                            cond: (context) => yes_no_grammar[context.recResult] === false,
                            target: '#catsnkittens.hist',
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
