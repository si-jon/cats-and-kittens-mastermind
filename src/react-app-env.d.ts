/// <reference types="react-scripts" />

declare module 'react-speech-kit';

interface GuessData {
    guess: string;
    catCount: number;
    kittenCount: number;
}

interface SDSContext {
    recResult: string;
    nluData: any;
    ttsAgenda: string;
    query: string;
    digits: Array<number>;
    digitsResponse: Array<number>;
    guessHistory: Array<GuessData>;
    repromptCount: integer;
}

type SDSEvent =
    | { type: 'CLICK' }
    | { type: 'RECOGNISED' }
    | { type: 'ASRRESULT', value: string }
    | { type: 'ENDSPEECH' }
    | { type: 'LISTEN' }
    | { type: 'STOP_LISTEN' }
    | { type: 'SPEAK', value: string }
    | { type: 'QUERY', value: string }
    | { type: 'RESPONSE', value: string }
    | { type: 'RESPONSE_ERROR', value: string }
    | { type: 'TIMER' };
