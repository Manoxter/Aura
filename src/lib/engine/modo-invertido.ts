import { ResultadoSC } from './clairaut'
import { TrianguloCDT, Ponto2D } from './math'
import { projectPointToLine } from './triangle-logic'

// ═══════════════════════════════════════════════════════════════════════════
// modo-invertido.ts — Transformações geométricas do Modo Invertido (EP-02)
// Story 2.5 — Sprint TM-SHADOW
//
// Quando o triângulo entra em regime obtuso (β ou γ), o "mundo invertido"
// é o triângulo resultante de refletir o vértice obtuso através do lado oposto.
// Essa reflexão cria o ALVO de recuperação para o gestor de projeto.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Reflete um ponto sobre a reta definida por lineStart→lineEnd.
 * P' = 2 · foot(P, line) − P
 */
function reflectPoint(point: Ponto2D, lineStart: Ponto2D, lineEnd: Ponto2D): Ponto2D {
    const foot = projectPointToLine(
        { x: point.x, y: point.y },
        { x: lineStart.x, y: lineStart.y },
        { x: lineEnd.x, y: lineEnd.y }
    )
    return {
        x: 2 * foot.x - point.x,
        y: 2 * foot.y - point.y,
    }
}

/**
 * Aplica a transformação geométrica do Modo Invertido ao triângulo CDT.
 *
 * ## Regras por regime:
 * - `agudo` | `null` → triangle inalterado (sem inversão necessária)
 * - `singular`       → triangle inalterado (estado degenerado — sem reflexão segura)
 * - `obtuso_beta`    → E_vertex refletido sobre a reta P–O
 *                      (ω > 90° em E_vertex → E' restaura acutitude — custo em colapso)
 * - `obtuso_gamma`   → P_vertex refletido sobre a reta E–O
 *                      (α > 90° em P_vertex → P' restaura acutitude — prazo em colapso)
 *
 * @param triangle - Triângulo CDT com vértices E, P, O
 * @param resultado - Resultado da Síntese de Clairaut (null = sem dados)
 * @returns Triângulo transformado (ou original quando não há inversão)
 */
export function inverterCoordenadas(
    triangle: TrianguloCDT,
    resultado: ResultadoSC | null
): TrianguloCDT {
    if (!resultado) return triangle
    if (resultado.tipo === 'agudo' || resultado.tipo === 'singular') return triangle

    if (resultado.tipo === 'obtuso_beta') {
        // ω > 90° em E_vertex (vértice entre lados escopo E e prazo P)
        // Reflectir E através da reta P→O restaura acutitude — custo em colapso
        const E_inv = reflectPoint(triangle.E, triangle.P, triangle.O)
        return { ...triangle, E: E_inv }
    }

    // obtuso_gamma: α > 90° em P_vertex (vértice entre lados escopo E e orcamento O)
    // Reflectir P através da reta E→O restaura acutitude — prazo em colapso
    const P_inv = reflectPoint(triangle.P, triangle.E, triangle.O)
    return { ...triangle, P: P_inv }
}

// ─── Story 2.9 — Mensagens de Crise Positiva ──────────────────────────────────

/**
 * Mensagens de Crise Positiva para o Gabinete — exibidas quando o triângulo
 * transita de regime obtuso (β/γ) para agudo (Remissão detectada).
 */
export const MSG_REMISSAO_POSITIVA: Record<'beta' | 'gamma', string> = {
    beta: '✅ Remissão β detectada — orçamento recuperado. O triângulo retornou ao regime agudo. Klauss sugere consolidar as medidas que reverteram a pressão de custo.',
    gamma: '✅ Remissão γ detectada — cronograma recuperado. O triângulo retornou ao regime agudo. Klauss sugere documentar as ações que reverteram a pressão de prazo.',
}

// ─── Story 13.4 — Prometeu Extrínseco: alerta de risco crítico ───────────────

/**
 * Mensagem exibida pelo Klauss quando um risco externo com score_rc > 0.6
 * é identificado no projeto (Prometeu Extrínseco — ameaça externa ao triângulo).
 * AC-1/AC-4 Story 13.4.
 */
export const MSG_RISCO_CRITICO =
    '🔴 Prometeu Extrínseco: risco crítico identificado (score_rc > 0.6). ' +
    'Uma ameaça externa compromete o equilíbrio do triângulo E–P–O. ' +
    'Klauss recomenda revisão imediata do plano de resposta a riscos.'

// ─── Story 2.7 — Detectar Remissão ───────────────────────────────────────────

export interface RemissaoResult {
    /** true quando o triângulo transita de obtuso para agudo */
    remitiu: boolean
    /** tipo de regime anterior quando remitiu = true */
    tipoAnterior?: 'beta' | 'gamma'
}

/**
 * Detecta se o triângulo entrou em Remissão: transição obtuso → agudo.
 *
 * Remissão = recuperação geométrica (projeto sai do colapso orçamentário/prazo).
 *
 * @param anterior - ResultadoSC do ciclo anterior
 * @param atual    - ResultadoSC do ciclo atual
 */
export function detectarRemissao(
    anterior: ResultadoSC | null,
    atual: ResultadoSC | null
): RemissaoResult {
    if (!anterior || !atual) return { remitiu: false }
    if (anterior.tipo === 'agudo' || anterior.tipo === 'singular') return { remitiu: false }
    if (atual.tipo !== 'agudo') return { remitiu: false }

    return {
        remitiu: true,
        tipoAnterior: anterior.tipo === 'obtuso_beta' ? 'beta' : 'gamma',
    }
}
