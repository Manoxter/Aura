'use client'

import { CDTResult } from '@/lib/engine/math'
import { translateLabel, type MetricMode } from '@/lib/translation/MetricTranslator'

// ═══════════════════════════════════════════════════════════════════════════
// MetricTranslator — Traduz metricas adimensionais CDT para linguagem PM/PO
// ═══════════════════════════════════════════════════════════════════════════

export type TranslatedMetrics = {
    qualidade_pct: number | null
    qualidade_label: string
    qualidade_cor: 'otimo' | 'risco' | 'crise' | 'slate'
    custo_narrativa: string
    prazo_narrativa: string
    cet_narrativa: string
    zona_label: string
    zona_cor: 'otimo' | 'seguro' | 'risco' | 'crise'
    prescricao: string | null
}

/**
 * Traduz um CDTResult em metricas compreensiveis para PM/PO.
 * Nenhum jargao matematico — apenas linguagem de gestao de projetos.
 */
export function translateCDT(cdt: CDTResult, orcamentoBase?: number, prazoBase?: number): TranslatedMetrics {
    const { lados_brutos, cet, desvio_qualidade } = cdt

    // Qualidade
    const qualidade_pct = desvio_qualidade
    let qualidade_label: string
    let qualidade_cor: TranslatedMetrics['qualidade_cor']
    if (qualidade_pct === null) {
        qualidade_label = 'Sem baseline definido'
        qualidade_cor = 'slate'
    } else if (qualidade_pct >= 85) {
        qualidade_label = 'Saudavel'
        qualidade_cor = 'otimo'
    } else if (qualidade_pct >= 60) {
        qualidade_label = 'Atencao'
        qualidade_cor = 'risco'
    } else {
        qualidade_label = 'Critico'
        qualidade_cor = 'crise'
    }

    // Custo
    const custoRatio = lados_brutos.C
    let custo_narrativa: string
    if (custoRatio <= 1.05) {
        custo_narrativa = 'Ritmo de custo dentro do planejado.'
    } else if (custoRatio <= 1.3) {
        custo_narrativa = `Ritmo de custo ${((custoRatio - 1) * 100).toFixed(0)}% acima do baseline.`
    } else {
        custo_narrativa = `Ritmo de custo ${((custoRatio - 1) * 100).toFixed(0)}% acima do baseline — risco de estouro.`
    }
    if (orcamentoBase && custoRatio > 1.1) {
        const excesso = orcamentoBase * (custoRatio - 1)
        custo_narrativa += ` Excesso projetado: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(excesso)}.`
    }

    // Prazo
    const prazoRatio = lados_brutos.P
    let prazo_narrativa: string
    if (prazoRatio <= 1.05) {
        prazo_narrativa = 'Cronograma dentro do planejado.'
    } else if (prazoRatio <= 1.3) {
        prazo_narrativa = `Cronograma ${((prazoRatio - 1) * 100).toFixed(0)}% acima do baseline.`
    } else {
        prazo_narrativa = `Cronograma ${((prazoRatio - 1) * 100).toFixed(0)}% acima do baseline — risco de atraso critico.`
    }
    if (prazoBase && prazoRatio > 1.1) {
        const diasExcesso = Math.round(prazoBase * (prazoRatio - 1))
        prazo_narrativa += ` Atraso projetado: ${diasExcesso} dias.`
    }

    // CEt
    let cet_narrativa: string
    if (cet.valida) {
        cet_narrativa = 'O projeto e geometricamente viavel — escopo, custo e prazo coexistem.'
    } else {
        const report = cet.report
        cet_narrativa = `Crise geometrica: ${report.causa_raiz?.[0] || 'Impossivel manter escopo, custo e prazo simultaneamente.'}`
    }

    // Zona MATED
    const zona = cdt.zona_mated || 'CRISE'
    const zonaMap: Record<string, { label: string; cor: TranslatedMetrics['zona_cor'] }> = {
        OTIMO: { label: 'Zona Otima — equilibrio ideal', cor: 'otimo' },
        SEGURO: { label: 'Zona Segura — dentro da resiliencia', cor: 'seguro' },
        RISCO: { label: 'Zona de Risco — margem reduzida', cor: 'risco' },
        CRISE: { label: 'Zona de Crise — acao imediata necessaria', cor: 'crise' },
    }
    const zonaInfo = zonaMap[zona] || zonaMap.CRISE

    // Prescricao
    let prescricao: string | null = null
    if (!cet.valida || (qualidade_pct !== null && qualidade_pct < 60)) {
        const desvios = []
        if (custoRatio > 1.2) desvios.push(`reduzir ritmo de custo em ${((custoRatio - 1) * 100).toFixed(0)}%`)
        if (prazoRatio > 1.2) desvios.push(`recuperar ${((prazoRatio - 1) * 100).toFixed(0)}% do cronograma`)
        if (desvios.length === 0) desvios.push('revisar escopo e recursos')
        prescricao = `Para restaurar equilibrio: ${desvios.join(' OU ')}.`
    }

    return {
        qualidade_pct,
        qualidade_label,
        qualidade_cor,
        custo_narrativa,
        prazo_narrativa,
        cet_narrativa,
        zona_label: zonaInfo.label,
        zona_cor: zonaInfo.cor,
        prescricao,
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Componentes React
// ═══════════════════════════════════════════════════════════════════════════

const COR_MAP = {
    otimo: { bg: 'bg-zona-otimo-bg', border: 'border-zona-otimo-border', text: 'text-zona-otimo-text', fill: 'bg-zona-otimo' },
    seguro: { bg: 'bg-zona-seguro-bg', border: 'border-zona-seguro-border', text: 'text-zona-seguro-text', fill: 'bg-zona-seguro' },
    risco: { bg: 'bg-zona-risco-bg', border: 'border-zona-risco-border', text: 'text-zona-risco-text', fill: 'bg-zona-risco' },
    crise: { bg: 'bg-zona-crise-bg', border: 'border-zona-crise-border', text: 'text-zona-crise-text', fill: 'bg-zona-crise' },
    slate: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', fill: 'bg-slate-500' },
}

/**
 * QualityGauge — Exibe "Qualidade: 87%" com gauge visual e semaforo.
 */
export function QualityGauge({ metrics }: { metrics: TranslatedMetrics }) {
    const cores = COR_MAP[metrics.qualidade_cor]
    const pct = metrics.qualidade_pct ?? 0
    const clampedPct = Math.max(0, Math.min(100, pct))

    return (
        <div className={`${cores.bg} border ${cores.border} rounded-2xl p-6`}>
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Qualidade do Projeto</h4>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cores.bg} ${cores.text}`}>
                    {metrics.qualidade_label}
                </span>
            </div>
            <div className={`text-4xl font-bold font-mono ${cores.text} mb-3`}>
                {metrics.qualidade_pct !== null ? `${pct.toFixed(1)}%` : '—'}
            </div>
            <div className="h-2 w-full bg-surface-raised rounded-full overflow-hidden">
                <div
                    className={`h-full ${cores.fill} rounded-full transition-all duration-700`}
                    style={{ width: `${clampedPct}%` }}
                />
            </div>
            <p className="text-xs text-slate-500 mt-2">
                Baseado na area do Triangulo de Qualidade (MetodoAura)
            </p>
        </div>
    )
}

/**
 * HealthBadge — Semaforo compacto para uso inline.
 */
export function HealthBadge({ metrics }: { metrics: TranslatedMetrics }) {
    const cores = COR_MAP[metrics.zona_cor]
    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${cores.bg} border ${cores.border}`}>
            <div className={`h-2 w-2 rounded-full ${cores.fill} animate-pulse`} />
            <span className={`text-xs font-bold ${cores.text}`}>{metrics.zona_label}</span>
        </div>
    )
}

