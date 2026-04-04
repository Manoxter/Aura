'use client'

/**
 * SingularModal — Sessão 29
 *
 * Modal bloqueante exibido quando o protocolo transita para SINGULAR (ângulo = 90°).
 * Dois sub-tipos com ações diferenciadas:
 * - Singular-Custo: margem de orçamento = R$ 0
 * - Singular-Prazo: folga de cronograma = 0 dias
 *
 * O PM deve escolher "Prosseguir" ou "Rever TAP/WBS" — decisão registrável.
 */

import { useState } from 'react'
import { AlertTriangle, XCircle, ChevronRight } from 'lucide-react'

export type SingularTipo = 'custo' | 'prazo'

interface SingularModalProps {
    /** Tipo de singular detectado */
    tipo: SingularTipo
    /** Valor do ângulo crítico em graus */
    anguloCritico: number
    /** Callback ao prosseguir (PM aceita o risco) */
    onProsseguir: (justificativa: string) => void
    /** Callback ao rever TAP/WBS */
    onRever: () => void
    /** Fechar modal (dismiss) */
    onClose: () => void
}

const CONFIG = {
    custo: {
        titulo: 'SINGULAR — CUSTO',
        descricao: 'O ângulo de custo (ω) atingiu 90°. Margem de orçamento: R$ 0,00.',
        significado: 'Qualquer aumento de custo muda o projeto para estado BETA (obtuso em custo).',
        acoes: [
            'Rever WBS: eliminar entregas não-críticas',
            'Renegociar contrato: aditivo de orçamento',
            'Congelar escopo: nenhuma CR até estabilizar',
        ],
        corBorda: 'border-blue-500/50',
        corFundo: 'bg-blue-950/50',
        corTexto: 'text-blue-400',
        corIcone: '#60a5fa',
    },
    prazo: {
        titulo: 'SINGULAR — PRAZO',
        descricao: 'O ângulo de prazo (α) atingiu 90°. Folga de cronograma: 0 dias úteis.',
        significado: 'Qualquer atraso muda o projeto para estado GAMMA (obtuso em prazo).',
        acoes: [
            'Fast-tracking: paralelizar tarefas do caminho crítico',
            'Crashing: alocar mais recursos nas tarefas críticas',
            'Rever marcos: renegociar datas com stakeholders',
        ],
        corBorda: 'border-amber-500/50',
        corFundo: 'bg-amber-950/50',
        corTexto: 'text-amber-400',
        corIcone: '#f59e0b',
    },
} as const

export function SingularModal({
    tipo,
    anguloCritico,
    onProsseguir,
    onRever,
    onClose,
}: SingularModalProps) {
    const [justificativa, setJustificativa] = useState('')
    const cfg = CONFIG[tipo]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className={`w-full max-w-lg mx-4 rounded-2xl border ${cfg.corBorda} ${cfg.corFundo} shadow-2xl overflow-hidden`}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-800/80">
                            <AlertTriangle className="h-5 w-5" style={{ color: cfg.corIcone }} />
                        </div>
                        <div>
                            <h2 className={`text-sm font-bold ${cfg.corTexto} tracking-wide`}>
                                {cfg.titulo}
                            </h2>
                            <p className="text-[10px] text-slate-500 font-mono">
                                ângulo = {anguloCritico.toFixed(1)}°
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-600 hover:text-slate-400 transition-colors">
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    <p className="text-sm text-slate-300">{cfg.descricao}</p>
                    <p className="text-xs text-slate-400 italic">{cfg.significado}</p>

                    {/* Ações sugeridas */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Ações sugeridas
                        </p>
                        {cfg.acoes.map((acao, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                <ChevronRight className="h-3 w-3 mt-0.5 text-slate-600 shrink-0" />
                                <span>{acao}</span>
                            </div>
                        ))}
                    </div>

                    {/* Justificativa (para "Prosseguir") */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
                            Justificativa (obrigatória para prosseguir)
                        </label>
                        <textarea
                            value={justificativa}
                            onChange={e => setJustificativa(e.target.value)}
                            placeholder="Descreva por que está prosseguindo ciente do risco..."
                            className="w-full h-20 px-3 py-2 text-xs bg-slate-800/60 border border-slate-700/50 rounded-lg text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-slate-500 resize-none"
                        />
                    </div>
                </div>

                {/* Footer — Ações */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700/50 bg-slate-900/50">
                    <button
                        onClick={onRever}
                        className="px-4 py-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 rounded-lg hover:bg-emerald-950/60 transition-colors"
                    >
                        Rever TAP/WBS
                    </button>
                    <button
                        onClick={() => onProsseguir(justificativa)}
                        disabled={justificativa.trim().length < 10}
                        className="px-4 py-2 text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-500/30 rounded-lg hover:bg-rose-950/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Prosseguir ciente do risco
                    </button>
                </div>
            </div>
        </div>
    )
}
