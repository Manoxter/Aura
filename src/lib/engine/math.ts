import { Tarefa, CETDuplaResult } from '../types'
import { checkCDTExistence, generateCrisisReport, checkCETDupla } from './crisis'
import { getSigmaSync } from '../calibration/sigma-manager'
import { getDefaultContingencia } from '../calibration/setor-config'
import { projectPointToLine } from './triangle-logic'
import { sintetizarClairaut } from './clairaut'
import { clampCos } from './guards'
// ancora-semantica.ts mantido como módulo independente (testes + futura ativação)
// Metadado semântico exportado diretamente no CDTResult.ancora
export type { CETDuplaResult } from '../types'

// ─── Story 1.7: Projeção CDT (+5 dias) Validada contra CEt ───────────────────

/**
 * Resultado da projeção linear de +N dias para o CDT,
 * validada pela CEt Dupla antes de ser exibida ao usuário.
 */
export interface ProjecaoCDT {
    E: number
    C: number
    P: number
    diasProjetados: number
    cetValida: boolean
    cetViolacao?: { violatedSide: 'E' | 'P' | 'O'; stage: 'pre' | 'post' }
}

/**
 * Projeta os lados do CDT linearmente por `deltaDias` (default: 5)
 * e valida o triângulo projetado com `checkCETDupla`.
 *
 * Projeção linear: cada lado cresce proporcionalmente à taxa diária estimada
 * como `(ladoAtual - 1.0) / diaAtual` (desvio acumulado por dia desde o baseline).
 * Quando diaAtual === 0, assume taxa zero (projeto no baseline).
 *
 * @param ladosAtuais - Lados BRUTOS do triângulo atual (E, C, P)
 * @param diaAtual    - Dia atual do projeto (para estimar taxa diária)
 * @param deltaDias   - Horizonte de projeção em dias (default: 5)
 * @returns ProjecaoCDT com os lados projetados e flag de validade CEt
 */
export function validarProjecaoCEt(
    ladosAtuais: { E: number; C: number; P: number },
    diaAtual: number,
    deltaDias: number = 5
): ProjecaoCDT {
    const { E, C, P } = ladosAtuais

    // Sessão 29 (fix C2): Taxa relativa de variação por dia.
    // Não assume baseline equilátero (E=C=P=1). Usa o lado atual como base.
    // Para E=1.2 no dia 50 com baseline E=1.0: taxa = (1.2-1.0)/50 = 0.004/dia
    // Para E escaleno no baseline: taxa baseada no desvio do valor normalizado (En=1.0)
    const taxaE = diaAtual > 0 ? (E - 1.0) / diaAtual : 0
    const taxaC = diaAtual > 0 ? (C - 1.0) / diaAtual : 0
    const taxaP = diaAtual > 0 ? (P - 1.0) / diaAtual : 0
    // Nota: E é normalizado (En=1.0 sempre), então (E-1.0) mede desvio do escopo.
    // C e P são sqrt(1+mc²) e sqrt(1+mp²), portanto C-1.0 e P-1.0 medem desvio
    // em relação ao triângulo de referência (C=P=1 quando slopes=0).
    // Este cálculo é CORRETO para o MetodoAura v4.0 — a normalização E=1 garante
    // que o baseline é sempre 1.0 para todos os lados quando slope=0.

    // Projeção linear: ladoAtual + taxa * deltaDias, clampado em 0.01
    const E_proj = Math.max(0.01, E + taxaE * deltaDias)
    const C_proj = Math.max(0.01, C + taxaC * deltaDias)
    const P_proj = Math.max(0.01, P + taxaP * deltaDias)

    // Normalização: Escopo como âncora constante (MetodoAura §2.1)
    const En = 1.0
    const Cn = E_proj > 0 ? C_proj / E_proj : C_proj
    const Pn = E_proj > 0 ? P_proj / E_proj : P_proj

    // Validação CEt Dupla (Story 1.1): pré e pós-normalização
    const dupla = checkCETDupla(E_proj, C_proj, P_proj, En, Cn, Pn)

    if (!dupla.valid) {
        return {
            E: E_proj,
            C: C_proj,
            P: P_proj,
            diasProjetados: deltaDias,
            cetValida: false,
            cetViolacao: { violatedSide: dupla.violatedSide, stage: dupla.stage },
        }
    }

    return {
        E: E_proj,
        C: C_proj,
        P: P_proj,
        diasProjetados: deltaDias,
        cetValida: true,
    }
}

// CPM Legacy Wrapper
export function calculateCPM(tarefas: Tarefa[]) {
    const forward = forwardPass(tarefas)
    const backward = backwardPass(forward)
    return backward
}

// CDT Legacy Wrapper
export function calculateCDT(scope: number, time: number, cost: number) {
    // Simulates a basic normalized triangle
    const Area = (scope * time * cost) / 2
    return {
        A: [0, 0],
        B: [cost, 0],
        C: [cost / 2, time],
        Baricentro: [cost / 2, time / 3],
        Area,
        BaseArea: 0.433
    }
}

// CPM
export function forwardPass(tarefas: Tarefa[], dataInicio?: string | null) {
    const sorted = [...tarefas].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    sorted.forEach(t => {
        const preds = (t.predecessoras || []).map(pid => sorted.find(x => x.id === pid)).filter(Boolean) as Tarefa[]
        t.es = preds.length === 0 ? 0 : Math.max(...preds.map(p => p.ef || 0))
        t.ef = t.es + t.duracao_estimada
        
        // Âncora Temporal Absoluta
        if (dataInicio) {
            const baseDate = new Date(dataInicio)
            const startDate = new Date(baseDate)
            startDate.setDate(baseDate.getDate() + (t.es || 0))
            const endDate = new Date(baseDate)
            endDate.setDate(baseDate.getDate() + (t.ef || 0))
            
            t.data_inicio_real = startDate.toISOString().split('T')[0]
            t.data_fim_real = endDate.toISOString().split('T')[0]
        }
    })
    return sorted
}

export function backwardPass(tarefas: Tarefa[]) {
    const duracaoTotal = Math.max(...tarefas.map(t => t.ef || 0))
    const sorted = [...tarefas].sort((a, b) => (b.ef || 0) - (a.ef || 0))
    
    sorted.forEach(t => {
        const succs = tarefas.filter(s => (s.predecessoras || []).includes(t.id))
        t.lf = succs.length === 0 ? duracaoTotal : Math.min(...succs.map(s => s.ls || 0))
        t.ls = t.lf - t.duracao_estimada
        t.folga_total = t.ls - (t.es || 0)
        t.no_caminho_critico = t.folga_total === 0
    })

    // Lógica Aura Pro: Identificação de Caminhos e Desempate (Tie-breaker)
    // Se múltiplas ramificações são críticas, marcamos o 'Soberano' pelo critério de maior tarefa individual.
    const caminhosCriticos = identificarCaminhosCriticos(tarefas)
    if (caminhosCriticos.length > 1) {
        // Ordena caminhos pela maior tarefa individual neles contida
        caminhosCriticos.sort((a, b) => {
            const maxA = Math.max(...a.map(tid => tarefas.find(t => t.id === tid)?.duracao_estimada || 0))
            const maxB = Math.max(...b.map(tid => tarefas.find(t => t.id === tid)?.duracao_estimada || 0))
            return maxB - maxA
        })
        
        // O primeiro caminho em caminhosCriticos[0] é o soberano.
        // Opcional: poderíamos adicionar um campo 'rank_critico' nas tarefas.
    }
    
    return sorted
}

function identificarCaminhosCriticos(tarefas: Tarefa[]): string[][] {
    const nodesCriticos = tarefas.filter(t => t.no_caminho_critico)
    const caminhos: string[][] = []

    function findPath(currentId: string, currentPath: string[]) {
        const successors = tarefas.filter(t => (t.predecessoras || []).includes(currentId) && t.no_caminho_critico)
        if (successors.length === 0) {
            caminhos.push([...currentPath, currentId])
            return
        }
        successors.forEach(s => findPath(s.id, [...currentPath, currentId]))
    }

    const starts = nodesCriticos.filter(t => t.es === 0)
    starts.forEach(s => findPath(s.id, []))
    
    return caminhos
}

// OLS Global com tratamento de Setup Jump
export function regressaoOLS(pontos: { x: number, y: number }[], setupJump: boolean = false) {
    let dataset = [...pontos]
    let interceptAdjustment = 0

    if (setupJump && dataset.length > 1 && dataset[0].x === 0) {
        // Ignora o ponto inicial (setup) para o cálculo da inclinação
        // mas guarda o valor para o intercepto
        interceptAdjustment = dataset[0].y
        dataset = dataset.slice(1)
    }

    const n = dataset.length
    if (n === 0) return { a: 0, b: interceptAdjustment }
    
    const somaX = dataset.reduce((s, p) => s + p.x, 0)
    const somaY = dataset.reduce((s, p) => s + p.y, 0)
    const somaXY = dataset.reduce((s, p) => s + p.x * p.y, 0)
    const somaX2 = dataset.reduce((s, p) => s + p.x * p.x, 0)
    
    const den = n * somaX2 - somaX * somaX
    if (den === 0) return { a: 0, b: interceptAdjustment || (somaY / n) }
    
    const a = (n * somaXY - somaX * somaY) / den // intensidade real (excluindo o salto de setup)
    const b = (somaY - a * somaX) / n
    
    return { a, b, sinalizacao: setupJump ? "Ajustado por Setup Jump (Dia 0 ignorado na inclinação)" : undefined }
}

// Ponderada
export function regressaoPonderada(pontos: { x: number, y: number }[]) {
    const n = pontos.length
    if (n === 0) return { a: 0, b: 0 }
    const pesos = pontos.map((p, i) => ((i + 1) / n) * (p.y > 0 ? 1.5 : 1.0))
    const somaW = pesos.reduce((s, w) => s + w, 0)
    const somaWX = pontos.reduce((s, p, i) => s + pesos[i] * p.x, 0)
    const somaWY = pontos.reduce((s, p, i) => s + pesos[i] * p.y, 0)
    const somaWXY = pontos.reduce((s, p, i) => s + pesos[i] * p.x * p.y, 0)
    const somaWX2 = pontos.reduce((s, p, i) => s + pesos[i] * p.x * p.x, 0)
    const den = somaW * somaWX2 - somaWX * somaWX
    if (den === 0) return { a: 0, b: 0 }
    const a = (somaW * somaWXY - somaWX * somaWY) / den
    const b = (somaWY - a * somaWX) / somaW
    return { a, b }
}

// ─── Story 1.8: Zeros Murphy vs Zeros Planejados (G7) ────────────────────────

export type ClassificacaoZero = 'normal' | 'murphy' | 'planejado'

/**
 * Classifica cada ponto da série com um peso para regressão:
 * - normal (y > 0): peso 1.0
 * - murphy (y = 0, não planejado): peso 1.8 — paralisação não-prevista penaliza a tendência
 * - planejado (y = 0, dia está em diasPlanejados): peso 0.0 — excluído da regressão
 *
 * @param pontos - Série temporal { x: dia, y: valor }
 * @param diasPlanejados - Set de números de dia que são feriados/recessos planejados
 */
