import { SupabaseClient } from '@supabase/supabase-js'
import { checkCDTExistence, checkCETDupla } from './crisis'
import { getDefaultContingencia } from '../calibration/setor-config'
import { classificarCandidatoCEt, type ZonaOperacional } from './zones'

/**
 * Triângulo Atual (TA) — representa o estado atual de execução do projeto.
 *
 * Lados normalizados (podem ultrapassar 1.0 quando o projeto está além do baseline):
 * - E (Escopo)    : média de percentual_avanco das tarefas (normalizado 0.0–1.0)
 * - P (Prazo)     : dias_corridos / caminho_critico_baseline_dias
 *                   (> 1.0 quando o projeto ultrapassou o caminho crítico)
 * - O (Orçamento) : custo_acumulado / orcamento_operacional
 *                   orcamento_operacional = orcamento_total × (1 − percentual_contingencia/100)
 */
export interface TrianguloAtual {
    E: number
    P: number
    O: number
}

/** TA de fallback seguro — equilátero unitário (nenhuma crise geométrica) */
const TA_FALLBACK: TrianguloAtual = { E: 1.0, P: 1.0, O: 1.0 }

// ── Story 3.0-F: Histórico de zonas e velocidade de degradação ──────────────

/** Um ponto no histórico semanal de zonas operacionais do projeto. */
export interface HistoricoZona {
    semana: string           // 'YYYY-MM-DD' — segunda-feira da semana
    zona: ZonaOperacional
    distancia_nvo: number    // distância euclidiana de {P,O} a {1,1}
}

/** Resultado da regressão linear sobre o histórico de zonas. */
export interface VelocidadeDegradacao {
    tendencia: 'melhora' | 'estavel' | 'piora'
    /** null se projeto já em Zona Amarela ou pior, ou se melhorando */
    dias_ate_zona_amarela: number | null
    /** 0.0–1.0 baseado no número de pontos disponíveis */
    confianca: number
}

/**
 * Calcula a velocidade de degradação do projeto a partir do histórico de zonas.
 *
 * Codifica zona como numérico (verde=0, amarela=1, vermelha=2, cinza=3, nula=4)
 * e aplica OLS linear sobre os últimos 5–10 pontos.
 * Requer mínimo 3 pontos — abaixo retorna estavel com confianca=0.
 *
 * @roberta validou que janela de 5 pontos é suficiente para confiança aceitável (Story 3.0-F).
 */
export function calcularVelocidadeDegradacao(historico: HistoricoZona[]): VelocidadeDegradacao {
    if (historico.length < 3) {
        return { tendencia: 'estavel', dias_ate_zona_amarela: null, confianca: 0 }
    }

    // Usar os últimos 10 pontos em ordem cronológica
    const janela = historico.slice(-10)
    const n = janela.length

    // Codificação numérica da zona (0=saudável → 4=bloqueado)
    const ZONA_NUM: Record<ZonaOperacional, number> = {
        verde: 0, amarela: 1, vermelha: 2, cinza: 3, nula: 4,
    }
    const pontos = janela.map((h, i) => ({ x: i, y: ZONA_NUM[h.zona] }))

    // OLS: y = a·x + b
    const sumX  = pontos.reduce((s, p) => s + p.x, 0)
    const sumY  = pontos.reduce((s, p) => s + p.y, 0)
    const sumXY = pontos.reduce((s, p) => s + p.x * p.y, 0)
    const sumX2 = pontos.reduce((s, p) => s + p.x * p.x, 0)
    const denom = n * sumX2 - sumX * sumX

    if (denom === 0) {
        return { tendencia: 'estavel', dias_ate_zona_amarela: null, confianca: Math.min(1.0, (n - 2) / 8) }
    }

    const a = (n * sumXY - sumX * sumY) / denom   // slope (zona/semana)
    const b = (sumY - a * sumX) / n               // intercept

    // Tendência: limiar ±0.05 zona/semana
    const THRESHOLD = 0.05
    const tendencia: 'melhora' | 'estavel' | 'piora' =
        a > THRESHOLD  ? 'piora' :
        a < -THRESHOLD ? 'melhora' :
                         'estavel'

    // Confiança: escala de 3 pontos (mín) até 10 (máx)
    const confianca = Math.min(1.0, (n - 2) / 8)

    // Dias até Zona Amarela: resolver a·x + b = 1.0 → x = (1.0 - b) / a
    let dias_ate_zona_amarela: number | null = null
    const zonaAtual = pontos[n - 1].y
    if (tendencia === 'piora' && zonaAtual < 1.0 && a !== 0) {
        const xAmrela = (1.0 - b) / a
        const passosSemanas = xAmrela - (n - 1)
        if (passosSemanas > 0) {
            dias_ate_zona_amarela = Math.round(passosSemanas * 7)
        }
    }

    return { tendencia, dias_ate_zona_amarela, confianca }
}