/**
 * CDTNarrative — Card completo com todas as narrativas traduzidas.
 * Story 5.7: aceita `mode` para traduzir labels (padrão 'pm').
 */
export function CDTNarrative({ metrics, mode = 'pm' }: { metrics: TranslatedMetrics; mode?: MetricMode }) {
    const labelMATED = translateLabel('MATED', mode)
    const labelE = translateLabel('E', mode)
    const labelO = translateLabel('O', mode)
    const labelP = translateLabel('P', mode)

    return (
        <div className="space-y-4">
            <QualityGauge metrics={metrics} />

            <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Diagnostico — {labelMATED}</h4>

                <div className="space-y-2 text-sm">
                    <p className="text-slate-300">
                        <span className="text-cdt-custo font-mono mr-2">{labelO}</span>
                        {metrics.custo_narrativa}
                    </p>
                    <p className="text-slate-300">
                        <span className="text-cdt-prazo font-mono mr-2">{labelP}</span>
                        {metrics.prazo_narrativa}
                    </p>
                    <p className={`${metrics.cet_narrativa.includes('Crise') ? 'text-zona-crise-text' : 'text-slate-300'}`}>
                        <span className="text-cdt-escopo font-mono mr-2">{labelE}</span>
                        {metrics.cet_narrativa}
                    </p>
                </div>
            </div>

            {metrics.prescricao && (
                <div className="bg-zona-crise-bg border border-zona-crise-border rounded-2xl p-5">
                    <h4 className="text-xs font-bold text-zona-crise-text uppercase tracking-widest mb-2">Prescricao</h4>
                    <p className="text-sm text-zona-crise-text/80">{metrics.prescricao}</p>
                </div>
            )}

            <HealthBadge metrics={metrics} />
        </div>
    )
}