export function classificarZerosMurphy(
    pontos: { x: number; y: number }[],
    diasPlanejados: Set<number> = new Set()
): { ponto: { x: number; y: number }; peso: number; tipo: ClassificacaoZero }[] {
    return pontos.map(p => {
        if (p.y !== 0) return { ponto: p, peso: 1.0, tipo: 'normal' as const }
        if (diasPlanejados.has(Math.round(p.x))) return { ponto: p, peso: 0.0, tipo: 'planejado' as const }
        return { ponto: p, peso: 1.8, tipo: 'murphy' as const }
    })
}

/**
 * Regressão ponderada com distinção Murphy/planejado.
 * Murphy zeros recebem peso 1.8 (puxam a inclinação para cima).
 * Zeros planejados são excluídos (peso 0).
 * Combina peso Murphy com recência (pontos mais recentes têm mais peso).
 *
 * @status UTILITÁRIO DISPONÍVEL — NÃO INTEGRADO ao pipeline CDT (FIX-B3 decisão Opção B, 2026-03-25)
 * @note Peso 1.8 é convenção interna sem base formal no MetodoAura.md.
 *       Integração ao pipeline adiada para v7.0 quando MetodoAura formalizar zeros Murphy.
 *       Pipeline atual usa regressaoOLS em P do TM conforme MASTERPLAN Passo 1.
 */
export function regressaoPonderadaMurphy(
    pontos: { x: number; y: number }[],
    diasPlanejados: Set<number> = new Set()
): { a: number; b: number; nMurphy: number; nPlanejado: number } {
    const classificados = classificarZerosMurphy(pontos, diasPlanejados)
    const ativos = classificados.filter(c => c.peso > 0)
    const nMurphy = classificados.filter(c => c.tipo === 'murphy').length
    const nPlanejado = classificados.filter(c => c.tipo === 'planejado').length

    if (ativos.length === 0) return { a: 0, b: 0, nMurphy, nPlanejado }

    const n = ativos.length
    // Combina peso Murphy com peso de recência ((i+1)/n)
    const pesos = ativos.map((c, i) => c.peso * ((i + 1) / n))
    const somaW = pesos.reduce((s, w) => s + w, 0)
    const somaWX = ativos.reduce((s, c, i) => s + pesos[i] * c.ponto.x, 0)
    const somaWY = ativos.reduce((s, c, i) => s + pesos[i] * c.ponto.y, 0)
    const somaWXY = ativos.reduce((s, c, i) => s + pesos[i] * c.ponto.x * c.ponto.y, 0)
    const somaWX2 = ativos.reduce((s, c, i) => s + pesos[i] * c.ponto.x * c.ponto.x, 0)

    const den = somaW * somaWX2 - somaWX * somaWX
    if (den === 0) return { a: 0, b: somaWY / somaW, nMurphy, nPlanejado }

    const a = (somaW * somaWXY - somaWX * somaWY) / den
    const b = (somaWY - a * somaWX) / somaW
    return { a, b, nMurphy, nPlanejado }
}

export function tangentePontual(pontos: { x: number, y: number }[], index: number) {
    // Simplificação: derivada usando o ponto anterior e posterior
    if (pontos.length < 2) return { a: 0, b: 0 }
    const p1 = pontos[Math.max(0, index - 1)]
    const p2 = pontos[Math.min(pontos.length - 1, index + 1)]
    const dx = p2.x - p1.x
    if (dx === 0) return { a: 0, b: 0 }
    const a = (p2.y - p1.y) / dx
    const b = pontos[index].y - a * pontos[index].x
    return { a, b }
}

export function dist(P: number[], Q: number[]): number {
    return Math.sqrt((P[0] - Q[0]) ** 2 + (P[1] - Q[1]) ** 2)
}

export function areaTri(a: number, b: number, c: number): number {
    const s = (a + b + c) / 2
    const val = s * (s - a) * (s - b) * (s - c)
    return val > 0 ? Math.sqrt(val) : 0
}

// Story 1.9: delegated to projectPointToLine() in triangle-logic.ts (unified logic)
export function peAltitude(P: number[], Q: number[], R: number[]): number[] {
    const foot = projectPointToLine(
        { x: R[0], y: R[1] },
        { x: P[0], y: P[1] },
        { x: Q[0], y: Q[1] }
    )
    return [foot.x, foot.y]
}

export function calcularMATED(pontoOperacao: { x: number, y: number }, baricentro: number[]) {
    return Math.sqrt((pontoOperacao.x - baricentro[0]) ** 2 + (pontoOperacao.y - baricentro[1]) ** 2)
}

/**
 * Representa um vértice no plano 2D.
 */
export type Ponto2D = { x: number; y: number }

/**
 * Representa um triângulo com vértices nomeados E (Escopo), P (Prazo) e O (Orçamento).
 */
export type TrianguloCDT = { E: Ponto2D; P: Ponto2D; O: Ponto2D }

/**
 * Resultado do cálculo do NVO com hierarquia de 3 níveis.
 */
export type NVOResult = {
    x: number
    y: number
    /** 1 = Baricentro Órtico (acutângulo), 2 = Centróide do TM (obtuso/singular/fallback) */
    nivel: 1 | 2
    tipo: 'ortico' | 'centroide_tm'
}

/**
 * Classifica um triângulo pelos comprimentos dos seus lados usando a lei dos cossenos.
 *
 * Um triângulo é acutângulo se, para todos os três lados (a, b, c):
 *   a² + b² > c² (o ângulo oposto ao maior lado é agudo)
 * É retângulo se a² + b² = c² para os dois menores lados.
 * É obtusângulo se a² + b² < c² para algum par.
 *
 * @param a - Comprimento do primeiro lado
 * @param b - Comprimento do segundo lado
 * @param c - Comprimento do terceiro lado
 * @returns Classificação do triângulo
 */
export function classificarTriangulo(a: number, b: number, c: number): 'acutangulo' | 'retangulo' | 'obtusangulo' {
    // Ordenar para garantir que c é o maior lado
    const lados = [a, b, c].sort((x, y) => x - y)
    const [s1, s2, s3] = lados
    const soma = s1 * s1 + s2 * s2
    const hip = s3 * s3
    const EPS = 1e-10
    if (Math.abs(soma - hip) < EPS) return 'retangulo'
    if (soma < hip) return 'obtusangulo'
    return 'acutangulo'
}

/**
 * Calcula o incentro de um triângulo definido por três pontos 2D.
 * O incentro é ponderado pelos comprimentos dos lados opostos a cada vértice.
 *
 * @param A - Primeiro vértice
 * @param B - Segundo vértice
 * @param C - Terceiro vértice
 * @returns Coordenadas {x, y} do incentro
 */
function calcularIncentro(A: Ponto2D, B: Ponto2D, C: Ponto2D): Ponto2D {
    const a = Math.sqrt((B.x - C.x) ** 2 + (B.y - C.y) ** 2) // lado oposto a A
    const b = Math.sqrt((A.x - C.x) ** 2 + (A.y - C.y) ** 2) // lado oposto a B
    const c = Math.sqrt((A.x - B.x) ** 2 + (A.y - B.y) ** 2) // lado oposto a C
    const perim = a + b + c
    if (perim < 1e-12) return { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 }
    return {
        x: (a * A.x + b * B.x + c * C.x) / perim,
        y: (a * A.y + b * B.y + c * C.y) / perim,
    }
}

/**
 * Calcula o Núcleo Viável Ótimo (NVO) usando hierarquia simplificada de 2 níveis.
 *
 * Sessão 29 (D-S29-07): Eliminado nível 3 (incentro). Aprovado por squad unânime.
 * Incentro é redundante (re-pondera ângulos que já temos) e amplifica erro ~8×
 * em triângulos obtusos extremos. Centróide é sempre interior, sensibilidade
 * uniforme (1/3 por vértice), e centro de massa natural das sombras de área.
 *
 * Hierarquia:
 * - **Nível 1:** Baricentro do triângulo órtico de TA — quando TA é acutângulo.
 * - **Nível 2:** Centróide do TM — para obtuso, singular, ou fallback.
 *
 * @param TA - Triângulo Atual com vértices {E, P, O} como {x, y}
 * @param TM - Triângulo Meta com vértices {E, P, O} como {x, y}
 * @returns Ponto NVO com coordenadas, nível utilizado e tipo descritivo
 */
export function calcularNVO(TA: TrianguloCDT, TM: TrianguloCDT): NVOResult {
    // Comprimentos dos lados do TA
    const taLadoE = Math.sqrt((TA.E.x - TA.P.x) ** 2 + (TA.E.y - TA.P.y) ** 2)
    const taLadoP = Math.sqrt((TA.P.x - TA.O.x) ** 2 + (TA.P.y - TA.O.y) ** 2)
    const taLadoO = Math.sqrt((TA.E.x - TA.O.x) ** 2 + (TA.E.y - TA.O.y) ** 2)

    const tipoTA = classificarTriangulo(taLadoE, taLadoP, taLadoO)

    if (tipoTA === 'acutangulo') {
        // Nível 1: Baricentro do triângulo órtico de TA
        const HaTA = peAltitude([TA.P.x, TA.P.y], [TA.O.x, TA.O.y], [TA.E.x, TA.E.y])
        const HbTA = peAltitude([TA.E.x, TA.E.y], [TA.O.x, TA.O.y], [TA.P.x, TA.P.y])
        const HcTA = peAltitude([TA.E.x, TA.E.y], [TA.P.x, TA.P.y], [TA.O.x, TA.O.y])

        const bariOrtico: Ponto2D = {
            x: (HaTA[0] + HbTA[0] + HcTA[0]) / 3,
            y: (HaTA[1] + HbTA[1] + HcTA[1]) / 3,
        }

        const dentroTA = isPointInTriangle(
            bariOrtico.x, bariOrtico.y,
            TA.E.x, TA.E.y,
            TA.P.x, TA.P.y,
            TA.O.x, TA.O.y,
        )

        if (dentroTA) {
            return { x: bariOrtico.x, y: bariOrtico.y, nivel: 1, tipo: 'ortico' }
        }
    }

    // Nível 2: Centróide do TM — sempre interior, sensibilidade uniforme (1/3 por vértice)
    const centroideTM: Ponto2D = {
        x: (TM.E.x + TM.P.x + TM.O.x) / 3,
        y: (TM.E.y + TM.P.y + TM.O.y) / 3,
    }
    return { x: centroideTM.x, y: centroideTM.y, nivel: 2, tipo: 'centroide_tm' }
}

/** Verifica se um ponto esta dentro de um triangulo (metodo de areas) */
export function isPointInTriangle(
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number,
    cx: number, cy: number
): boolean {
    const areaTotal = Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay))
    if (areaTotal < 1e-12) return false
    const alpha = Math.abs((bx - px) * (cy - py) - (cx - px) * (by - py)) / areaTotal
    const beta = Math.abs((cx - px) * (ay - py) - (ax - px) * (cy - py)) / areaTotal
    const gamma = 1 - alpha - beta
    return alpha >= -1e-9 && beta >= -1e-9 && gamma >= -1e-9 && alpha <= 1 + 1e-9 && beta <= 1 + 1e-9
}

// ═══════════════════════════════════════════════════════════════════════════
// CDT v2 — Fiel ao MetodoAura.md
// Lados = intensidades das tangentes pontuais, normalizados pelo baseline
// ═══════════════════════════════════════════════════════════════════════════

