'use client'

import React from 'react'

// ═══════════════════════════════════════════════════════════════════════════
// IQBadge — Badge do Índice de Qualidade (IQ = área_TA / área_TM × 100%)
// Story 5.6 — Badge IQ permanente na UI
// ═══════════════════════════════════════════════════════════════════════════

// MATED_V30_BASELINE = sqrt(7)/12 ≈ 0.2205 — baseline isósceles CDT v3.0
const MATED_V30_BASELINE = Math.sqrt(7) / 12

/**
 * Traduz distância MATED para linguagem de gestão.
 * Se prazoBase disponível: calcula dias equivalentes.
 * Caso contrário: retorna descrição qualitativa de zona.
 */
function matedToNatural(mated: number, prazoBase?: number | null): string {
    if (prazoBase && prazoBase > 0) {
        // Proporção: MATED/BASELINE × (prazoBase × fator) ≈ dias de desvio
        const diasEquiv = Math.round(mated * prazoBase / MATED_V30_BASELINE)
        if (mated < 0.15) return `~${diasEquiv} dias de desvio — geometria estável`
        if (mated < 0.30) return `~${diasEquiv} dias de desvio — zona de risco`
        return `~${diasEquiv} dias de desvio — deformação plástica`
    }
    // Qualitativo sem prazoBase
    if (mated < 0.15) return 'geometria estável — folga operacional preservada'
    if (mated < 0.30) return 'desvio moderado — monitorar tendência'
    return 'deformação plástica ativa — intervenção recomendada'
}

export interface IQBadgeProps {
    /** IQ em percentual (null = TM não configurado, não renderiza) */
    iq: number | null
    /** Story 5.3 — MATED: distância euclidiana TA→TM baseline (opcional) */
    mated?: number | null
    /** Prazo base do projeto em dias — permite traduzir MATED para dias reais */
    prazoBase?: number | null
    /** Classe CSS adicional para o container */
    className?: string
}

/**
 * Determina a cor semântica do badge com base no valor IQ.
 *
 * Verde: 90–110% (execução alinhada ao meta)
 * Amarelo: 75–90% ou 110–125% (desvio moderado)
 * Vermelho: <75% ou >125% (desvio crítico)
 */
function getIQColor(iq: number): {
    bg: string
    border: string
    text: string
    dot: string
    label: string
} {
    if (iq >= 90 && iq <= 110) {
        return {
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/40',
            text: 'text-emerald-400',
            dot: 'bg-emerald-500',
            label: 'Ótimo',
        }
    }
    if ((iq >= 75 && iq < 90) || (iq > 110 && iq <= 125)) {
        return {
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/40',
            text: 'text-amber-400',
            dot: 'bg-amber-500',
            label: 'Atenção',
        }
    }
    return {
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/40',
        text: 'text-rose-400',
        dot: 'bg-rose-500',
        label: 'Crítico',
    }
}

/**
 * IQBadge — exibe o Índice de Qualidade (IQ) com semáforo de cores.
 * Não renderiza nada quando iq === null (TM não configurado).
 * Memoizado para evitar re-renders desnecessários.
 */
const IQBadge = React.memo(function IQBadge({ iq, mated, prazoBase, className = '' }: IQBadgeProps) {
    if (iq === null) return null

    const cor = getIQColor(iq)
    const iqFormatado = iq.toFixed(1)

    const matedNatural = mated != null ? matedToNatural(mated, prazoBase) : null
    const titleText = mated != null
        ? `IQ ${iqFormatado}% | MATED ${mated.toFixed(3)} — ${matedNatural}`
        : `Índice de Qualidade: ${iqFormatado}% — TA/TM em área`

    return (
        <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${cor.bg} ${cor.border} ${className}`}
            title={titleText}
        >
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${cor.dot}`} />
            <span className={`text-xs font-bold font-mono ${cor.text}`}>
                IQ {iqFormatado}%
            </span>
            {mated != null && (
                <span
                    className={`text-[10px] font-mono ${cor.text} opacity-60`}
                    title={matedNatural ?? undefined}
                >
                    ·{mated.toFixed(3)}
                </span>
            )}
            <span className={`text-[10px] font-medium ${cor.text} opacity-70`}>
                {cor.label}
            </span>
        </div>
    )
})

export default IQBadge
export { IQBadge }
