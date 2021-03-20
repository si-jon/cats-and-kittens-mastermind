/// <reference types="react-scripts" />

declare module 'react-speech-kit';

interface SDSContext {
    recResult: string;
    nluData: any;
    ttsAgenda: string;
    query: string;
    digits: Array<number>;
    digitsResponse: Array<number>;
    guessHistory: Array<string>;
}

type SDSEvent =
    | { type: 'CLICK' }
    | { type: 'RECOGNISED' }
    | { type: 'ASRRESULT', value: string }
    | { type: 'ENDSPEECH' }
    | { type: 'LISTEN' }
    | { type: 'SPEAK', value: string }
    | { type: 'QUERY', value: string }
    | { type: 'RESPONSE', value: string }
    | { type: 'RESPONSE_ERROR', value: string };
