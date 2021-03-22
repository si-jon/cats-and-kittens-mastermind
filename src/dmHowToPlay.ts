import { MachineConfig } from "xstate";
import { say } from "./voice";

const preText = "Cats and kittens is a version of the game Mastermind. \
    Your task is to figure out my four digit code with help of my hints."

const mitText = "You guess which four digits, 0-9, are in my code, and I'll give you a hint of each guess.\
        The hints are the number of cats and kittens!"

const catText = "A cat indicates one of the numbers in your guess are in the correct spot."
const kittenText = "A kitten indicates one of the numbers in your guess are included in the code, but in the wrong spot."

export const dmHowToPlayMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
    initial: 'pre',
    states: {
        pre: {
            entry: say(preText),
            on: { ENDSPEECH: 'mid' }
        },
        mid: {
            entry: say(mitText),
            on: { ENDSPEECH: 'cat' }
        },
        cat: {
            entry: say(catText),
            on: { ENDSPEECH: 'kitten' }
        },
        kitten: {
            entry: say(kittenText),
            on: { ENDSPEECH: 'done' }
        },
        done: {
            type: 'final',
        },
    }
})