/**
 * Calcula o MATED (distância euclidiana 3D) do TA em relação ao TM baseline.
 * TM default = equilátero unitário { E: 1, P: 1, O: 1 } (projeto no baseline ideal).
 *
 * Usada em ProjectContext para derivar `matedAtual` a cada recálculo do TA (Story 5.3).
 * "Se TM não disponível: usa o equilátero unitário como proxy seguro."
 */
export function calcularMATEDFromSides(
    ta: TrianguloAtual,
    tm: TrianguloAtual = { E: 1, P: 1, O: 1 }
): number {
    return Math.sqrt(
        Math.pow(ta.E - tm.E, 2) +
        Math.pow(ta.P - tm.P, 2) +
        Math.pow(ta.O - tm.O, 2)
    )
}

/** Retorna a data da segunda-feira da semana de `date` no formato 'YYYY-MM-DD'. */
function getMondayOfWeek(date: Date): string {
    const d = new Date(date)
    const day = d.getUTCDay()
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
    d.setUTCDate(diff)
    return d.toISOString().split('T')[0]
}

/**
 * Garante que um valor numérico é finito e dentro dos limites min/max.
 */
function clampSafe(value: number, min: number, max: number, fallback: number): number {
    if (!isFinite(value)) return fallback
    return Math.min(Math.max(value, min), fallback > max ? fallback : max)
}

/**
 * Verifica se os três lados formam um triângulo geometricamente válido (CEt).
 */
function validarCEt(E: number, P: number, O: number): boolean {
    return checkCDTExistence(E, O, P)
}

/**
 * Calcula dias corridos em calendário entre uma data de referência e hoje.
 * Retorna Math.max(0, ...) para garantir valor não-negativo.
 */
function calcDiasCorridos(dataRef: string): number {
    const ref = new Date(dataRef).getTime()
    if (isNaN(ref)) return 0
    return Math.max(0, Math.floor((Date.now() - ref) / 86_400_000))
}

/**
 * Recalcula o Triângulo Atual (TA) com base nos dados de execução do projeto.
 *
 * Denominadores (Story 3.0-B):
 * - Lado P: dias_corridos / caminho_critico_baseline_dias
 *   - dias_corridos = dias de calendário desde data_inicio_real (fallback: data_inicio)
 *   - caminho_critico_baseline_dias: imutável, snapshot do primeiro CPM
 *   - fallback final para baseline: prazo_total do TAP
 * - Lado O: custo_acumulado / orcamento_operacional
 *   - orcamento_operacional = orcamento_total × (1 − pct/100)
 *   - pct: percentual_contingencia do TAP (fallback: getDefaultContingencia())
 *
 * Nunca bloqueia saveProgresso(): fire-and-forget.
 * Em falha ou CEt inválida, retorna TA anterior ou TA_FALLBACK.
 */
