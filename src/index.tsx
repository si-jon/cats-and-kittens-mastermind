import "./styles.scss";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Machine, assign, send, State } from "xstate";
import { useMachine, asEffect } from "@xstate/react";
import { inspect } from "@xstate/inspect";
import { dmMainMachine } from "./dmMain";
import { dmRasaQueryMachine } from "./dmRasaQuery";


inspect({
    url: "https://statecharts.io/inspect",
    iframe: false
});

import { useSpeechSynthesis, useSpeechRecognition } from 'react-speech-kit';

const initContext = {
    recResult: "",
    nluData: "",
    ttsAgenda: "",
    query: "",
    digits: [],
    digitsResponse: [],
    guessHistory: [],
    repromptCount: 0,
}

const machine = Machine<SDSContext, any, SDSEvent>({
    id: 'root',
    type: 'parallel',
    context: initContext,
    states: {
        dm: {
            ...dmMainMachine
        },
        dmRasaQuery: {
            ...dmRasaQueryMachine,
        },
        asrtts: {
            initial: 'idle',
            states: {
                idle: {
                    on: {
                        LISTEN: 'recognising',
                        SPEAK: {
                            target: 'speaking',
                            actions: assign((_context, event) => { return { ttsAgenda: event.value } })
                        }
                    }
                },
                recognising: {
                    initial: 'progress',
                    entry: 'recStart',
                    exit: 'recStop',
                    on: {
                        ASRRESULT: {
                            actions: ['recLogResult',
                                assign((_context, event) => { return { recResult: event.value } })],
                            target: '.match'
                        },
                        RECOGNISED: 'idle',
                        STOP_LISTEN: 'idle'
                    },
                    states: {
                        progress: {
                        },
                        match: {
                            entry: send('RECOGNISED'),
                        },
                    }
                },
                speaking: {
                    entry: 'ttsStart',
                    on: {
                        ENDSPEECH: 'idle',
                    }
                }
            }
        }
    },
},
    {
        actions: {
            recLogResult: (context: SDSContext) => {
                console.log('<< ASR: ' + context.recResult);
            },
            test: () => {
                console.log('test')
            },
            logIntent: (context: SDSContext) => {
                console.log('<< NLU intent: ' + context.nluData.intent.name)
            }
        },
    });



interface Props extends React.HTMLAttributes<HTMLElement> {
    state: State<SDSContext, any, any, any>;
}
const ReactiveButton = (props: Props): JSX.Element => {
    switch (true) {
        case props.state.matches({ asrtts: 'recognising' }):
            return (
                <button type="button" className="glow-on-hover"
                    style={{ animation: "glowing 20s linear" }} {...props}>
                    Listening...
                </button>
            );
        case props.state.matches({ asrtts: 'speaking' }):
            return (
                <button type="button" className="glow-on-hover"
                    style={{ animation: "bordering 1s infinite" }} {...props}>
                    Speaking...
                </button>
            );
        case props.state.matches({ dmRasaQuery: 'query' }):
            console.log('Waiting for rasa result')
            return (
                <button type="button" className="glow-on-hover"
                    style={{ animation: "glowing 60s linear" }} {...props}>
                    Waiting...
                </button>
            );
        default:
            return (
                <button type="button" className="glow-on-hover" {...props}>
                    Click to start
                </button >
            );
    }
}

const GuessList = (props: Props): JSX.Element => {
    const history = props.state.context.guessHistory;
    const ghli = history.map((guessData, index) => {
        const guess = guessData.guess;
        const catCount = guessData.catCount;
        const kittenCount = guessData.kittenCount;
        return (
            <li key={index}>
                <div className="guess">{guess}</div><div className="hint">&#128049;: {catCount} &#128008;: {kittenCount}</div>
            </li>
        );
    });
    return (
        <ol className="guessList">{ghli}</ol>
    );
}

const WinMessage = (props: Props): JSX.Element => {
    const history = props.state.context.guessHistory;
    const idx = history.length - 1;
    if (idx >= 0 && history[idx].catCount === 4) {
        return (
            <div className="winMessage">&#128568; &#128568; &#128568; &#128568;
                Purrrrfect!
            </div>
        );
    }
    return (
        <div></div>
    );
}

function App() {
    const { speak, cancel, speaking } = useSpeechSynthesis({
        onEnd: () => {
            send('ENDSPEECH');
        },
    });
    const { listen, listening, stop } = useSpeechRecognition({
        onResult: (result: any) => {
            send({ type: "ASRRESULT", value: result });
        },
    });
    const [current, send, service] = useMachine(machine, {
        devTools: true,
        actions: {
            recStart: asEffect(() => {
                console.log('Ready to receive speech input.');
                listen({
                    interimResults: false,
                    continuous: true
                });
            }),
            recStop: asEffect(() => {
                console.log('Recognition stopped.');
                stop()
            }),
            ttsStart: asEffect((context, effect) => {
                console.log('Speaking...');
                speak({ text: context.ttsAgenda })
            }),
            ttsCancel: asEffect((context, effect) => {
                console.log('TTS STOP...');
                cancel()
            })
        }
    });

    return (
        <div className="background">
            <div className="Game">
                <h1>&#128049; Cats &amp; Kittens! &#128008;</h1>
                <ReactiveButton state={current} onClick={() => send('CLICK')} />
                <div id="lined">
                    <div id="content">
                        <GuessList state={current} />
                        <WinMessage state={current} />
                    </div>
                </div>
            </div>
        </div>
    )
};

ReactDOM.render(
    <App />,
    document.getElementById("root"));
