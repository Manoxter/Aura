/**
 * sdo.ts — Story 5.3: SDO (Score de Desfecho Objetivo)
 *
 * SDO = 40% × componente_area + 35% × componente_trajetoria + 25% × componente_benchmark
 * SDO ∈ [0, 1] onde 1 = desfecho ótimo.
 *
 * @roberta @clint: metodologia validada — pesos 40/35/25 e regressão linear para trajetória.
 * Breakdown salvo junto ao score para permitir recalculo retroativo se pesos mudarem.
 */

import { supabase } from '@/lib/supabase'

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface SDOResult {
  score: number
  componente_area: number
  componente_trajetoria: number
  componente_benchmark: number
}

// Pesos MetodoAura — armazenados com o score para rastreabilidade retroativa
const PESOS = { area: 0.40, trajetoria: 0.35, benchmark: 0.25 }

// ─── Funções internas dos 3 componentes ──────────────────────────────────────

/**
 * Componente Área (40%): proximidade entre área TA final e área TM.
 * `(1 - |area_TA - area_TM| / area_TM)` clampado em [0, 1].
 */
export function _componenteArea(areaTA: number, areaTM: number): number {
  if (areaTM <= 0) return 0.5 // sem baseline → neutro
  const desvio = Math.abs(areaTA - areaTM) / areaTM
  return Math.max(0, Math.min(1, 1 - desvio))
}

/**
 * Componente Trajetória (35%): regressão linear OLS nos pontos (t, MATED).
 * Coeficiente negativo (MATED caindo ao longo do tempo) = melhora = score alto.
 *
 * Normalização: `score = max(0, min(1, 0.5 - slope * 5))`
 * - slope ≈ -0.1 → score ≈ 1.0 (melhora forte)
 * - slope = 0.0  → score = 0.5 (neutro)
 * - slope ≈ +0.1 → score ≈ 0.0 (piora forte)
 *
 * Guard: < 2 pontos → retorna 0.5 (neutro, conforme risco documentado na story).
 */
export function _componenteTrajetoria(historico: { t: number; mated: number }[]): number {
  if (historico.length < 2) return 0.5

  const n = historico.length
  const somaX = historico.reduce((s, p) => s + p.t, 0)
  const somaY = historico.reduce((s, p) => s + p.mated, 0)
  const somaXY = historico.reduce((s, p) => s + p.t * p.mated, 0)
  const somaX2 = historico.reduce((s, p) => s + p.t * p.t, 0)

  const den = n * somaX2 - somaX * somaX
  if (den === 0) return 0.5

  const slope = (n * somaXY - somaX * somaY) / den
  return Math.max(0, Math.min(1, 0.5 - slope * 5))
}

/**
 * Componente Benchmark (25%): MATED final vs média do setor nos priors.
 * `1 - mated_projeto / mated_medio_setor + 0.5` clampado em [0, 1].
 * MATED menor que a média do setor = desempenho acima do esperado = score alto.
 *
 * Guard: mated_medio_setor = 0 → retorna 0.5 (neutro).
 */
export function _componenteBenchmark(matedFinal: number, matedMedioSetor: number): number {
  if (matedMedioSetor <= 0) return 0.5
  const ratio = matedFinal / matedMedioSetor
  return Math.max(0, Math.min(1, 1 - ratio + 0.5))
}

// ─── Função principal ─────────────────────────────────────────────────────────

/**
 * Calcula o SDO (Score de Desfecho Objetivo) para um projeto ao arquivar.
 *
 * @param projetoId  - UUID do projeto
 * @param client     - Cliente Supabase (injetável para testes; usa singleton por padrão)
 */
export async function calcularSDO(
  projetoId: string,
  client: unknown = supabase
): Promise<SDOResult> {
  const db = client as typeof supabase

  // ── 1. Buscar dados do projeto: área atual, área baseline, setor ─────────
  const { data: projeto } = await db
    .from('projetos')
    .select('cdt_area_atual, cdt_area_baseline, setor')
    .eq('id', projetoId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const areaTA = (projeto as any)?.cdt_area_atual ?? 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const areaTM = (projeto as any)?.cdt_area_baseline ?? 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setor: string = (projeto as any)?.setor ?? 'geral'

  // ── 2. Componente Área ────────────────────────────────────────────────────
  const componente_area = _componenteArea(areaTA, areaTM)

  // ── 3. Componente Trajetória — histórico MATED via mated_history ──────────
  // mated_history armazena snapshots de assertividade ao longo do tempo
  const { data: snapshots } = await db
    .from('mated_history')
    .select('assertividade, created_at')
    .eq('projeto_id', projetoId)
    .order('created_at', { ascending: true })

  // Converter assertividade → proxy MATED (assertividade alta = MATED baixo)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const historico = ((snapshots as any[]) ?? []).map((s, i) => ({
    t: i,
    mated: Math.max(0, 1 - (Number(s.assertividade) / 100)),
  }))

  const componente_trajetoria = _componenteTrajetoria(historico)

  // ── 4. Componente Benchmark — mated_medio do setor nos priors ─────────────
  // Busca priors do setor em aura_calibration_events (projeto_id = NULL, tipo = 'prior')
  const { data: priors } = await db
    .from('aura_calibration_events')
    .select('mated_medio')
    .is('projeto_id', null)
    .eq('setor', setor)
    .eq('tipo', 'prior')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priorsComValor = ((priors as any[]) ?? []).filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => p.mated_medio != null
  )
  const matedMedioSetor =
    priorsComValor.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? priorsComValor.reduce((s: number, p: any) => s + Number(p.mated_medio), 0) /
        priorsComValor.length
      : 0

  // MATED final = último snapshot convertido, ou fallback 0.1 (bom projeto)
  const matedFinal =
    historico.length > 0 ? historico[historico.length - 1].mated : 0.1

  const componente_benchmark = _componenteBenchmark(matedFinal, matedMedioSetor)

  // ── 5. Score SDO ponderado ────────────────────────────────────────────────
  const score =
    PESOS.area * componente_area +
    PESOS.trajetoria * componente_trajetoria +
    PESOS.benchmark * componente_benchmark

  const resultado: SDOResult = {
    score: Math.round(score * 10000) / 10000,
    componente_area: Math.round(componente_area * 10000) / 10000,
    componente_trajetoria: Math.round(componente_trajetoria * 10000) / 10000,
    componente_benchmark: Math.round(componente_benchmark * 10000) / 10000,
  }

  // ── 6. Persistir sdo_score + sdo_breakdown em aura_calibration_events ─────
  await db.from('aura_calibration_events').insert({
    projeto_id: projetoId,
    tipo: 'empirico',
    fonte: 'sistema',
    sdo_score: resultado.score,
    sdo_breakdown: {
      pesos: PESOS,
      componentes: {
        area: resultado.componente_area,
        trajetoria: resultado.componente_trajetoria,
        benchmark: resultado.componente_benchmark,
      },
    },
    arquivado_em: new Date().toISOString(),
  })

  return resultado
}