export async function recalcularTA(
    projetoId: string,
    client: SupabaseClient,
    taAtual?: TrianguloAtual
): Promise<TrianguloAtual> {
    const fallback = taAtual ?? TA_FALLBACK

    try {
        // ─── Lado E: média de percentual_avanco das tarefas ───────────────────
        const { data: tarefas, error: tarefasError } = await client
            .from('tarefas')
            .select('id')
            .eq('projeto_id', projetoId)

        if (tarefasError || !tarefas || tarefas.length === 0) {
            return fallback
        }

        const tarefaIds = tarefas.map((t: { id: string }) => t.id)

        const { data: progressos, error: progressoError } = await client
            .from('progresso_tarefas')
            .select('tarefa_id, percentual_avanco, registrado_em')
            .in('tarefa_id', tarefaIds)
            .order('registrado_em', { ascending: false })

        if (progressoError) {
            console.warn('[execution] Erro ao buscar progressos:', progressoError.message)
            return fallback
        }

        const ultimoProgresso = new Map<string, number>()
        for (const row of (progressos ?? [])) {
            if (!ultimoProgresso.has(row.tarefa_id)) {
                ultimoProgresso.set(row.tarefa_id, row.percentual_avanco ?? 0)
            }
        }

        const percentuais = tarefaIds.map((id: string) => {
            return clampSafe((ultimoProgresso.get(id) ?? 0) / 100, 0, 1, 0)
        })

        const E = clampSafe(
            percentuais.reduce((acc: number, v: number) => acc + v, 0) / percentuais.length,
            0, 1, 0
        )

        // ─── Metadados do projeto (denominadores CDT) ─────────────────────────
        const { data: projeto, error: projetoError } = await client
            .from('projetos')
            .select('percentual_contingencia, data_inicio_real, data_inicio, prazo_total, caminho_critico_baseline_dias, orcamento_total')
            .eq('id', projetoId)
            .maybeSingle()

        if (projetoError) {
            console.warn('[execution] Erro ao buscar metadados do projeto:', projetoError.message)
        }

        // ─── Lado P: dias_corridos / caminho_critico_baseline_dias ────────────
        //
        // D-ARCH-1: dias_corridos = dias de calendário desde data_inicio_real.
        // D-ARCH-2: TA usa posição, não velocidade — sem conflito com TM.
        // P pode ser > 1.0 (projeto atrasado além do caminho crítico) — não clampar.
        let P: number

        const dataRefP = projeto?.data_inicio_real ?? projeto?.data_inicio ?? null
        if (!dataRefP) {
            console.warn('[execution] data_inicio_real e data_inicio ausentes — usando P = E como proxy de último recurso')
            P = E
        } else {
            const diasCorridos = calcDiasCorridos(dataRefP)
            if (projeto?.data_inicio_real == null && projeto?.data_inicio != null) {
                console.warn('[execution] data_inicio_real nulo — usando data_inicio planejada como fallback para Lado P')
            }

            const baselineDias = projeto?.caminho_critico_baseline_dias ?? projeto?.prazo_total ?? null
            if (baselineDias == null || baselineDias <= 0) {
                console.warn('[execution] caminho_critico_baseline_dias e prazo_total ausentes — usando P = E como proxy de último recurso')
                P = E
            } else {
                if (projeto?.caminho_critico_baseline_dias == null) {
                    console.warn('[execution] caminho_critico_baseline_dias nulo — usando prazo_total como fallback para denominador de P')
                }
                P = diasCorridos / baselineDias
                if (!isFinite(P) || P < 0) P = 0.01
            }
        }

        // ─── Lado O: custo_acumulado / orcamento_operacional ─────────────────
        let O = 1.0

        const pctContingencia = projeto?.percentual_contingencia ?? (() => {
            console.warn('[execution] percentual_contingencia nulo — usando default setorial via getDefaultContingencia()')
            return getDefaultContingencia()
        })()

        const orcamentoTotal: number = projeto?.orcamento_total ?? 0
        const orcamentoOperacional = orcamentoTotal > 0
            ? orcamentoTotal * (1 - pctContingencia / 100)
            : 0

        const { data: orcamento, error: orcamentoError } = await client
            .from('orcamentos')
            .select('custo_acumulado')
            .eq('projeto_id', projetoId)
            .maybeSingle()

        if (!orcamentoError && orcamento) {
            const custoAcumulado: number = orcamento.custo_acumulado ?? 0
            if (orcamentoOperacional > 0 && custoAcumulado > 0) {
                O = custoAcumulado / orcamentoOperacional
                if (!isFinite(O)) O = 1.0
            }
        }

        // ─── Construção do TA candidato ───────────────────────────────────────
        const eMin = Math.max(E, 0.01)
        const pMin = Math.max(P, 0.01)
        const oRaw = Math.max(O, 0.01)
        // Guarda CEt (|P-O| < E < P+O):
        // - Floor: O deve ser > |P-E| para garantir |P-O| < E
        // - Cap:   O deve ser < E+P  para garantir E+P > O
        const oFloor = Math.abs(pMin - eMin) + 0.01
        const oAjust = Math.max(oRaw, oFloor)
        const oCapped = Math.min(oAjust, (eMin + pMin) * 0.99)
        const candidato: TrianguloAtual = {
            E: eMin,
            P: pMin,
            O: Math.max(oCapped, 0.01),
        }

        // ─── Validação CEt ────────────────────────────────────────────────────
        if (!validarCEt(candidato.E, candidato.P, candidato.O)) {
            console.warn(
                `[execution] TA candidato falhou na CEt — E=${candidato.E.toFixed(3)}, P=${candidato.P.toFixed(3)}, O=${candidato.O.toFixed(3)}. Mantendo TA anterior.`
            )
            return fallback
        }

        // ─── Upsert historico_zonas (fire-and-forget, Story 3.0-F) ───────────
        // 1 registro por semana — ON CONFLICT DO UPDATE via unique(projeto_id, semana)
        const baselineDiasHZ = projeto?.caminho_critico_baseline_dias ?? projeto?.prazo_total ?? 1
        const prazoTotalHZ   = projeto?.prazo_total ?? baselineDiasHZ
        const classificacaoHZ = classificarCandidatoCEt(
            { P: candidato.P, O: candidato.O },
            {
                caminho_critico_baseline_dias: baselineDiasHZ,
                prazo_total_dias:              prazoTotalHZ,
                percentual_contingencia:       pctContingencia,
                orcamento_operacional:         orcamentoOperacional > 0 ? orcamentoOperacional : 1,
            }
        )
        const distanciaNvo = parseFloat(
            Math.sqrt(Math.pow(candidato.P - 1, 2) + Math.pow(candidato.O - 1, 2)).toFixed(4)
        )
        client.from('historico_zonas')
            .upsert(
                { projeto_id: projetoId, semana: getMondayOfWeek(new Date()), zona: classificacaoHZ.zona, distancia_nvo: distanciaNvo },
                { onConflict: 'projeto_id,semana' }
            )
            .then(({ error }: { error: { message: string } | null }) => {
                if (error) console.warn('[execution] Upsert historico_zonas falhou:', error.message)
            })

        return candidato

    } catch (err) {
        console.error('[execution] Erro inesperado em recalcularTA:', err)
        return fallback
    }
}
