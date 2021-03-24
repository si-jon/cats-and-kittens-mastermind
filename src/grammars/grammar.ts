export const digitGrammar: { [index: string]: { digit?: string } } = {
    "zero": { digit: '0' },
    "one": { digit: '1' },
    "two": { digit: '2' },
    "to": { digit: '2' },
    "three": { digit: '3' },
    "free": { digit: '3' },
    "street": { digit: '3' },
    "four": { digit: '4' },
    "for": { digit: '4' },
    "five": { digit: '5' },
    "six": { digit: '6' },
    "seven": { digit: '7' },
    "eight": { digit: '8' },
    "nine": { digit: '9' },
}

export const yes_no_grammar: { [index: string]: {} } = {
    "yes": true,
    "you bet": true,
    "yeah": true,
    "no": false,
    "no way": false,
    "nope": false,
}