export type CDTInput = {
    curvaCusto: { x: number; y: number }[]     // Curva S acumulada (dia, custo)
    curvaPrazo: { x: number; y: number }[]      // Burndown (dia, % restante)
    diaAtual: number                             // Ponto temporal atual
    diaBaseline?: number                         // Dia do baseline (default: 0)
    areaBaseline?: number                        // Area do triangulo no baseline (para desvio)
    // M1 — Lado E Dinâmico (scope creep geométrico)
    nTarefasAtual?: number                       // Contagem atual de tarefas CPM
    nTarefasBaseline?: number                    // Contagem no momento do baseline (imutável)
    // CDT v4.1: Baseline rates para normalização absoluta (Sessão 25 — fix obtuso)
    // Quando fornecidos, mc_norm = |slope| / baselineRate em vez de |slope| / actualRate.
    // Isso garante que um custo 3× o orçamento gere C_raw ≈ 3×, não ≈ 1×.
    orcamentoBase?: number                       // Orçamento total planejado (R$)
    prazoBase?: number                           // Prazo total planejado (dias úteis)
}

export type CDTResult = {
    A: [number, number]
    B: [number, number]
    C: [number, number]
    centroide: [number, number]                  // Centroide do triangulo principal (ponto de operacao)
    baricentro: number[]                         // Baricentro do triangulo ortico (ZRE)
    nvo: number[]                                // Nucleo Viavel Otimo (ortico para agudo, centroide_tm para obtuso/singular)
    nvo_tipo: 'ortico' | 'centroide_tm'  // Sessão 29: 2 níveis (incentro eliminado — redundante, amplifica erro 8× em obtuso)
    nvo_nivel?: 1 | 2                    // 1=baricentro órtico (agudo), 2=centróide TM (obtuso/singular/fallback)
    mated_distancia: number                      // Distancia euclidiana centroide→NVO
    mated_inside_ortico: boolean                 // Centroide esta dentro do triangulo ortico?
    cdt_area: number
    cdt_area_ortico: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cdt_area_baseline: number | null
    desvio_qualidade: number | null              // A_atual / A_baseline * 100
    lados: { escopo: number; orcamento: number; prazo: number }
    lados_brutos: { E: number; C: number; P: number }  // Pre-normalizacao
    escopo_ratio?: number | null                        // M1: n_atual/n_baseline bruto (null/undefined = sem baseline)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cet: { valida: boolean; report: any }
    /** CEt Dupla (Story 1.1): resultado tipado da verificação pré e pós-normalização */
    cet_dupla: CETDuplaResult
    cet_projecao: { valida_em_5dias: boolean; E_proj: number; C_proj: number; P_proj: number } | null
    zona_mated: 'OTIMO' | 'SEGURO' | 'RISCO' | 'CRISE'
    cdt_version: 2
    // MASTERPLAN-X §2 — campos adicionados em MetodoAura v3.0
    forma_triangulo?: 'acutangulo' | 'obtusangulo_c' | 'obtusangulo_p' | 'retangulo' | 'invalido'
    /** Sprint 0 Sessão 27: Protocolo Clairaut ativo (agudo/obtuso_beta/obtuso_gamma/singular) */
    protocolo?: 'agudo' | 'obtuso_beta' | 'obtuso_gamma' | 'singular'
    r2_custo?: number       // R² reta-mestra da curva de Custo
    r2_prazo?: number       // R² reta-mestra da curva de Prazo
    a_mancha?: number       // Área de cobertura total das curvas reais
    a_rebarba?: number      // A_mancha − A_TM (zona plástica / limite de escoamento)
    /** Sessão 29: Discriminante mc²-mp² da pré-classificação via slopes */
    pre_classificacao_disc?: number
    /** Sessão 29: Metadado semântico da Âncora (qual vértice é âncora, lado dominante) */
    ancora?: {
        vertice: 'epsilon' | 'omega' | 'alpha'
        ladoDominante: 'C' | 'P' | null
        protocolo: string
    }
}

/**
 * CDT v2: Gera o Triangulo de Estado do Projeto fiel ao MetodoAura.
 *
 * Lados derivados de TANGENTES PONTUAIS (instantaneas):
 * - E (Escopo) = 1.0 (ancora constante)
 * - C (Custo) = tangente_atual_custo / tangente_baseline_custo
 * - P (Prazo) = tangente_atual_prazo / tangente_baseline_prazo
 *
 * No dia 0 (baseline): C=1, P=1, E=1 → triangulo equilatero.
 * Conforme o projeto evolui, C e P mudam com as tangentes.
 */
export function gerarTrianguloCDT(input: CDTInput): CDTResult
/**
 * CDT v1 (Legacy): Mantida para retrocompatibilidade.
 */
