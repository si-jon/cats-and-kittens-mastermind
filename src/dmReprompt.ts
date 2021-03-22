import { MachineConfig, send, Action, assign, actions } from "xstate";
import { say } from "./voice";

const { cancel } = actions;

export const startRepromptTimer: Action<SDSContext, SDSEvent> = send('TIMER', { delay: 30000, id: 'repromptTimer' })
export const cancelRepromptTimer: Action<SDSContext, SDSEvent> = cancel('repromptTimer')
export const resetRepromptCount: Action<SDSContext, SDSEvent> = assign({ repromptCount: context => 0 })

export function reprompt(repromptMessage: string, state: string): MachineConfig<SDSContext, any, SDSEvent> {
    return ({
        initial: 'reprompt',
        states: {
            repromptCounter: {
                entry: [
                    send('STOP_LISTEN'),
                    assign({ repromptCount: context => context.repromptCount + 1 }),
                ],
                always: [
                    {
                        cond: (context) => context.repromptCount > 5,
                        target: 'done'
                    },
                    {
                        target: 'reprompt'
                    }
                ]
            },
            reprompt: {
                entry: say(repromptMessage),
                on: {
                    ENDSPEECH: state,
                },
                exit: startRepromptTimer
            },
            done: {
                type: 'final'
            }
        },
    })
}