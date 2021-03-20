import { MachineConfig, send, assign, Action } from "xstate";

const proxyurl = 'https://cors-anywhere.herokuapp.com/';
const rasaurl = 'https://cnk-mastermind-rasa-server.herokuapp.com/model/parse'
const nluRequest = (text: string) =>
    fetch(new Request(proxyurl + rasaurl, {
        method: 'POST',
        headers: { 'Origin': 'https://github.com/si-jon/cats-and-kittens-mastermind' }, // only required with proxy
        body: `{"text": "${text}"}`
    })).then(data => data.json());

export const dmRasaQueryMachine: MachineConfig<SDSContext, any, SDSEvent> = ({
    initial: 'init',
    states: {
        init: {
            on: {
                QUERY: {
                    actions: assign((context, event) => { return { query: event.value } }),
                    target:'query'
                }
            }
        },
	    query: {
	        invoke: {
                src: (context, event) => nluRequest(context.query),
                onDone: {
                    target: 'init',
                    actions: [
                        send((context, event) => ({ type: "RESPONSE", value: event.data.intent.name })),
                        (context:SDSContext, event:any) => console.log(event.data)
                        ]
                },
	    	    onError: {
                    target: 'init',
	    	        actions: [
                        send((context, event) => ({ type: "RESPONSE_ERROR", value: event.data })),
                        (context:SDSContext, event:any) => console.log(event.data)
                    ]
                }
            }
	    }
    }
})