export function gerarTrianguloCDT(
    retaOrc: { x1: number; y1: number; x2: number; y2: number },
    retaPrazo: { a: number },
    bac: number,
    totalDias: number,
    contingenciaPct: number
): CDTResult
export function gerarTrianguloCDT(
    arg1: CDTInput | { x1: number; y1: number; x2: number; y2: number },
    arg2?: { a: number } | undefined,
    arg3?: number,
    arg4?: number,
    arg5?: number
): CDTResult {
    let E: number, C_raw: number, P_raw: number
    let areaBaseline: number | null = null
    let cetProjecao: CDTResult['cet_projecao'] = null
    let escopoRatio: number | null = null
    let r2CustoVal: number | undefined = undefined
    let r2PrazoVal: number | undefined = undefined
    let _preClass_disc: number | undefined = undefined  // Sessão 29: discriminante pré-classificação

    // Detect v2 vs v1 call
    if ('curvaCusto' in arg1) {
        // ═══ CDT v2: Reta-Mestra por Regressão (MetodoAura §2.2.3 — MASTERPLAN-X Sprint 1) ═══
        // "Abolição do Equilátero Base": C e P derivados do slope OLS da reta-mestra,
        // normalizados pela taxa média esperada. Garante triângulo escáleno no baseline.
        // Referência: MetodoAura v3.0 §2.2.3 | MASTERPLAN-X Sprint 1 | Aprovado squad 2026-03-28
        const input = arg1 as CDTInput
        const { curvaCusto, curvaPrazo, diaAtual } = input
        areaBaseline = input.areaBaseline ?? null

        const idxCustoAtual = findClosestIndex(curvaCusto, diaAtual)
        const idxPrazoAtual = findClosestIndex(curvaPrazo, diaAtual)

        // ─── M1: Lado E Dinâmico (scope creep geométrico) ───
        // Q3 SIMPLE (ativo): E = n_tarefas_atual / n_tarefas_baseline
        // Q2: E clampado em 0.5 (proteção contra exclusão excessiva de tarefas)
        // Referência: INSIGHTS-LOG M1 | Aprovado pelo squad 2026-03-16
        if (input.nTarefasAtual != null && input.nTarefasBaseline != null && input.nTarefasBaseline > 0) {
            escopoRatio = input.nTarefasAtual / input.nTarefasBaseline
            E = Math.max(escopoRatio, 0.5)
            // TODO: Q3 WEIGHTED — E = Σ(nivel×duracao)_atual / Σ(nivel×duracao)_baseline
            // Requer WBSNodeDraft com nivel e duracao do contexto EAP.
        } else {
            E = 1.0
        }

        // ─── C e P: Slope da Reta-Mestra OLS (MetodoAura §2.2.3) ───
        // Usa curva até diaAtual; se insuficiente (<3 pontos), usa a curva completa
        // (baseline fingerprint). Isto garante que mesmo no dia 0 o triângulo reflita
        // a forma real do projeto — escáleno por natureza, não equilátero artificial.
        // CDT v4.2 (Fix P1 Sessão 27): Usar curva COMPLETA para regressão OLS.
        // Antes: sub-curva (slice até diaAtual) criava desvio artificial de área
        // quando TM e TA usam as mesmas curvas planejadas. O desvio real só deve
        // emergir quando curvas de execução real diferirem das planejadas.
        // Autoridade: @aura-math + @roberta | Sessão 27
        const curvaCustoRM = curvaCusto
        const curvaPrazoRM = curvaPrazo

        const rmCusto = buildRetaMestra(curvaCustoRM)
        const rmPrazo = buildRetaMestra(curvaPrazoRM)
        r2CustoVal = rmCusto.r2
        r2PrazoVal = rmPrazo.r2

        // ═══ CDT v4.1 §2.2.3 — Normalização pelo Baseline (fix obtuso, Sessão 25) ═══
        // v4.0: ambas normalizadas pelo MESMO denominador temporal T (espaço comum).
        // v4.1: quando orcamentoBase/prazoBase fornecidos, usa a taxa PLANEJADA como
        //       denominador em vez da taxa REAL. Assim, custo 3× o orçamento → mc_norm ≈ 3,
        //       não ≈ 1 (que mascarava o desvio absoluto e impedia detecção de obtuso).
        // Referência: MetodoAura v4.1 | Squad @aura-math + @roberta | Sessão 25
        const custoStart = curvaCusto[0]?.y ?? 0
        const custoEnd = curvaCusto[curvaCusto.length - 1]?.y ?? 1
        const custoRange = Math.abs(custoEnd - custoStart) || 1
        const totalDiasCusto = curvaCusto[curvaCusto.length - 1]?.x || 1

        const burndownStart = curvaPrazo[0]?.y ?? 100
        const burndownEnd = curvaPrazo[curvaPrazo.length - 1]?.y ?? 0
        const burndownRange = Math.abs(burndownStart - burndownEnd) || 100
        const totalDiasPrazo = curvaPrazo[curvaPrazo.length - 1]?.x || 1

        // Denominador temporal COMUM — T = max dos dois domínios temporais
        const T = Math.max(totalDiasCusto, totalDiasPrazo, 1)

        // @fermat P0-FIX: Normalização que preserva fingerprint escaleno
        // Problema anterior: orcBase/pzBase = slope_real quando ratio=1.0 → mc_norm=1.0 → equilátero
        // Solução: usar custoRange/T como denominador (range REAL da curva, não orçamento planejado)
        // Isso captura a FORMA da distribuição (S-curve custo ≠ burndown linear)
        // Quando custos são front-loaded: slope_custo > custoRange/T → mc_norm > 1 → C > √2
        // Quando custos são back-loaded: slope_custo < custoRange/T → mc_norm < 1 → C < √2
        // O orcamentoBase serve como ESCALA (detecta overrun), aplicado como fator multiplicativo
        const orcBase = input.orcamentoBase
        const pzBase = input.prazoBase

        // Taxa de referência: usa prazoBase/orcBase quando disponíveis (MetodoAura §2.2.3)
        // pzBase captura o BUFFER (prazo_total > CP) que infla mp_norm → detecta γ
        const avgCustoRate = custoRange / T
        const avgPrazoRate = burndownRange / ((pzBase && pzBase > 0) ? pzBase : T)

        // mc_norm e mp_norm baseados na forma real
        let mc_norm = avgCustoRate > 1e-9 ? Math.abs(rmCusto.slope) / avgCustoRate : 1.0
        let mp_norm = avgPrazoRate > 1e-9 ? Math.abs(rmPrazo.slope) / avgPrazoRate : 1.0

        // Fator de escala: quando custos_total ≠ orcamentoBase, amplificar mc_norm
        // ratio = custos_total / orcamento → ratio > 1 = overrun, ratio < 1 = underspend
        if (orcBase && orcBase > 0 && custoRange > 0) {
            const custoTotal = custoEnd   // último ponto da curva = custo acumulado total
            const ratio = custoTotal / orcBase
            mc_norm = mc_norm * ratio     // overrun 1.6× → mc_norm × 1.6
        }

        // Sessão 29 (D-S29-03): Pré-classificação via slopes ANTES de calcular lados.
        // Algebricamente equivalente ao Clairaut: mc²-mp² > 1 ↔ E²+P² < C² (beta)
        _preClass_disc = (mc_norm * mc_norm) - (mp_norm * mp_norm)
        // Usado como hint diagnóstico — Clairaut continua sendo autoridade final.

        // C = sqrt(1 + mc_norm²), P = sqrt(1 + mp_norm²)
        C_raw = Math.sqrt(1 + mc_norm * mc_norm)
        P_raw = Math.sqrt(1 + mp_norm * mp_norm)

        // CDT v4.0: SEM override diaAtual=0. O fingerprint escaleno do projeto planejado
        // emerge naturalmente das curvas CPM/custo desde o dia 0.
        // O TM isósceles canônico (E=1,C=P=√2) é agora apenas uma referência de comparação,
        // não o estado forçado. Decisão D-ESC-03 (Sessão 24, 2026-03-29).

        // Projeção 5 dias: reta-mestra com janela estendida (+5 índices)
        if (curvaCusto.length >= 3 && curvaPrazo.length >= 3) {
            const idxFuturo = Math.min(idxCustoAtual + 5, curvaCusto.length - 1)
            if (idxFuturo > idxCustoAtual) {
                const rmCustoFut = buildRetaMestra(curvaCusto.slice(0, idxFuturo + 1))
                const rmPrazoFut = buildRetaMestra(curvaPrazo.slice(0, Math.min(idxPrazoAtual + 5, curvaPrazo.length - 1) + 1))
                const mc_fut = avgCustoRate > 1e-9 ? Math.abs(rmCustoFut.slope) / avgCustoRate : 1.0
                const mp_fut = avgPrazoRate > 1e-9 ? Math.abs(rmPrazoFut.slope) / avgPrazoRate : 1.0
                const C_proj = Math.sqrt(1 + mc_fut * mc_fut)
                const P_proj = Math.sqrt(1 + mp_fut * mp_fut)
                cetProjecao = {
                    valida_em_5dias: checkCDTExistence(E, C_proj, P_proj),
                    E_proj: E,
                    C_proj,
                    P_proj,
                }
            }
        }
    } else {
        // ═══ CDT v1 (Legacy) ═══
        const retaOrc = arg1 as { x1: number; y1: number; x2: number; y2: number }
        const retaPrazo = arg2 as { a: number }
        const bac = arg3 as number
        const totalDias = arg4 as number
        const contingenciaPct = arg5 as number

        E = 1.0
        escopoRatio = null
        const dx = retaOrc.x2 - retaOrc.x1 || 1
        const coefOrc = Math.abs((retaOrc.y2 - retaOrc.y1) / dx)
        const taxaMedia = bac / totalDias
        C_raw = taxaMedia > 0 ? coefOrc / taxaMedia : 0.05
        P_raw = Math.abs(retaPrazo.a)

        const limMax = 1 + ((contingenciaPct ?? getDefaultContingencia()) / 100)
        C_raw = Math.min(Math.max(C_raw, 0.05), limMax)
        P_raw = Math.min(Math.max(P_raw, 0.05), 2.0)
    }

    // Clamp para evitar degenerados (minimo 0.01)
    C_raw = Math.max(C_raw, 0.01)
    P_raw = Math.max(P_raw, 0.01)

    // ═══ P0-1 @fermat: CEt PRE-CLAMP — checar ANTES de clampar ═══
    // Se CEt falha com os valores brutos → CRISE real (projeto impossível).
    // O clamp só se aplica quando CEt é válida (para renderização de obtuso).
    const cetBruta = checkCDTExistence(E, C_raw, P_raw)

    if ('curvaCusto' in arg1 && cetBruta) {
        // ═══ CDT v4.1 — Clamp Geométrico SOMENTE se CEt válida ═══
        // Preserva ângulo máximo ~140° para triângulos obtuso visíveis.
        const CEt_MARGIN = 0.25
        if (Math.abs(P_raw - C_raw) >= E - CEt_MARGIN) {
            if (C_raw > P_raw) {
                C_raw = P_raw + E - CEt_MARGIN
            } else {
                P_raw = C_raw + E - CEt_MARGIN
            }
        }
    }

    // ═══ CEt PRE-NORMALIZACAO (MetodoAura: |P-C| < E < P+C) ═══
    // Usa valores PÓS-clamp (se clamp foi aplicado) ou brutos (se CEt falhou)
    const cetValida = cetBruta ? checkCDTExistence(E, C_raw, P_raw) : false
    const cetReport = generateCrisisReport(E, C_raw, P_raw)

    // ═══ Normalizacao: Escopo como âncora constante = 1.0 (MetodoAura §2.1) ═══
    // E é o denominador comum — Custo e Prazo são expressos como proporção do Escopo.
    // En = 1.0 sempre, Cn = C_raw/E, Pn = P_raw/E.
    // Garante que desvios em C e P são lidos RELATIVAMENTE ao Escopo atual.
    const En = 1.0
    const Cn = E > 0 ? C_raw / E : C_raw
    const Pn = E > 0 ? P_raw / E : P_raw

    // ═══ CEt DUPLA (Story 1.1): verifica pré e pós-normalização ═══
    // Bloqueia o cálculo se qualquer etapa falhar (retorna resultado mínimo com blocked=true)
    const cetDupla = checkCETDupla(E, C_raw, P_raw, En, Cn, Pn)
    if (!cetDupla.valid) {
        // Triângulo bloqueado: retornar estrutura mínima com cet_dupla preenchido
        const bloqueado: CDTResult = {
            A: [0, 0], B: [0, 0], C: [0, 0],
            centroide: [0, 0],
            baricentro: [0, 0, 0],
            nvo: [0, 0],
            nvo_tipo: 'ortico',
            nvo_nivel: 1,
            mated_distancia: 0,
            mated_inside_ortico: false,
            cdt_area: 0,
            cdt_area_ortico: 0,
            cdt_area_baseline: areaBaseline,
            desvio_qualidade: null,
            lados: { escopo: En, orcamento: Cn, prazo: Pn },
            lados_brutos: { E, C: C_raw, P: P_raw },
            escopo_ratio: escopoRatio,
            cet: { valida: false, report: cetReport },
            cet_dupla: cetDupla,
            cet_projecao: cetProjecao,
            zona_mated: 'CRISE',
            cdt_version: 2,
            // Protocolo mesmo quando bloqueado — para que o renderer saiba a intenção
            protocolo: sintetizarClairaut(En, Pn, Cn).tipo,
        }
        return bloqueado
    }

    // ═══ Construção Geométrica (Canônica) ═══
    // Sessão 29: SEMPRE coordenadas canônicas (y>0). A Âncora Semântica é METADADO,
    // não transformação de vértices. O renderer consome o metadado para decidir transforms.
    const protocolo_sc = sintetizarClairaut(En, Pn, Cn).tipo
    const cosA_val = clampCos((En * En + Pn * Pn - Cn * Cn) / (2 * En * Pn))
    const angA = Math.acos(cosA_val)
    const A: [number, number] = [0, 0]
    const B: [number, number] = [En, 0]
    const C_vert: [number, number] = [Pn * Math.cos(angA), Pn * Math.sin(angA)]

    // Metadado semântico da Âncora (D-S29-01): qual vértice é a âncora, qual lado domina
    const ancoraMetadado = {
        vertice: protocolo_sc === 'obtuso_beta' ? 'omega' as const
                : protocolo_sc === 'obtuso_gamma' ? 'alpha' as const
                : 'epsilon' as const,
        ladoDominante: protocolo_sc === 'obtuso_beta' ? 'C' as const
                      : protocolo_sc === 'obtuso_gamma' ? 'P' as const
                      : null,
        protocolo: protocolo_sc,
    }

    // ═══ Triangulo Ortico ═══
    const Ha = peAltitude(B, C_vert, A)
    const Hb = peAltitude(A, C_vert, B)
    const Hc = peAltitude(A, B, C_vert)

    // Sessão 29: determinar obtusidade a partir dos LADOS puros (independente da construção)
    const taEhObtuso = protocolo_sc === 'obtuso_beta' || protocolo_sc === 'obtuso_gamma'

    // Protocolo α (agudo): baricentro = baricentro do triângulo órtico (ZRE interna)
    // Protocolo β/γ (obtuso): sem triângulo órtico — baricentro = centroide do TA
    const baricentroOrtico = taEhObtuso
        ? [(A[0] + B[0] + C_vert[0]) / 3, (A[1] + B[1] + C_vert[1]) / 3]
        : [(Ha[0] + Hb[0] + Hc[0]) / 3, (Ha[1] + Hb[1] + Hc[1]) / 3]

    // ═══ NVO com Hierarquia de 3 Níveis (Story 1.2) ═══
    // TA = triângulo atual (lados normalizados)
    // TM = Triângulo Matriz baseline (CDT v3.0 isósceles: E=1, C=P=sqrt(2))
    const taForNVO: TrianguloCDT = {
        E: { x: A[0], y: A[1] },
        P: { x: B[0], y: B[1] },
        O: { x: C_vert[0], y: C_vert[1] },
    }
    // TM (Triângulo Matriz baseline CDT v3.0): isósceles E=1, C=P=sqrt(2)
    // cos(ângulo em A) = (E² + P² - C²) / (2EP) = (1 + 2 - 2) / (2×1×sqrt(2)) = 1/(2sqrt(2)) ≈ 69.3°
    // Corrige erro anterior que usava equilátero (60°) — MetodoAura v3.0 §2.2.3
    const tmAngA = Math.acos(1 / (2 * Math.sqrt(2)))
    const tmB: [number, number] = [1.0, 0]
    const tmC: [number, number] = [Math.sqrt(2) * Math.cos(tmAngA), Math.sqrt(2) * Math.sin(tmAngA)]
    const tmForNVO: TrianguloCDT = {
        E: { x: 0, y: 0 },
        P: { x: tmB[0], y: tmB[1] },
        O: { x: tmC[0], y: tmC[1] },
    }

    const nvoResult = calcularNVO(taForNVO, tmForNVO)
    const nvo: number[] = [nvoResult.x, nvoResult.y]
    // Sessão 29: Hierarquia simplificada 2 níveis (incentro eliminado)
    const nvoTipo = nvoResult.tipo
    const nvoNivel = nvoResult.nivel

    // ═══ Areas ═══
    const cdt_area = areaTri(dist(A, B), dist(B, C_vert), dist(A, C_vert))
    const cdt_area_ortico = areaTri(dist(Ha, Hb), dist(Hb, Hc), dist(Hc, Ha))

    // ═══ Desvio de Qualidade (MetodoAura: A_atual / A_original × 100) ═══
    // MetodoAura: A_TM = 100% por definição. Desvio < 3% sem execução real = artefato numérico.
    const desvio_raw = areaBaseline && areaBaseline > 0
        ? (cdt_area / areaBaseline) * 100
        : null
    const desvio_qualidade = desvio_raw !== null && Math.abs(desvio_raw - 100) < 5
        ? 100.0 : desvio_raw

    // ═══ Centroide do triangulo principal (ponto de operacao) ═══
    const centroide: [number, number] = [
        (A[0] + B[0] + C_vert[0]) / 3,
        (A[1] + B[1] + C_vert[1]) / 3,
    ]

    // ═══ MATED: distancia centroide→NVO ═══
    const mated_distancia = Math.sqrt(
        (centroide[0] - nvo[0]) ** 2 + (centroide[1] - nvo[1]) ** 2
    )

    // Verificar se centroide esta dentro do triangulo ortico
    const mated_inside_ortico = isPointInTriangle(
        centroide[0], centroide[1],
        Ha[0], Ha[1], Hb[0], Hb[1], Hc[0], Hc[1]
    )

    // ═══ Zona MATED composta (CEt + qualidade + geometria) ═══
    const zona_mated = classificarZonaComposta(cetValida, desvio_qualidade, mated_distancia, mated_inside_ortico)

    // ═══ A_mancha: integral de desvio real (MetodoAura §3.x) ═══
    // A_mancha = ∫[0,1] max(f_p(t), f_c(t)) dt − E  (subtrai área reta_escopo × eixo_abcissas)
    // f_p = burndown normalizado [0,1], f_c = custo acumulado normalizado [0,1]
    // Tempo normalizado [0,1]. Desvio positivo = mancha (excesso acima da reta de equilíbrio).
    let a_mancha_val: number | undefined = undefined
    let a_rebarba_val: number | undefined = undefined
    if ('curvaCusto' in arg1) {
        const { curvaCusto: cvC, curvaPrazo: cvP } = arg1 as CDTInput
        if (cvC.length >= 2 && cvP.length >= 2) {
            const maxCustoVal = Math.max(cvC[cvC.length - 1]?.y ?? 1, 1e-9)
            const totalT = Math.max(cvC[cvC.length - 1]?.x ?? 1, 1e-9)
            const interp = (pts: { x: number; y: number }[], tNorm: number, scale: number): number => {
                const tAbs = tNorm * totalT
                if (tAbs <= pts[0].x) return pts[0].y / scale
                if (tAbs >= pts[pts.length - 1].x) return pts[pts.length - 1].y / scale
                for (let i = 0; i < pts.length - 1; i++) {
                    if (pts[i].x <= tAbs && tAbs <= pts[i + 1].x) {
                        const frac = (tAbs - pts[i].x) / (pts[i + 1].x - pts[i].x || 1e-9)
                        return (pts[i].y + frac * (pts[i + 1].y - pts[i].y)) / scale
                    }
                }
                return pts[pts.length - 1].y / scale
            }
            const tSet = new Set<number>()
            cvC.forEach(p => tSet.add(p.x / totalT))
            cvP.forEach(p => tSet.add(p.x / totalT))
            const tGrid = Array.from(tSet).sort((a, b) => a - b)
            let integral = 0
            for (let i = 0; i < tGrid.length - 1; i++) {
                const t0 = tGrid[i], t1 = tGrid[i + 1]
                const fc0 = interp(cvC, t0, maxCustoVal)
                const fp0 = interp(cvP, t0, 100)
                const fc1 = interp(cvC, t1, maxCustoVal)
                const fp1 = interp(cvP, t1, 100)
                integral += (Math.max(fc0, fp0) + Math.max(fc1, fp1)) * (t1 - t0) / 2
            }
            a_mancha_val = integral - E
            a_rebarba_val = a_mancha_val - cdt_area
        }
    }

    return {
        A, B, C: C_vert,
        centroide,
        baricentro: baricentroOrtico,
        nvo,
        nvo_tipo: nvoTipo,
        nvo_nivel: nvoNivel,
        mated_distancia,
        mated_inside_ortico,
        cdt_area,
        cdt_area_ortico,
        cdt_area_baseline: areaBaseline,
        desvio_qualidade,
        lados: { escopo: En, orcamento: Cn, prazo: Pn },
        lados_brutos: { E, C: C_raw, P: P_raw },
        escopo_ratio: escopoRatio,
        cet: { valida: cetValida, report: cetReport },
        cet_dupla: cetDupla,
        cet_projecao: cetProjecao,
        zona_mated,
        cdt_version: 2,
        // MASTERPLAN-X §2 — MetodoAura v3.0
        forma_triangulo: classificarFormaTriangulo(En, Cn, Pn),
        // Sessão 29: protocolo já calculado antes da construção (eliminada chamada duplicada)
        protocolo: protocolo_sc,
        a_mancha: a_mancha_val,
        a_rebarba: a_rebarba_val,
        r2_custo: r2CustoVal,  // R² da reta-mestra de Custo (MetodoAura §2.2.2 — KPI de caos)
        r2_prazo: r2PrazoVal,  // R² da reta-mestra de Prazo
        pre_classificacao_disc: _preClass_disc,
        ancora: ancoraMetadado,
    }
}

