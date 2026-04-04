import { useEffect, useRef, useState, useCallback } from 'react';
import { calculateCPM, calculateCDT } from '@/lib/engine/math';
import { evaluateDecision } from '@/lib/engine/euclidian';

export function useMathWorker() {
    const workerRef = useRef<Worker | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    // BUG-03: callId counter para correlacionar respostas em chamadas concorrentes
    const callIdRef = useRef(0);

    useEffect(() => {
        // Initialize worker only on client-side
        if (typeof window !== 'undefined') {
            workerRef.current = new Worker(new URL('../lib/engine/worker/math.worker.ts', import.meta.url), {
                type: 'module',
            });
        }

        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, []);

    const runSimulation = useCallback(<T,>(
        type: 'CALCULATE_CPM' | 'CHECK_CDT' | 'EVALUATE_MATED',
        payload: unknown
    ): Promise<T> => {
        return new Promise((resolve, reject) => {
            const callId = ++callIdRef.current;

            if (!workerRef.current) {
                // Fallback to synchronous calculation if Worker is unavailable or SSR
                setIsCalculating(true)
                setTimeout(() => {
                    try {
                        let result;
                        const p = payload as Record<string, unknown>;
                        switch (type) {
                            case 'CALCULATE_CPM':
                                result = calculateCPM(p.tasks as Parameters<typeof calculateCPM>[0]);
                                break;
                            case 'CHECK_CDT':
                                result = calculateCDT(
                                    p.scope as number,
                                    p.time as number,
                                    p.cost as number,
                                );
                                break;
                            case 'EVALUATE_MATED':
                                result = evaluateDecision(
                                    p.originalTriangle as Parameters<typeof evaluateDecision>[0],
                                    p.decision as Parameters<typeof evaluateDecision>[1],
                                );
                                break;
                            default:
                                throw new Error(`Unknown calculation type: ${type}`);
                        }
                        setIsCalculating(false)
                        resolve(result as T);
                    } catch (e: unknown) {
                        setIsCalculating(false)
                        reject(new Error("Synchronous fallback calculation failed: " + (e instanceof Error ? e.message : String(e))))
                    }
                }, 0)
                return;
            }

            setIsCalculating(true);

            // BUG-03: handler filtra por callId para evitar cross-resolve em chamadas concorrentes
            const handleMessage = (e: MessageEvent) => {
                const { type: returnType, payload: returnPayload, callId: returnCallId } = e.data;

                // Ignorar respostas de outras chamadas
                if (returnCallId !== callId) return;

                workerRef.current?.removeEventListener('message', handleMessage);

                if (returnType === 'ERROR') {
                    setIsCalculating(false);
                    reject(new Error(returnPayload));
                    return;
                }

                setIsCalculating(false);
                resolve(returnPayload as T);
            };

            workerRef.current.addEventListener('message', handleMessage);
            workerRef.current.postMessage({ type, payload, callId });
        });
    }, []);

    return {
        runSimulation,
        isCalculating
    };
}
