import { calculateCPM, calculateCDT } from '../math';
import { evaluateDecision } from '../euclidian';

self.onmessage = (event: MessageEvent) => {
    // BUG-03: callId echoado de volta para correlacionar respostas em chamadas concorrentes
    const { type, payload, callId } = event.data;
    try {
        switch (type) {
            case 'CALCULATE_CPM': {
                const result = calculateCPM(payload.tasks);
                self.postMessage({ type: 'CPM_RESULT', payload: result, callId });
                break;
            }
            case 'CHECK_CDT': {
                const result = calculateCDT(payload.scope, payload.time, payload.cost);
                self.postMessage({ type: 'CDT_RESULT', payload: result, callId });
                break;
            }
            case 'EVALUATE_MATED': {
                const result = evaluateDecision(payload.originalTriangle, payload.decision);
                self.postMessage({ type: 'MATED_RESULT', payload: result, callId });
                break;
            }
            default:
                throw new Error(`Unknown worker message type: ${type}`);
        }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        self.postMessage({ type: 'ERROR', payload: error.message, callId });
    }
};