/** Encontra o indice do ponto mais proximo de um dia alvo */
function findClosestIndex(pontos: { x: number; y: number }[], targetX: number): number {
    if (pontos.length === 0) return 0
    let minDist = Infinity
    let bestIdx = 0
    for (let i = 0; i < pontos.length; i++) {
        const d = Math.abs(pontos[i].x - targetX)
        if (d < minDist) { minDist = d; bestIdx = i }
    }
    return bestIdx
}

/**
 * CDT v3.0 — Baseline MATED para triângulo isósceles perfeito (E=1, C=P=sqrt(2)).
 *
 * Derivação analítica exata (MetodoAura §3.3 rev3 | Squad AURA 2026-03-28):
 *   Vértices: A=(0,0), B=(1,0), C=(0.5, sqrt(7)/2)
 *   Pés das altitudes (triângulo órtico):
 *     Ha = (7/8, sqrt(7)/8), Hb = (1/8, sqrt(7)/8), Hc = (1/2, 0)
 *   Baricentro do ótico (NVO) = (1/2, sqrt(7)/12)
 *   Centroide do triângulo principal = (1/2, sqrt(7)/6)
 *   MATED_baseline = sqrt(7)/6 - sqrt(7)/12 = sqrt(7)/12 ≈ 0.2205
 *
 * Interpretação: projeto saudável (sem desvio) tem MATED ≈ 0.2205 por construção
 * geométrica do isósceles CDT v3.0. Limiares são relativos a este baseline.
 */
export const MATED_V30_BASELINE = Math.sqrt(7) / 12  // ≈ 0.2205

/**
 * Classifica a zona MATED baseado na distancia ao NVO (pura geometria).
 * Util para comparar decisoes individuais contra o NVO.
 *
 * CDT v3.0: usa MATED_delta = max(0, d - MATED_V30_BASELINE) como entrada real.
 * Projeto saudável (d ≈ baseline) → delta ≈ 0 → OTIMO.
 * Limiares semânticos preservados (0.05/0.15/0.30), agora aplicados ao desvio acima do baseline.
 */
export function classificarZonaMATED(
    distanciaAoNVO: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _isInsideOrtico?: boolean
): 'OTIMO' | 'SEGURO' | 'RISCO' | 'CRISE' {
    // CDT v3.0 §3.3 rev3: limiares relativos ao baseline isósceles (sqrt(7)/12 ≈ 0.2205)
    // d_delta = desvio acima do baseline saudável → 0 = projeto perfeito
    // Equivalente em absoluto: OTIMO < 0.270 | SEGURO < 0.370 | RISCO < 0.521 | CRISE ≥ 0.521
    const d_delta = Math.max(0, distanciaAoNVO - MATED_V30_BASELINE)
    if (d_delta < 0.05) return 'OTIMO'
    if (d_delta < 0.15) return 'SEGURO'
    if (d_delta < 0.30) return 'RISCO'
    return 'CRISE'
}

/**
 * Classifica a zona do projeto usando metrica composta.
 * Combina CEt (viabilidade geometrica), desvio de qualidade (KPI primario),
 * e MATED distance (geometria complementar).
 *
 * Hierarquia:
 * 1. CEt violada → CRISE automatica (projeto geometricamente impossivel)
 * 2. Desvio de qualidade (area) → sinal primario (MetodoAura: area e KPI)
 * 3. MATED distance → fallback quando nao ha baseline
 */
export function classificarZonaComposta(
    cetValida: boolean,
    desvioQualidade: number | null,
    matedDistancia: number,
    insideOrtico: boolean
): 'OTIMO' | 'SEGURO' | 'RISCO' | 'CRISE' {
    // CEt violada = impossibilidade geometrica → CRISE
    if (!cetValida) return 'CRISE'

    // Se temos desvio de qualidade (baseline definido), usar como sinal primario
    if (desvioQualidade !== null) {
        if (desvioQualidade >= 85) return 'OTIMO'
        if (desvioQualidade >= 60) return 'SEGURO'
        if (desvioQualidade >= 35) return 'RISCO'
        return 'CRISE'
    }

    // Fallback: sem baseline, usar MATED distance pura
    return classificarZonaMATED(matedDistancia, insideOrtico)
}

/**
 * Decomposicao direcional do MATED.
 * Indica QUAL dimensao causa o desvio (custo vs prazo).
 */
