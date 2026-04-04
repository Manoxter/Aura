// ═══════════════════════════════════════════════════════════════════════════
// cdt-labels.ts — Fonte única de verdade para nomenclatura CDT
// Story DS-6 — Design System: Labels Semânticos CDT
//
// Delegação: MetricTranslator é a autoridade matemática (Story 5.7).
// Esta constante expõe shapes de labels prontos para JSX:
//   - CDT_LABELS[key].curto  → "Escopo"
//   - CDT_LABELS[key].longo  → "Escopo (E)"
//   - CDT_LABELS[key].simbolo → "E"
//   - CDT_LABELS[key].tooltip → descrição de uma linha
//
// Regra: importe de METRIC_LABELS/METRIC_TOOLTIPS (MetricTranslator) para
// os textos PM — CDT_LABELS reutiliza essas strings sem duplicação.
// ═══════════════════════════════════════════════════════════════════════════

import {
    METRIC_LABELS,
    METRIC_TOOLTIPS,
} from '@/lib/translation/MetricTranslator'

// ─── Tipos ────────────────────────────────────────────────────────────────

export type CDTDimensao = 'E' | 'P' | 'O' | 'MATED'

export type CDTLabelEntry = {
    /** Símbolo técnico: "E", "P", "O", "⬡" */
    simbolo: string
    /** Nome curto PM: "Escopo", "Prazo", "Orçamento", "Desvio" */
    curto: string
    /** Nome longo PM com símbolo: "Escopo (E)" */
    longo: string
    /** Tooltip de uma linha para UI */
    tooltip: string
}

export type ZonaMATED = 'OTIMO' | 'SEGURO' | 'RISCO' | 'CRISE'

export type ZonaLabelEntry = {
    /** Nome por extenso da zona */
    nome: string
    /** Descrição curta da situação */
    descricao: string
    /** Ícone semântico para uso em badges */
    icone: string
    /** Token de cor Tailwind base (sem prefixo text-/bg-) */
    cor: string
}

// ─── CDT_LABELS ──────────────────────────────────────────────────────────

/**
 * CDT_LABELS — nomenclatura canônica de cada dimensão CDT para apresentação.
 *
 * Fonte de verdade única: use esta constante em JSX.
 * Textos delegados ao MetricTranslator (Story 5.7) para consistência.
 *
 * @example
 * // Vertex label
 * <span>{CDT_LABELS.E.longo}</span>  // → "Escopo (E)"
 * // Tooltip
 * title={CDT_LABELS.P.tooltip}
 */
export const CDT_LABELS = {
    E: {
        simbolo: 'E',
        curto: METRIC_LABELS.E.pm,                     // 'Escopo'
        longo: `${METRIC_LABELS.E.pm} (E)`,            // 'Escopo (E)'
        tooltip: METRIC_TOOLTIPS.E.pm,                  // 'Escopo: proporção de tarefas...'
    },
    P: {
        simbolo: 'P',
        curto: METRIC_LABELS.P.pm,                     // 'Prazo'
        longo: `${METRIC_LABELS.P.pm} (P)`,            // 'Prazo (P)'
        tooltip: METRIC_TOOLTIPS.P.pm,                  // 'Prazo: aderência ao cronograma...'
    },
    O: {
        simbolo: 'O',
        curto: METRIC_LABELS.O.pm,                     // 'Orçamento'
        longo: `${METRIC_LABELS.O.pm} (O)`,            // 'Orçamento (O)'
        tooltip: METRIC_TOOLTIPS.O.pm,                  // 'Orçamento: proporção do custo...'
    },
    MATED: {
        simbolo: '⬡',
        curto: 'Desvio',
        longo: METRIC_LABELS.MATED.pm,                 // 'Índice de Qualidade'
        tooltip: METRIC_TOOLTIPS.MATED.pm,              // 'Índice de Desvio da Qualidade...'
    },
} as const satisfies Record<CDTDimensao, CDTLabelEntry>

// ─── ZONA_LABELS ──────────────────────────────────────────────────────────

/**
 * ZONA_LABELS — nomenclatura canônica das 4 zonas MATED.
 *
 * Use em badges, alerts e qualquer indicador de zona.
 * A cor é o token base (ex: 'emerald') — aplique com prefixo Tailwind:
 *   `text-${ZONA_LABELS.OTIMO.cor}-400`, `bg-${ZONA_LABELS.OTIMO.cor}-500/10`
 *
 * @example
 * const z = ZONA_LABELS[zona_mated]
 * <span>{z.icone} {z.nome}</span>
 */
export const ZONA_LABELS = {
    OTIMO: {
        nome: 'Ótimo',
        descricao: 'Projeto sob controle total',
        icone: '✅',
        cor: 'emerald',
    },
    SEGURO: {
        nome: 'Seguro',
        descricao: 'Desvio leve — monitorar',
        icone: '🔵',
        cor: 'blue',
    },
    RISCO: {
        nome: 'Risco',
        descricao: 'Desvio significativo — agir',
        icone: '⚠️',
        cor: 'yellow',
    },
    CRISE: {
        nome: 'Crise',
        descricao: 'Desvio crítico — intervenção urgente',
        icone: '🔴',
        cor: 'red',
    },
} as const satisfies Record<ZonaMATED, ZonaLabelEntry>
