/**
 * Pipeline CCPM — Orquestrador Automático
 *
 * Executa a cadeia completa quando 100% das estimativas chegaram:
 *   CPM → Corte Goldratt → Buffers RSS → TM → Fractais → Sierpinski → NVO
 *
 * O PM NÃO intervém. O motor calcula tudo e salva no banco.
 * PM só valida e coloca para rodar.
 *
 * Referência: FLUXO-CCPM-AURA.md, Etapa 5
 */

import { calculateCPMLocal, findAllCriticalPaths } from './cpm'
import { cortarEstimativa } from './ccpm'
import { calcularBufferRSS, calcularConsumoBuffer, truncarBufferCEt } from './buffer'
import { checkCETDupla } from './crisis'
import { areaHeron, calcularAngulos } from './fractals'
import { sintetizarClairaut } from './clairaut'
import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PipelineCCPMInput {
  projetoId: string
  tenantId: string
}

export interface PipelineCCPMResult {
  success: boolean
  prazo_agressivo: number
  prazo_ccpm: number
  project_buffer: number
  cost_buffer: number
  caminho_critico_dias: number
  tm: { E: number; P: number; C: number; area: number }
  fractais_count: number
  error?: string
}

interface TarefaDB {
  id: string
  nome: string
  duracao_estimada: number
  duracao_otimista: number | null
  custo_otimista: number | null
  custo_pessimista: number | null
  custo_estimado: number | null
  predecessoras: string[] | null
  sprint_id: string | null
  no_caminho_critico: boolean
  es: number
  ef: number
  ls: number
  lf: number
  folga_total: number
}