export function decomporMATED(
    pontoOperacao: { x: number; y: number },
    nvo: number[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ladosCDT: { escopo: number; orcamento: number; prazo: number }
): { direcao_principal: 'custo' | 'prazo' | 'equilibrado'; desvio_custo: number; desvio_prazo: number } {
    const dx = pontoOperacao.x - nvo[0]
    const dy = pontoOperacao.y - nvo[1]

    // Componente horizontal = desvio de prazo (eixo X = Escopo/tempo)
    // Componente vertical = desvio de custo (eixo Y = custo)
    const desvio_prazo = Math.abs(dx)
    const desvio_custo = Math.abs(dy)

    let direcao_principal: 'custo' | 'prazo' | 'equilibrado'
    if (desvio_custo > desvio_prazo * 1.5) {
        direcao_principal = 'custo'
    } else if (desvio_prazo > desvio_custo * 1.5) {
        direcao_principal = 'prazo'
    } else {
        direcao_principal = 'equilibrado'
    }

    return { direcao_principal, desvio_custo, desvio_prazo }
}

/**
 * Calcula o Índice de Qualidade (IQ) como proporção de área TA/TM × 100.
 *
 * IQ = 100%: TA = TM (execução perfeita)
 * IQ > 100%: TA maior que TM (expansão — aditivo ou desvio positivo)
 * IQ < 100%: TA menor que TM (compressão — scope reduction ou avanço acelerado)
 *
 * @param areaTA - Área do Triângulo Atual
 * @param areaTM - Área do Triângulo Meta
 * @returns IQ em percentual, ou null se areaTM === 0 (TM não configurado)
 */
// ─── Story 1.6: Seed custosTarefas proporcional por duração (M7) ─────────────

/**
 * Gera distribuição de custos proporcional à duração de cada tarefa.
 * Usado como fallback quando custosTarefas está vazio e orcamentoBase > 0.
 *
 * @returns Record<string, number> — custo estimado por tarefa_id
 */
export function seedCustosTarefas(
    tarefas: Pick<Tarefa, 'id' | 'duracao_estimada'>[],
    orcamentoBase: number
): Record<string, number> {
    if (orcamentoBase <= 0 || tarefas.length === 0) return {}

    const duracaoTotal = tarefas.reduce((s, t) => s + (t.duracao_estimada || 0), 0)

    if (duracaoTotal === 0) {
        // Todas as durações são zero — distribuição igual
        const custoIgual = orcamentoBase / tarefas.length
        return Object.fromEntries(tarefas.map(t => [t.id, custoIgual]))
    }

    return Object.fromEntries(
        tarefas.map(t => [
            t.id,
            orcamentoBase * ((t.duracao_estimada || 0) / duracaoTotal),
        ])
    )
}

export function calcularIQ(areaTA: number, areaTM: number): number | null {
    if (areaTM === 0) return null
    return (areaTA / areaTM) * 100
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}

export function calcularProjecaoFinanceira(
    tarefas: Tarefa[],
    custosTarefas: Record<string, number>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    marcos: any[],
    prazoTotal: number
) {
    const projecao: { dia: number; desembolso: number; acumulado: number }[] = []
    let acumulado = 0

    for (let dia = 0; dia <= prazoTotal; dia++) {
        let desembolsoDia = 0

        // 1. Desembolso de Tarefas (Lógica Linear por ES/EF)
        tarefas.forEach(t => {
            const custoTotal = custosTarefas[t.id] || 0
            if (custoTotal > 0 && t.es !== null && t.ef !== null && t.duracao_estimada > 0) {
                // Se o dia está dentro do intervalo da tarefa
                if (dia >= t.es && dia < t.ef) {
                    desembolsoDia += custoTotal / t.duracao_estimada
                }
            }
        })

        // 2. Desembolso de Marcos (Pagamento na data do marco)
        marcos.forEach(m => {
            if (m.dia === dia) {
                desembolsoDia += m.custo || 0
            }
        })

        acumulado += desembolsoDia
        projecao.push({ dia, desembolso: desembolsoDia, acumulado })
    }

    return projecao
}

/**
 * AUTO-SCALING Aura v6.1
 * Refina a normalização dos vértices baseada na ordem de grandeza do projeto
 * Evita distorções em projetos com orçamentos/prazos em escalas muito distintas.
 */
export function normalizarEscala(valor: number, base: number): number {
    if (base === 0) return 0
    const ratio = valor / base
    // Log normalization or sigmoid can be used here for extreme outliers if needed
    return ratio
}

/**
 * SIMULAÇÃO DE MONTE CARLO - Aura PREDICTIVE
 * Simula variações aleatórias nos vértices do triângulo CDT para calcular 
 * a probabilidade de manutenção da área órtica (Resiliência).
 */
// ─── Story 3.7: Alerta Desvio Subclínico MATED ──────────────────────────────

/**
 * Alerta de desvio subclínico: MATED estável mas uma dimensão cresceu silenciosamente.
 * @roberta: lógica validada em sessão 3.7 — ΔLado contra TM (não passo anterior)
 */
export interface DesvioSubclinicoAlert {
  tipo: 'subclinico'
  dimensao: 'E' | 'P' | 'O'
  variacao: number
  mated: number
}

/**
 * Detecta desvio subclínico: MATED abaixo de ε mas um lado variou além do limiar.
 *
 * Condições para alerta:
 * 1. `ta.mated_distancia < limiarEpsilon` (MATED em zona segura/ótimo)
 * 2. Pelo menos um |ΔLado| > `limiarDimensao` onde ΔLado = |lado_TA - lado_TM| / lado_TM
 *
 * Retorna o alerta para a dimensão com MAIOR variação, ou null se sem alerta.
 *
 * @param ta              - Triângulo atual com lados normalizados e mated_distancia
 * @param tm              - Triângulo meta com lados normalizados (baseline)
 * @param limiarEpsilon   - Limiar MATED máximo para considerar projeto "estável" (default: 0.05)
 * @param limiarDimensao  - Limiar mínimo de variação de lado para disparar alerta (default: 0.05 = 5%)
 */
export function detectarDesvioSubclinico(
  ta: { lados: { escopo: number; orcamento: number; prazo: number }; mated_distancia: number },
  tm: { lados: { escopo: number; orcamento: number; prazo: number } },
  limiarEpsilon = 0.05,
  limiarDimensao = 0.05
): DesvioSubclinicoAlert | null {
  // MATED >= ε → projeto não está em zona estável → sem alerta subclínico
  if (ta.mated_distancia >= limiarEpsilon) return null

  // ΔLado = |lado_TA - lado_TM| / lado_TM (contra TM, não passo anterior)
  const safe = (tm: number) => (tm > 0 ? tm : 1)
  const deltaE = Math.abs(ta.lados.escopo - tm.lados.escopo) / safe(tm.lados.escopo)
  const deltaO = Math.abs(ta.lados.orcamento - tm.lados.orcamento) / safe(tm.lados.orcamento)
  const deltaP = Math.abs(ta.lados.prazo - tm.lados.prazo) / safe(tm.lados.prazo)

  const deltas: Array<{ dimensao: 'E' | 'P' | 'O'; variacao: number }> = [
    { dimensao: 'E', variacao: deltaE },
    { dimensao: 'O', variacao: deltaO },
    { dimensao: 'P', variacao: deltaP },
  ]

  const max = deltas.reduce((a, b) => (a.variacao >= b.variacao ? a : b))

  if (max.variacao <= limiarDimensao) return null

  return {
    tipo: 'subclinico',
    dimensao: max.dimensao,
    variacao: max.variacao,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mated: ta.mated_distancia,
  }
}

export function calcularConfiancaMonteCarlo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cdt: any,
    iteracoes: number = 1000,
    volatilidade: number | null = null,
    setor: string = 'geral'
): { confianca: number; risco_dispersao: number } {
    // Story 3.4: σ por setor substitui σ=0.1 global anterior
    // Se volatilidade não for fornecida, usa getSigmaSync(setor) como σ Monte Carlo
    const sigma = volatilidade !== null ? volatilidade : getSigmaSync(setor)
    let sucessos = 0
    const areas: number[] = []

    // Box-Muller transform para distribuicao normal
    const gaussianRandom = (): number => {
        let u = 0, v = 0
        while (u === 0) u = Math.random()
        while (v === 0) v = Math.random()
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
    }

    for (let i = 0; i < iteracoes; i++) {
        // Aplica ruido gaussiano (Box-Muller) aos lados normalizados
        // σ = getSigmaSync(setor) quando volatilidade não informada (Story 3.4)
        const En = cdt.lados.escopo * (1 + gaussianRandom() * sigma)
        const On = cdt.lados.orcamento * (1 + gaussianRandom() * sigma)
        const Pn = cdt.lados.prazo * (1 + gaussianRandom() * sigma)

        const mx = Math.max(En, On, Pn)
        const a = En / mx
        const b = On / mx
        const c = Pn / mx

        const area = areaTri(a, b, c)
        if (area > cdt.cdt_area * 0.9) { // Margem de tolerância de 10%
            sucessos++
        }
        areas.push(area)
    }

    const media = areas.reduce((s, a) => s + a, 0) / iteracoes
    const variancia = areas.reduce((s, a) => s + Math.pow(a - media, 2), 0) / iteracoes

    return {
        confianca: (sucessos / iteracoes) * 100,
        risco_dispersao: Math.sqrt(variancia)
    }
}

/**
 * calcularBurndownES — Story 1.3
 * Calcula curva de burndown por Earned Schedule (ES):
 * para cada dia, retorna o % de tarefas que deveriam estar concluídas
 * segundo o plano base (es/ef do CPM).
 *
 * @param tarefas - Array com tarefas CPM (es, ef obrigatórios)
 * @param prazoBase - Duração total do projeto em dias
 */
export function calcularBurndownES(
    tarefas: Array<{ es: number | null; ef: number | null; duracao_estimada: number }>,
    prazoBase: number
): Array<{ dia: number; planejado: number; realizado: number }> {
    if (!prazoBase || tarefas.length === 0) return []
    const step = Math.max(1, Math.floor(prazoBase / 50))
    const resultado: Array<{ dia: number; planejado: number; realizado: number }> = []

    for (let dia = 0; dia <= prazoBase; dia += step) {
        // Planejado: tarefas cujo ef <= dia (deveriam estar concluídas)
        const planejadas = tarefas.filter(t => t.ef !== null && (t.ef ?? 0) <= dia).length
        resultado.push({
            dia,
            planejado: Math.round((planejadas / tarefas.length) * 100 * 10) / 10,
            realizado: 0, // Preenchido pela camada de execução com progresso real
        })
    }

    return resultado
}

/**
 * calcularLadoEDinamico — Story 1.5
 * Calcula o Lado E (Escopo) dinâmico do CDT.
 * E = n_tarefas_atual / n_tarefas_baseline
 * Retorna 1.0 quando não há baseline (projeto novo) ou baseline === 0.
 * Valor > 1.0 indica scope creep; valor < 1.0 indica redução de escopo.
 *
 * @param nAtual    - Número atual de tarefas no projeto
 * @param nBaseline - Número de tarefas no momento do baseline (snapshot inicial)
 */
export function calcularLadoEDinamico(nAtual: number, nBaseline: number | null): number {
    if (!nBaseline || nBaseline === 0) return 1.0
    return Math.round((nAtual / nBaseline) * 10000) / 10000
}

/**
 * FIX-C3: buildCurvaCusto — Curva S de custo acumulado unificada para TM e funcoes.
 *
 * Usa `calcularProjecaoFinanceira` como fonte única de verdade.
 * Quando `useSeed=true` e custosTarefas vazio, usa seed proporcional (M7/Story 1.6).
 * Quando `useSeed=false`, retorna [] se custosTarefas vazio.
 *
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 * @returns { x: number, y: number }[] compatível com gerarTrianguloCDT
 */
export function buildCurvaCusto(
    tarefas: Tarefa[],
    custosTarefas: Record<string, number>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    marcos: any[],
    prazoBase: number,
    projectCost: number,
    useSeed: boolean
): { x: number; y: number }[] {
    if (!prazoBase || tarefas.length === 0) return []
    const totalCostosDefinidos = Object.values(custosTarefas).reduce((s, v) => s + v, 0)
    if (totalCostosDefinidos === 0) {
        if (!useSeed || projectCost <= 0) return []
        const seeded = seedCustosTarefas(tarefas, projectCost)
        return calcularProjecaoFinanceira(tarefas, seeded, marcos, prazoBase)
            .map(p => ({ x: p.dia, y: p.acumulado }))
    }
    return calcularProjecaoFinanceira(tarefas, custosTarefas, marcos, prazoBase)
        .map(p => ({ x: p.dia, y: p.acumulado }))
}

// ═══════════════════════════════════════════════════════════════════════════
// MASTERPLAN-X §2 — Motor Físico-Integral (MetodoAura v3.0)
// Story 7.0 | Sessão 17 | 2026-03-28
// Autoridade: @aura-math + @roberta
// ═══════════════════════════════════════════════════════════════════════════

export interface PontoInflexao {
    index: number
    x: number
    slope: number   // tangente local f'(t_i)
}

export interface RetaMestra {
    slope: number           // coeficiente angular da reta ajustada
    intercept: number       // interseção com Y
    r2: number              // coeficiente de determinação (0–1)
    pontosInflexao: PontoInflexao[]
    intervaloConfianca: [number, number]  // ±1σ do slope
}

