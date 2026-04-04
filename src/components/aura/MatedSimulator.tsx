'use client'

import { useState } from 'react'
import { calcularMATED } from '@/lib/engine/math'
import { ArrowRight, Activity, AlertTriangle } from 'lucide-react'

interface MatedSimulatorProps {
    baricentroAtual: [number, number]
    pontoOperacaoAtual: { x: number, y: number }
    threshold: number
}

export function MatedSimulator({ baricentroAtual, pontoOperacaoAtual, threshold }: MatedSimulatorProps) {
    const distAtual = calcularMATED(pontoOperacaoAtual, baricentroAtual)

    const [dx, setDx] = useState(0)
    const [dy, setDy] = useState(0)

    const novoPonto = { x: pontoOperacaoAtual.x + dx, y: pontoOperacaoAtual.y + dy }
    const distNova = calcularMATED(novoPonto, baricentroAtual)

    const emCrise = distNova > threshold

    return (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl max-w-lg w-full">
            <div className="flex items-center gap-3 mb-6">
                <Activity className="h-6 w-6 text-indigo-400" />
                <h2 className="text-xl font-bold text-white">Simulador MATED</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">MATED Atual</p>
                    <p className="text-2xl font-bold text-slate-200">{distAtual.toFixed(3)}</p>
                </div>
                <div className={`p-4 rounded-xl border ${emCrise ? 'bg-red-950/30 border-red-900/50' : 'bg-emerald-950/30 border-emerald-900/50'}`}>
                    <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${emCrise ? 'text-red-400' : 'text-emerald-400'}`}>MATED Simulado</p>
                    <p className={`text-2xl font-bold flex items-center gap-2 ${emCrise ? 'text-red-300' : 'text-emerald-300'}`}>
                        {distNova.toFixed(3)}
                        {emCrise && <AlertTriangle className="h-5 w-5 animate-pulse" />}
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-sm text-slate-400 block mb-2">Impacto Orçamento (Adimensional)</label>
                    <input
                        type="range"
                        min="-0.5" max="0.5" step="0.01"
                        value={dx}
                        onChange={e => setDx(parseFloat(e.target.value))}
                        className="w-full accent-indigo-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>-0.5</span>
                        <span className="font-medium text-slate-300">{dx > 0 ? `+${dx}` : dx}</span>
                        <span>+0.5</span>
                    </div>
                </div>

                <div>
                    <label className="text-sm text-slate-400 block mb-2">Impacto Prazo (Adimensional)</label>
                    <input
                        type="range"
                        min="-0.5" max="0.5" step="0.01"
                        value={dy}
                        onChange={e => setDy(parseFloat(e.target.value))}
                        className="w-full accent-emerald-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>-0.5</span>
                        <span className="font-medium text-slate-300">{dy > 0 ? `+${dy}` : dy}</span>
                        <span>+0.5</span>
                    </div>
                </div>
            </div>

            <button
                disabled={emCrise}
                className="mt-6 w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
                Submeter Decisão
                <ArrowRight className="h-4 w-4" />
            </button>
            {emCrise && (
                <p className="text-xs text-red-500 text-center mt-3 font-bold border border-red-500/30 bg-red-500/5 py-2 rounded-lg animate-pulse uppercase tracking-wider">
                    ALERTA DE CRISE: Limiar ultrapassado!
                </p>
            )}

            {/* Klauss Interpretation Panel */}
            <div className="mt-8 p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl space-y-3 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity className="h-12 w-12 text-indigo-400" />
                </div>
                <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    Klauss IA: Interpretação de Negócio
                </h3>
                
                <div className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-indigo-500/30 pl-4 py-1">
                    {distNova < threshold ? (
                        <>
                            &ldquo;O projeto mantém-se em <strong>Equilíbrio Estável</strong>. {dx > 0 ? 'O aumento do custo é absorvido pela margem de segurança.' : 'A variação de prazo está dentro da tolerância CDT.'} Recomendo manter o monitoramento preventivo.&rdquo;
                        </>
                    ) : (
                        <>
                            &ldquo;<strong>Ruptura de Resiliência detectada</strong>. O desvio de {((distNova - threshold) * 100).toFixed(1)}% além do limite sugere que o 'Setup Jump&apos; falhou em estabilizar a reta base. Justificativa técnica exigida para PO.&rdquo;
                        </>
                    )}
                </div>

                <div className="flex gap-2 pt-2">
                    <span className="px-2 py-1 bg-indigo-500/10 text-[10px] font-bold text-indigo-400 rounded-md uppercase border border-indigo-500/20">
                        {dx > 0.3 ? 'Risco Financeiro: Alto' : 'Risco Financeiro: Controlado'}
                    </span>
                    <span className="px-2 py-1 bg-emerald-500/10 text-[10px] font-bold text-emerald-400 rounded-md uppercase border border-emerald-500/20">
                        {dy > 0.3 ? 'Risco Prazo: Crítico' : 'Risco Prazo: Nominal'}
                    </span>
                </div>
            </div>
        </div>
    )
}
