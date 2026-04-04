/**
 * Pipeline Dual TM + TA — Sessão 29 (D-S29-04)
 *
 * Separa a geração do Triângulo Matriz (baseline) e Triângulo Atual (real).
 * Ambos usam a mesma função `gerarTrianguloCDT`, mas com curvas diferentes:
 * - TM: curvas planejadas (snapshot dia 0, imutável)
 * - TA: curvas reais de execução (recalculado a cada medição)
 *
 * Quando curvas reais não estão disponíveis, TA = TM (fallback seguro).
 *
 * Feature flag: ENABLE_TA_PIPELINE (default: false)
 */

import type { CDTResult } from './math'
import { gerarTrianguloCDT } from './math'
import { sintetizarClairaut } from './clairaut'
import type { PipelineSource, TAInput, CompensacaoBidirecionalResult, TransicaoEvento } from './types-sessao29'
import type { TipoProtocolo } from './clairaut'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PipelineDualInput {
    /** Curvas planejadas (baseline) */
    curvaCustoPlano: { x: number; y: number }[]
    curvaPrazoPlano: { x: number; y: number }[]
    /** Curvas reais de execução (opcionais — se ausentes, TA = TM) */
    curvaCustoReal?: { x: number; y: number }[]
    curvaPrazoReal?: { x: number; y: number }[]
    /** Dia atual do projeto */
    diaAtual: number
    /** Dia do baseline (default: 0) */
    diaBaseline?: number
    /** Área do baseline persistida */
    areaBaseline?: number
    /** Parâmetros comuns */
    nTarefasAtual?: number
    nTarefasBaseline?: number
    orcamentoBase?: number
    prazoBase?: number
}

export interface PipelineDualResult {
    /** Triângulo Matriz (baseline, imutável) */
    tm: CDTResult & { pipeline_source: 'tm' }
    /** Triângulo Atual (real ou fallback para TM) */
    ta: CDTResult & { pipeline_source: 'ta' }
    /** Se curvas reais foram usadas (true) ou fallback para planejadas (false) */
    usaCurvasReais: boolean
    /** Protocolo do TM */
    protocoloTM: TipoProtocolo
    /** Protocolo do TA */
    protocoloTA: TipoProtocolo
    /** Se os protocolos divergem (TM ≠ TA) */
    divergenciaProtocolo: boolean
    /** Discriminante pré-classificação do TA */
    preClassDiscTA?: number
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

/**
 * Executa o pipeline dual: gera TM (baseline) e TA (real) separadamente.
 *
 * O TM é sempre gerado com diaAtual=0 (snapshot do planejamento).
 * O TA é gerado com curvas reais se disponíveis, senão com as planejadas.
 *
 * Ambos passam pela mesma `gerarTrianguloCDT` — mesma fórmula, mesmos guards.
 */
export function executarPipelineDual(input: PipelineDualInput): PipelineDualResult {
    const {
        curvaCustoPlano, curvaPrazoPlano,
        curvaCustoReal, curvaPrazoReal,
        diaAtual, diaBaseline = 0,
        areaBaseline,
        nTarefasAtual, nTarefasBaseline,
        orcamentoBase, prazoBase,
    } = input

    // ─── TM (Baseline): sempre dia 0, curvas planejadas ──────────────────
    const tm = gerarTrianguloCDT({
        curvaCusto: curvaCustoPlano,
        curvaPrazo: curvaPrazoPlano,
        diaAtual: diaBaseline,
        nTarefasBaseline,
        nTarefasAtual: nTarefasBaseline, // no baseline, atual = baseline
        orcamentoBase,
        prazoBase,
    })

    // ─── TA: curvas reais se disponíveis, senão fallback para planejadas ──
    const usaCurvasReais = !!(
        curvaCustoReal && curvaCustoReal.length >= 2 &&
        curvaPrazoReal && curvaPrazoReal.length >= 2
    )

    const ta = gerarTrianguloCDT({
        curvaCusto: usaCurvasReais ? curvaCustoReal! : curvaCustoPlano,
        curvaPrazo: usaCurvasReais ? curvaPrazoReal! : curvaPrazoPlano,
        diaAtual,
        diaBaseline,
        areaBaseline: areaBaseline ?? tm.cdt_area, // usar área do TM como referência
        nTarefasAtual,
        nTarefasBaseline,
        orcamentoBase,
        prazoBase,
    })

    // ─── Protocolos ──────────────────────────────────────────────────────
    const protocoloTM = tm.protocolo ?? 'agudo'
    const protocoloTA = ta.protocolo ?? 'agudo'

    return {
        tm: { ...tm, pipeline_source: 'tm' as const },
        ta: { ...ta, pipeline_source: 'ta' as const },
        usaCurvasReais,
        protocoloTM,
        protocoloTA,
        divergenciaProtocolo: protocoloTM !== protocoloTA,
        preClassDiscTA: ta.pre_classificacao_disc,
    }
}

// ─── Detector de divergência ──────────────────────────────────────────────────

/**
 * Analisa a divergência entre TM e TA.
 * Retorna métricas de quanto o TA se afastou do TM.
 */
export function analisarDivergencia(
    tm: CDTResult,
    ta: CDTResult,
): {
    /** Delta percentual da área: (A_ta - A_tm) / A_tm × 100 */
    deltaAreaPct: number
    /** Deltas absolutos por lado */
    deltaE: number
    deltaC: number
    deltaP: number
    /** Qual lado mais desviou (normalizado) */
    ladoMaisCritico: 'E' | 'C' | 'P'
} {
    const tmArea = tm.cdt_area || 1e-9
    const deltaAreaPct = ((ta.cdt_area - tm.cdt_area) / tmArea) * 100

    const deltaE = ta.lados.escopo - tm.lados.escopo
    const deltaC = ta.lados.orcamento - tm.lados.orcamento
    const deltaP = ta.lados.prazo - tm.lados.prazo

    // Normalizar pelo baseline para comparação justa
    const normE = tm.lados.escopo > 0 ? Math.abs(deltaE) / tm.lados.escopo : 0
    const normC = tm.lados.orcamento > 0 ? Math.abs(deltaC) / tm.lados.orcamento : 0
    const normP = tm.lados.prazo > 0 ? Math.abs(deltaP) / tm.lados.prazo : 0

    const maxNorm = Math.max(normE, normC, normP)
    const ladoMaisCritico = maxNorm === normE ? 'E' : maxNorm === normC ? 'C' : 'P'

    return { deltaAreaPct, deltaE, deltaC, deltaP, ladoMaisCritico }
}