/**
 * buildRetaMestra — Regressão piecewise nos pontos de inflexão da curva.
 *
 * Detecta pontos de inflexão (onde Δ²f muda de sinal), calcula a tangente
 * local em cada um e faz regressão linear ponderada pelo |Δ²f| (peso maior
 * onde a curvatura é mais intensa).
 *
 * R² baixo (< 0.3) indica comportamento caótico — é ele próprio um KPI de risco.
 *
 * @param curva  - Array {x, y} da curva (custo acumulado ou burndown prazo)
 * @returns RetaMestra com slope, intercept, R², pontos de inflexão e IC
 */
export function buildRetaMestra(curva: { x: number; y: number }[]): RetaMestra {
    if (curva.length < 3) {
        return { slope: 0, intercept: curva[0]?.y ?? 0, r2: 0, pontosInflexao: [], intervaloConfianca: [0, 0] }
    }

    // ── Passo 1: detectar pontos de inflexão via diferença segunda ───────────
    const inflexoes: PontoInflexao[] = []
    for (let i = 1; i < curva.length - 1; i++) {
        const d2 = (curva[i + 1].y - curva[i].y) - (curva[i].y - curva[i - 1].y)
        const d2Prev = i > 1
            ? (curva[i].y - curva[i - 1].y) - (curva[i - 1].y - curva[i - 2].y)
            : d2
        // Mudança de sinal → ponto de inflexão
        if (Math.sign(d2) !== Math.sign(d2Prev) && Math.abs(d2) > 1e-9) {
            const dx = curva[i + 1].x - curva[i - 1].x || 1
            const slope = (curva[i + 1].y - curva[i - 1].y) / dx
            inflexoes.push({ index: i, x: curva[i].x, slope })
        }
    }

    // Sempre incluir extremos como âncoras
    const dx0 = curva[1].x - curva[0].x || 1
    const dxN = curva[curva.length - 1].x - curva[curva.length - 2].x || 1
    const pontos: PontoInflexao[] = [
        { index: 0, x: curva[0].x, slope: (curva[1].y - curva[0].y) / dx0 },
        ...inflexoes,
        { index: curva.length - 1, x: curva[curva.length - 1].x, slope: (curva[curva.length - 1].y - curva[curva.length - 2].y) / dxN },
    ]

    // ── Passo 2: regressão linear ponderada nos pontos ────────────────────────
    // Peso = |slope| (curvatura intensa = mais peso)
    const pesos = pontos.map(p => Math.abs(p.slope) + 1e-6)
    const W = pesos.reduce((s, w) => s + w, 0)
    const xMed = pontos.reduce((s, p, i) => s + pesos[i] * p.x, 0) / W
    const yMed = pontos.reduce((s, p, i) => s + pesos[i] * (curva[p.index]?.y ?? 0), 0) / W

    let num = 0, den = 0
    pontos.forEach((p, i) => {
        const yi = curva[p.index]?.y ?? 0
        num += pesos[i] * (p.x - xMed) * (yi - yMed)
        den += pesos[i] * (p.x - xMed) ** 2
    })
    const slope = den > 1e-12 ? num / den : 0
    const intercept = yMed - slope * xMed

    // ── Passo 3: R² ponderado ─────────────────────────────────────────────────
    let ssRes = 0, ssTot = 0
    pontos.forEach((p, i) => {
        const yi = curva[p.index]?.y ?? 0
        const yHat = slope * p.x + intercept
        ssRes += pesos[i] * (yi - yHat) ** 2
        ssTot += pesos[i] * (yi - yMed) ** 2
    })
    const r2 = ssTot > 1e-12 ? Math.max(0, 1 - ssRes / ssTot) : 1

    // ── Passo 4: Intervalo de confiança do slope (±1σ) ───────────────────────
    const sigma = pontos.length > 2 && den > 1e-12
        ? Math.sqrt(ssRes / ((pontos.length - 2) * den))
        : 0

    return {
        slope,
        intercept,
        r2: Math.min(1, r2),
        pontosInflexao: pontos,
        intervaloConfianca: [slope - sigma, slope + sigma],
    }
}

/**
 * calcularAMancha — Área de cobertura total das curvas reais de Custo e Prazo.
 *
 * A_mancha = Σ max(C_norm(tᵢ), P_norm(tᵢ)) × Δt
 *
 * Representa o campo real de operação do projeto. Quanto maior a divergência
 * entre as curvas, maior a A_mancha.
 *
 * @param curvaCusto  - Curva S acumulada de custo normalizada [0,1]
 * @param curvaPrazo  - Burndown de prazo normalizado [0,1]
 * @returns A_mancha (escalar) e A_intersecao (onde as curvas se sobrepõem)
 */
export function calcularAMancha(
    curvaCusto: { x: number; y: number }[],
    curvaPrazo: { x: number; y: number }[]
): { aMancha: number; aIntersecao: number } {
    if (curvaCusto.length < 2 || curvaPrazo.length < 2) return { aMancha: 0, aIntersecao: 0 }

    // Normalizar ambas as curvas para [0,1] no eixo Y
    const maxC = Math.max(...curvaCusto.map(p => p.y), 1e-9)
    const maxP = Math.max(...curvaPrazo.map(p => p.y), 1e-9)
    const xMin = Math.min(curvaCusto[0].x, curvaPrazo[0].x)
    const xMax = Math.max(curvaCusto[curvaCusto.length - 1].x, curvaPrazo[curvaPrazo.length - 1].x)

    if (xMax <= xMin) return { aMancha: 0, aIntersecao: 0 }

    // Interpolação linear simples em pontos uniformes
    const N = Math.min(200, Math.max(curvaCusto.length, curvaPrazo.length))
    const step = (xMax - xMin) / N

    const interpolar = (curva: { x: number; y: number }[], x: number, maxVal: number): number => {
        if (x <= curva[0].x) return curva[0].y / maxVal
        if (x >= curva[curva.length - 1].x) return curva[curva.length - 1].y / maxVal
        for (let i = 0; i < curva.length - 1; i++) {
            if (curva[i].x <= x && x <= curva[i + 1].x) {
                const t = (x - curva[i].x) / (curva[i + 1].x - curva[i].x || 1)
                return (curva[i].y + t * (curva[i + 1].y - curva[i].y)) / maxVal
            }
        }
        return curva[curva.length - 1].y / maxVal
    }

    let aMancha = 0, aIntersecao = 0
    for (let i = 0; i < N; i++) {
        const x = xMin + i * step
        const c = interpolar(curvaCusto, x, maxC)
        const p = interpolar(curvaPrazo, x, maxP)
        aMancha += Math.max(c, p) * step
        aIntersecao += Math.min(c, p) * step
    }

    return { aMancha, aIntersecao }
}

/**
 * calcularARebarba — Zona plástica: limite de escoamento do projeto.
 *
 * A_rebarba = A_mancha − A_TM
 *
 * Análogo à transição elástico→plástico em Resistência de Materiais.
 * Valor positivo = curvas reais excedem o modelo linear (triângulo).
 * Quanto maior, mais o projeto real se afasta da abstração linear.
 */
export function calcularARebarba(aMancha: number, aTM: number): number {
    return Math.max(0, aMancha - aTM)
}

// ═══════════════════════════════════════════════════════════════════════════
// EP-ESCALENO ESC-6 — Cinemática Inversa do TM
// Mapeamento bidirecional: TM → Gráficos (inverse) + tradução PM
// Sessão 24 | 2026-03-29 | Autoridade: @aura-math + @roberta
// ═══════════════════════════════════════════════════════════════════════════

export interface InverseTMResult {
    C_novo: number
    P_novo: number
    mc_norm_novo: number
    mp_norm_novo: number
    cetValida: boolean
}

export interface DeltaGeometricoPM {
    deltaDias: number
    deltaReais: number
    descricao: string
}

/**
 * inverseTM — Dado E fixo e novos C,P desejados, valida CEt e retorna slopes normalizados.
 * O inverso de C = √(1 + mc²) é mc = √(C² - 1).
 */
export function inverseTM(E: number, C_novo: number, P_novo: number): InverseTMResult {
    const cetValida = checkCDTExistence(E, C_novo, P_novo)
    const mc_norm_novo = C_novo >= 1 ? Math.sqrt(C_novo * C_novo - 1) : 0
    const mp_norm_novo = P_novo >= 1 ? Math.sqrt(P_novo * P_novo - 1) : 0
    return { C_novo, P_novo, mc_norm_novo, mp_norm_novo, cetValida }
}

/**
 * inverseFromAngle — Dado um delta angular em graus sobre um ângulo específico,
 * calcula os novos lados C e P mantendo E fixo.
 *
 * Cinemática inversa: ângulo desejado → novos comprimentos dos lados.
 * Usa lei dos cossenos para resolver o triângulo dado E e o novo ângulo.
 *
 * @param angulo - qual ângulo variar ('alpha' | 'beta' | 'gamma')
 * @param deltaGraus - variação em graus (positivo = abrir, negativo = fechar)
 */
export function inverseFromAngle(
    E: number, C: number, P: number,
    angulo: 'alpha' | 'beta' | 'gamma',
    deltaGraus: number
): InverseTMResult {
    const toRad = (d: number) => d * Math.PI / 180
    // Sessão 29: usar clampCos unificado dos guards (G4)
    const angAlpha = Math.acos(clampCos((E * E + P * P - C * C) / (2 * E * P || 1)))
    const angBeta  = Math.acos(clampCos((E * E + C * C - P * P) / (2 * E * C || 1)))
    const angGamma = Math.acos(clampCos((C * C + P * P - E * E) / (2 * C * P || 1)))

    let novoAlpha = angAlpha, novoBeta = angBeta, novoGamma = angGamma
    const delta = toRad(deltaGraus)

    if (angulo === 'gamma') {
        // γ varia, E fixo → resolver C e P via lei dos cossenos com novo γ
        novoGamma = Math.max(0.01, Math.min(Math.PI - 0.01, angGamma + delta))
        // Com E fixo e γ conhecido: E² = C² + P² - 2CP·cos(γ)
        // Manter a razão C/P constante (deformação proporcional)
        const ratio = C / (P || 1)
        // P_novo² × (ratio² + 1 - 2×ratio×cos(γ_novo)) = E²
        const k = ratio * ratio + 1 - 2 * ratio * Math.cos(novoGamma)
        const P_novo = k > 1e-9 ? Math.sqrt(E * E / k) : P
        const C_novo = P_novo * ratio
        return inverseTM(E, C_novo, P_novo)
    } else if (angulo === 'alpha') {
        // α varia, E fixo → P muda, C ajusta
        novoAlpha = Math.max(0.01, Math.min(Math.PI - 0.01, angAlpha + delta))
        novoGamma = Math.PI - novoAlpha - novoBeta
        if (novoGamma <= 0 || novoGamma >= Math.PI) return inverseTM(E, C, P)
        // Lei dos senos: E/sin(γ) = C/sin(α) = P/sin(β)
        const k = E / Math.sin(novoGamma)
        const C_novo = Math.abs(k * Math.sin(novoAlpha))
        const P_novo = Math.abs(k * Math.sin(novoBeta))
        return inverseTM(E, C_novo, P_novo)
    } else {
        // β varia, E fixo → C muda, P ajusta
        novoBeta = Math.max(0.01, Math.min(Math.PI - 0.01, angBeta + delta))
        novoGamma = Math.PI - novoAlpha - novoBeta
        if (novoGamma <= 0 || novoGamma >= Math.PI) return inverseTM(E, C, P)
        const k = E / Math.sin(novoGamma)
        const C_novo = Math.abs(k * Math.sin(novoAlpha))
        const P_novo = Math.abs(k * Math.sin(novoBeta))
        return inverseTM(E, C_novo, P_novo)
    }
}