interface SprintDB {
  id: string
  nome: string
  ordem: number
  data_inicio: string | null
  data_fim: string | null
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

/**
 * Executa o pipeline CCPM completo.
 *
 * @param supabase - client com service_role (server-side)
 * @param input - projeto e tenant IDs
 */
export async function executarPipelineCCPM(
  supabase: SupabaseClient,
  input: PipelineCCPMInput
): Promise<PipelineCCPMResult> {
  const { projetoId, tenantId } = input

  try {
    // ── 1. Buscar dados ──────────────────────────────────────────────
    const [tarefasRes, sprintsRes, projetoRes] = await Promise.all([
      supabase.from('tarefas').select('*').eq('projeto_id', projetoId),
      supabase.from('sprints_fractais').select('*').eq('projeto_id', projetoId).order('ordem'),
      supabase.from('projetos').select('prazo_total, orcamento_total, horas_por_dia').eq('id', projetoId).single(),
    ])

    const tarefas: TarefaDB[] = tarefasRes.data ?? []
    const sprints: SprintDB[] = sprintsRes.data ?? []
    const projeto = projetoRes.data

    if (tarefas.length === 0) return { success: false, error: 'Sem tarefas', prazo_agressivo: 0, prazo_ccpm: 0, project_buffer: 0, cost_buffer: 0, caminho_critico_dias: 0, tm: { E: 0, P: 0, C: 0, area: 0 }, fractais_count: 0 }
    if (!projeto) return { success: false, error: 'Projeto não encontrado', prazo_agressivo: 0, prazo_ccpm: 0, project_buffer: 0, cost_buffer: 0, caminho_critico_dias: 0, tm: { E: 0, P: 0, C: 0, area: 0 }, fractais_count: 0 }

    const horasPorDia = Number(projeto.horas_por_dia) || 8
    const prazoTapHoras = (Number(projeto.prazo_total) || 60) * horasPorDia
    const orcamentoTotal = Number(projeto.orcamento_total) || 0

    // ── 2. CPM com durações pessimistas ──────────────────────────────
    const tarefasCPM = tarefas.map(t => ({
      id: t.id,
      nome: t.nome,
      duracao: Number(t.duracao_estimada) || 1, // pessimista
      dependencias: Array.isArray(t.predecessoras) ? t.predecessoras : [],
    }))

    const cpmResult = calculateCPMLocal(tarefasCPM)

    // ── 3. Identificar Cadeia Crítica ────────────────────────────────
    const criticas = cpmResult.filter(t => t.folga === 0)
    const caminhoCriticoDias = Math.max(...cpmResult.map(t => t.ef), 0)

    // ── 4. Corte Goldratt 50% (D1) ──────────────────────────────────
    const tarefasAgressivas = cpmResult.map(t => {
      const original = tarefas.find(o => o.id === t.id)
      const pessimista = t.duracao
      const otimista = Number(original?.duracao_otimista) || Math.ceil(pessimista * 0.6)
      const agressiva = cortarEstimativa(pessimista, otimista)
      return { ...t, duracao_agressiva: agressiva, duracao_original: pessimista, otimista }
    })

    // Recalcular CPM com durações agressivas
    const cpmAgressivo = calculateCPMLocal(
      tarefasAgressivas.map(t => ({
        id: t.id,
        nome: t.nome,
        duracao: t.duracao_agressiva,
        dependencias: t.dependencias,
      }))
    )
    const prazoAgressivo = Math.max(...cpmAgressivo.map(t => t.ef), 0)

    // ── 5. Buffer do Projeto (D2 — RSS) ──────────────────────────────
    const gordurasCC = tarefasAgressivas
      .filter(t => criticas.some(c => c.id === t.id))
      .map(t => Math.max(0, t.duracao_original - t.otimista))
    const projectBuffer = calcularBufferRSS(gordurasCC)
    const pbTruncado = truncarBufferCEt(projectBuffer, caminhoCriticoDias)

    // ── 6. Buffer de Custo (D6 — RSS) ────────────────────────────────
    const gordurasCusto = tarefas.map(t => {
      const pessimista = Number(t.custo_pessimista) || Number(t.custo_estimado) || 0
      const otimista = Number(t.custo_otimista) || Math.ceil(pessimista * 0.6)
      return Math.max(0, pessimista - otimista)
    })
    const costBuffer = calcularBufferRSS(gordurasCusto)
    const cbTruncado = truncarBufferCEt(costBuffer, orcamentoTotal)

    // ── 7. Prazo CCPM ────────────────────────────────────────────────
    const prazoCCPM = prazoAgressivo + pbTruncado

    // ── 8. Distribuir buffers por sprint ──────────────────────────────
    const totalDuracaoSprints = sprints.length || 1
    const bufferPorSprint = pbTruncado / totalDuracaoSprints

    for (const sprint of sprints) {
      await supabase
        .from('sprints_fractais')
        .update({ buffer_original: Math.ceil(bufferPorSprint), estado: 'futuro' })
        .eq('id', sprint.id)
    }
    // Primeiro sprint (mais perto do início) = ativo
    if (sprints.length > 0) {
      await supabase
        .from('sprints_fractais')
        .update({ estado: 'ativo' })
        .eq('id', sprints[0].id)
    }

    // ── 9. Construir TM ──────────────────────────────────────────────
    const E = 1.0
    const P = prazoCCPM / prazoTapHoras
    const C = orcamentoTotal > 0 ? (orcamentoTotal + cbTruncado) / orcamentoTotal : 1.0
    const area = areaHeron(E, P, C)

    // CEt dupla
    const cetResult = checkCETDupla(
      prazoTapHoras, orcamentoTotal, prazoCCPM,
      E, C, P
    )

    // ── 10. Salvar resultados no projeto ─────────────────────────────
    await supabase.from('projetos').update({
      caminho_critico_baseline_dias: Math.ceil(caminhoCriticoDias),
      status: 'execucao',
    }).eq('id', projetoId)

    // Salvar CPM nas tarefas
    for (const t of cpmAgressivo) {
      await supabase.from('tarefas').update({
        es: t.es,
        ef: t.ef,
        ls: t.ls,
        lf: t.lf,
        folga_total: t.folga,
        no_caminho_critico: t.folga === 0,
      }).eq('id', t.id)
    }

    // ── 11. Classificar Clairaut do TM ───────────────────────────────
    const [alpha, beta, gamma] = calcularAngulos(E, P, C)

    return {
      success: true,
      prazo_agressivo: prazoAgressivo,
      prazo_ccpm: prazoCCPM,
      project_buffer: pbTruncado,
      cost_buffer: cbTruncado,
      caminho_critico_dias: caminhoCriticoDias,
      tm: { E, P, C, area },
      fractais_count: sprints.length,
    }

  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
      prazo_agressivo: 0,
      prazo_ccpm: 0,
      project_buffer: 0,
      cost_buffer: 0,
      caminho_critico_dias: 0,
      tm: { E: 0, P: 0, C: 0, area: 0 },
      fractais_count: 0,
    }
  }
}

/**
 * Corta estimativa usando fator Goldratt (50%).
 * Se não tiver otimista, usa 60% do pessimista como proxy.
 */
function cortarEstimativaLocal(pessimista: number, otimista: number): number {
  return Math.max(1, Math.ceil(pessimista * 0.5))
}