/**
 * traduzirDeltaGeometrico — Converte variação de slopes normalizados em
 * termos de PM: dias de prazo e R$ de custo.
 *
 * @param mc_antes - mc_norm antes da mudança
 * @param mc_depois - mc_norm depois
 * @param mp_antes - mp_norm antes
 * @param mp_depois - mp_norm depois
 * @param prazoBase - prazo total em dias
 * @param custoTotal - custo total em R$
 */
export function traduzirDeltaGeometrico(
    mc_antes: number, mc_depois: number,
    mp_antes: number, mp_depois: number,
    prazoBase: number, custoTotal: number
): DeltaGeometricoPM {
    // mc_norm = |slope| / avgRate → slope = mc_norm × avgRate
    // avgRate = range / T → slope = mc_norm × (range / T)
    // Para custo: range ≈ custoTotal, T ≈ prazoBase
    // Para prazo: range ≈ 100 (burndown %), T ≈ prazoBase
    const deltaMc = mc_depois - mc_antes
    const deltaMp = mp_depois - mp_antes

    // deltaReais = variação proporcional no custo total
    const deltaReais = Math.round(deltaMc * custoTotal / (mc_antes || 1))
    // deltaDias = variação proporcional no prazo
    const deltaDias = Math.round(deltaMp * prazoBase / (mp_antes || 1))

    const partes: string[] = []
    if (Math.abs(deltaDias) > 0) {
        partes.push(deltaDias > 0 ? `+${deltaDias} dias` : `${deltaDias} dias`)
    }
    if (Math.abs(deltaReais) > 0) {
        const fmt = Math.abs(deltaReais) >= 1000
            ? `R$${(deltaReais / 1000).toFixed(0)}k`
            : `R$${deltaReais}`
        partes.push(deltaReais > 0 ? `+${fmt}` : fmt)
    }

    return {
        deltaDias,
        deltaReais,
        descricao: partes.length > 0 ? partes.join(', ') : 'sem impacto mensurável',
    }
}

/**
 * buildCurvaLiquidez — Protocolo β: curva de liquidez orçamentária (função inversa do custo).
 *
 * L(t) = orcamentoBase - C(t)
 *
 * Curva decrescente: começa no orçamento total, cai conforme o custo acumula.
 * Quando L(t) atinge a reserva de contingência → primeiro alerta.
 * Quando L(t) atinge 0 → fratura orçamentária.
 *
 * @param curvaCusto - Curva S de custo acumulado {x, y}[]
 * @param orcamentoBase - Orçamento total do projeto
 * @param reservaContingencia - Valor da reserva de contingência (opcional)
 */
export function buildCurvaLiquidez(
    curvaCusto: { x: number; y: number }[],
    orcamentoBase: number,
    reservaContingencia: number = 0
): { x: number; y: number; alerta: boolean }[] {
    if (curvaCusto.length === 0 || orcamentoBase <= 0) return []
    return curvaCusto.map(p => ({
        x: p.x,
        y: Math.max(0, orcamentoBase - p.y),
        alerta: (orcamentoBase - p.y) <= reservaContingencia,
    }))
}

/**
 * classificarFormaTriangulo — Determina a natureza geométrica do triângulo.
 *
 * Retorna: 'acutangulo' | 'obtusangulo_c' | 'obtusangulo_p' | 'retangulo' | 'invalido'
 * com tolerância ε = 2° para classificação de ângulos retos.
 *
 * @param E  - Escopo (normalizado)
 * @param C  - Custo (normalizado)
 * @param P  - Prazo (normalizado)
 */
export function classificarFormaTriangulo(
    E: number, C: number, P: number
): 'acutangulo' | 'obtusangulo_c' | 'obtusangulo_p' | 'retangulo' | 'invalido' {
    // Verificar CEt básica
    if (Math.abs(P - C) >= E || E >= P + C) return 'invalido'

    // Lei dos Cossenos: ângulos opostos aos lados
    const cosE = (P ** 2 + C ** 2 - E ** 2) / (2 * P * C)  // ângulo oposto a E
    const cosC = (E ** 2 + P ** 2 - C ** 2) / (2 * E * P)  // ângulo oposto a C (custo)
    const cosP = (E ** 2 + C ** 2 - P ** 2) / (2 * E * C)  // ângulo oposto a P (prazo)

    const EPS_RAD = Math.PI * 2 / 180  // 2° de tolerância

    // Ângulo reto (não-ε)
    if (Math.abs(cosC) < Math.sin(EPS_RAD)) return 'retangulo'
    if (Math.abs(cosP) < Math.sin(EPS_RAD)) return 'retangulo'
    if (Math.abs(cosE) < Math.sin(EPS_RAD)) return 'retangulo'

    // Obtusângulo
    if (cosC < 0) return 'obtusangulo_c'
    if (cosP < 0) return 'obtusangulo_p'

    // Acutângulo
    return 'acutangulo'
}

/**
 * verificarCetInferior — CEt Inferior: valida que C ≥ y₀ (custo mínimo irredutível).
 *
 * Novo gate introduzido no MetodoAura v3.0. O custo de um projeto nunca pode
 * ser comprimido abaixo do custo de mobilização comprometido (y₀).
 *
 * @param custoAtual    - Custo atual do projeto (normalizado ou em R$)
 * @param y0            - Custo de mobilização (mesma escala)
 * @returns true se válido, false se violação da CEt inferior
 */
export function verificarCetInferior(custoAtual: number, y0: number): boolean {
    if (y0 <= 0) return true  // y₀ = 0 → sem restrição inferior
    return custoAtual >= y0
}

// ─────────────────────────────────────────────────────────────────────────────
// calcularCompensacao — Peso e Contrapeso do TM (MetodoAura v3.0 §3.4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resultado do cálculo de compensação do Triângulo Matriz.
 * Dado um delta proposto em P (prazo), informa quanto C (custo) precisa
 * variar para manter a área do TM igual a area_alvo.
 */
export interface CompensacaoResult {
    /** Variação necessária em C para manter a área (negativo = reduzir custo) */
    delta_c: number
    /** Novo valor de C após compensação */
    c_novo: number
    /** Novo valor de P após delta */
    p_novo: number
    /** Delta proposto em P (entrada) */
    delta_p: number
    /** true se o novo triângulo (e, p_novo, c_novo) satisfaz a CET */
    viavel: boolean
    /** Área real obtida com (e, p_novo, c_novo) — deve ≈ area_alvo */
    area_obtida: number
    /** true se não existe nenhum c que permita atingir area_alvo com p_novo */
    sem_solucao: boolean
}

/**
 * calcularCompensacao — Peso e contrapeso do TM.
 *
 * Dado um delta em P (prazo), calcula o delta em C (custo) necessário
 * para manter a área do triângulo igual a area_alvo (Heron).
 *
 * Fundamento geométrico: para lados e e p_novo fixos, a área máxima possível é
 *   A_max = (1/2) · e · p_novo   (quando o ângulo entre eles é 90°)
 * O lado c que maximiza a área é c_pico = sqrt(e² + p_novo²).
 * A função área(c) é côncava em c → dois valores de c produzem a mesma área
 * (um em cada lado do pico). A solução mais próxima do c atual é preferida.
 *
 * Usa bisecção de 64 iterações (precisão ~1e-18 no espaço normalizado).
 *
 * @param e          - Lado escopo (sempre 1 no espaço normalizado)
 * @param p          - Lado prazo atual
 * @param c          - Lado custo atual
 * @param delta_p    - Variação proposta em P (+ aumenta prazo)
 * @param area_alvo  - Área alvo a preservar (normalmente área do TM baseline)
 * @returns CompensacaoResult
 *
 * @example
 * // Projeto em baseline (e=1, p=1.414, c=1.414, area≈0.5)
 * // PM quer aumentar prazo em 0.1 → quanto custo deve ser reduzido?
 * const r = calcularCompensacao(1, 1.414, 1.414, 0.1, 0.5)
 * // r.delta_c < 0 → custo deve ser reduzido para manter área
 *
 * Referência: MetodoAura v3.0 §3.4 | Squad AURA debate 2026-03-28
 */
export function calcularCompensacao(
    e: number,
    p: number,
    c: number,
    delta_p: number,
    area_alvo: number
): CompensacaoResult {
    const p_novo = p + delta_p

    if (p_novo <= 0 || e <= 0 || area_alvo <= 0) {
        return { delta_c: 0, c_novo: c, p_novo, delta_p, viavel: false, area_obtida: 0, sem_solucao: true }
    }

    // c_pico: valor de c que maximiza a área com e e p_novo fixos (ângulo 90° entre eles)
    const c_pico = Math.sqrt(e * e + p_novo * p_novo)
    // A_max = (1/2) * e * p_novo * sin(90°) = e * p_novo / 2
    const area_max = 0.5 * e * p_novo

    if (area_alvo >= area_max - 1e-10) {
        // Área pedida excede (ou iguala) o máximo possível — sem solução real
        return { delta_c: 0, c_novo: c, p_novo, delta_p, viavel: false, area_obtida: area_max, sem_solucao: true }
    }

    // Limites da CET para c (com margem numérica)
    const cet_lo = Math.abs(p_novo - e) + 1e-9
    const cet_hi = p_novo + e - 1e-9

    // Bissecção no lado esquerdo: c ∈ [cet_lo, c_pico] → área cresce de 0 → area_max
    let c_esq: number | null = null
    if (cet_lo < c_pico) {
        let blo = cet_lo, bhi = Math.min(c_pico, cet_hi)
        for (let i = 0; i < 64; i++) {
            const mid = (blo + bhi) / 2
            if (areaTri(e, p_novo, mid) < area_alvo) blo = mid
            else bhi = mid
        }
        c_esq = (blo + bhi) / 2
    }

    // Bissecção no lado direito: c ∈ [c_pico, cet_hi] → área decresce de area_max → 0
    let c_dir: number | null = null
    if (c_pico < cet_hi) {
        let blo = Math.max(c_pico, cet_lo), bhi = cet_hi
        for (let i = 0; i < 64; i++) {
            const mid = (blo + bhi) / 2
            if (areaTri(e, p_novo, mid) > area_alvo) blo = mid
            else bhi = mid
        }
        c_dir = (blo + bhi) / 2
    }

    if (c_esq === null && c_dir === null) {
        return { delta_c: 0, c_novo: c, p_novo, delta_p, viavel: false, area_obtida: 0, sem_solucao: true }
    }

    // Preferir a solução mais próxima do c atual
    let c_novo: number
    if (c_esq !== null && c_dir !== null) {
        c_novo = Math.abs(c_esq - c) <= Math.abs(c_dir - c) ? c_esq : c_dir
    } else {
        c_novo = (c_esq ?? c_dir) as number
    }

    const delta_c = c_novo - c
    const area_obtida = areaTri(e, p_novo, c_novo)
    const viavel = checkCDTExistence(e, c_novo, p_novo)

    return { delta_c, c_novo, p_novo, delta_p, viavel, area_obtida, sem_solucao: false }
}
