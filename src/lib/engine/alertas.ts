import { areaTri } from './math'

// ═══════════════════════════════════════════════════════════════════════════
// alertas.ts — Alerta Automático TA/TM Desvio (Story 5.5)
// Detecta quando o desvio entre Triângulo Atual e Triângulo Meta
// ultrapassa o limiar configurado e classifica a zona MATED.
// ═══════════════════════════════════════════════════════════════════════════

export type ZonaMATED = 'OTIMO' | 'SEGURO' | 'RISCO' | 'CRISE'

export interface AlertaResult {
    tipo: 'desvio_clinico'
    mated: number
    zona: ZonaMATED
    zonaAnterior: string
    limiar: number
    projetoId: string
}

export interface AlertaConfig {
    /** Limiar de desvio mínimo para emitir alerta (default: 0.05 = 5%) */
    limiar?: number
    /** Última zona detectada (para throttle — não emite se zona não mudou) */
    zonaAtual?: string
}

/**
 * Calcula a área de um triângulo a partir dos seus lados (usando fórmula de Heron).
 * Delega para areaTri do engine de math.
 */
function calcularAreaTriangulo(E: number, P: number, O: number): number {
    return areaTri(E, P, O)
}

/**
 * Classifica a zona MATED baseada no desvio percentual entre TA e TM.
 *
 * Faixas (MetodoAura):
 * - OTIMO:   desvio < 5%   (< 0.05)
 * - SEGURO:  desvio < 15%  (< 0.15)
 * - RISCO:   desvio < 30%  (< 0.30)
 * - CRISE:   desvio >= 30% (>= 0.30)
 */
export function classificarZonaDesvio(desvio: number): ZonaMATED {
    if (desvio < 0.05) return 'OTIMO'
    if (desvio < 0.15) return 'SEGURO'
    if (desvio < 0.30) return 'RISCO'
    return 'CRISE'
}

/**
 * Verifica alertas de desvio clínico entre Triângulo Atual (TA) e Triângulo Meta (TM).
 *
 * Algoritmo:
 * 1. Calcula área de TA e TM usando fórmula de Heron (via areaTri)
 * 2. Computa desvio relativo: |area_ta - area_tm| / area_tm
 * 3. Classifica zona MATED pelo desvio
 * 4. Gera alerta SOMENTE se:
 *    a. Desvio >= limiar configurado (default: 0.05)
 *    b. Zona mudou desde a última detecção (throttle por zona)
 *
 * @param ta     - Triângulo Atual com lados E, P, O (normalizados 0-1)
 * @param tm     - Triângulo Meta com lados E, P, O (normalizados 0-1)
 * @param config - Configuração: limiar (default 0.05) e zonaAtual (para throttle)
 * @returns      - Array de AlertaResult (vazio se nenhum alerta deve ser emitido)
 */
export function verificarAlertas(
    ta: { E: number; P: number; O: number },
    tm: { E: number; P: number; O: number },
    config: AlertaConfig = {}
): AlertaResult[] {
    const limiar = config.limiar ?? 0.05
    const zonaAnterior = config.zonaAtual ?? ''

    // Calcula áreas dos triângulos
    const areaTa = calcularAreaTriangulo(ta.E, ta.P, ta.O)
    const areaTm = calcularAreaTriangulo(tm.E, tm.P, tm.O)

    // Se TM tem área zero ou inválida, não é possível calcular desvio
    if (areaTm <= 0) return []

    // Desvio relativo entre TA e TM
    const desvio = Math.abs(areaTa - areaTm) / areaTm

    // Classifica zona baseada no desvio
    const zona = classificarZonaDesvio(desvio)

    // Throttle: não emitir alerta se a zona não mudou
    if (zona === zonaAnterior) return []

    // Só emite alerta se desvio >= limiar configurado
    if (desvio < limiar) return []

    return [
        {
            tipo: 'desvio_clinico',
            mated: desvio,
            zona,
            zonaAnterior,
            limiar,
            projetoId: '',  // será preenchido pelo caller (useAlertas)
        },
    ]
}

// ═══════════════════════════════════════════════════════════════════════════
// Aceleração Predatória (Story 5.10)
// Detecta quando ângulo E–P fecha enquanto IQ cai em 2 passos consecutivos.
// ═══════════════════════════════════════════════════════════════════════════

export interface TAPoint {
    /** Lados do Triângulo Atual */
    E: number
    P: number
    O: number
    /** Índice de Qualidade (IQ) naquele momento — valor 0..1 */
    iq: number
}

export interface AceleracaoPredatoriaResult {
    tipo: 'aceleracao_predatoria'
    /** Ângulo E–P no passo t-1 (radianos) */
    anguloEP_anterior: number
    /** Ângulo E–P no passo t (radianos) */
    anguloEP_atual: number
    /** IQ no passo t-1 */
    iq_anterior: number
    /** IQ no passo t */
    iq_atual: number
}

/**
 * Detecta Aceleração Predatória.
 *
 * Condição (validada por @aura-production):
 *   ângulo_EP[t] < ângulo_EP[t-1] × 0.95  (ângulo fechando ≥5%)
 *   E IQ[t] < IQ[t-1] × 0.97              (IQ caindo ≥3%)
 *   Em 2 passos consecutivos (último par do histórico).
 *
 * Ângulo E–P = atan2(P, E) em radianos (mede abertura lado-Prazo vs lado-Escopo).
 *
 * @param historico  - Array de TAPoints, ordem cronológica. Mínimo 2 pontos.
 * @returns          - AceleracaoPredatoriaResult se detectado; null caso contrário.
 */
export function detectarAceleracaoPredatoria(
    historico: TAPoint[]
): AceleracaoPredatoriaResult | null {
    if (historico.length < 2) return null

    const prev = historico[historico.length - 2]
    const curr = historico[historico.length - 1]

    const anguloAnterior = Math.atan2(prev.P, prev.E)
    const anguloAtual = Math.atan2(curr.P, curr.E)

    const anguloFechou = anguloAtual < anguloAnterior * 0.95
    const iqCaiu = curr.iq < prev.iq * 0.97

    if (anguloFechou && iqCaiu) {
        return {
            tipo: 'aceleracao_predatoria',
            anguloEP_anterior: anguloAnterior,
            anguloEP_atual: anguloAtual,
            iq_anterior: prev.iq,
            iq_atual: curr.iq,
        }
    }

    return null
}

// ═══════════════════════════════════════════════════════════════════════════
// Aceleração Legítima + Classificador (Story 2.4)
// Semântica do ângulo E–P: aceleração é legítima quando IQ se mantém ou sobe.
// ═══════════════════════════════════════════════════════════════════════════

export interface AceleracaoLegitimaResult {
    tipo: 'aceleracao_legitima'
    anguloEP_anterior: number
    anguloEP_atual: number
    iq_anterior: number
    iq_atual: number
}

/**
 * Detecta Aceleração Legítima.
 *
 * Condição (validada por @aura-production):
 *   ângulo_EP[t] < ângulo_EP[t-1] × 0.95  (ângulo fechando ≥5%)
 *   E IQ[t] >= IQ[t-1] × 0.97             (IQ estável ou crescendo)
 *
 * Significa que o projeto está genuinamente acelerando sem perda de qualidade.
 *
 * @param historico - Array de TAPoints, ordem cronológica. Mínimo 2 pontos.
 */
export function detectarAceleracaoLegitima(
    historico: TAPoint[]
): AceleracaoLegitimaResult | null {
    if (historico.length < 2) return null

    const prev = historico[historico.length - 2]
    const curr = historico[historico.length - 1]

    const anguloAnterior = Math.atan2(prev.P, prev.E)
    const anguloAtual = Math.atan2(curr.P, curr.E)

    const anguloFechou = anguloAtual < anguloAnterior * 0.95
    const iqEstavel = curr.iq >= prev.iq * 0.97

    if (anguloFechou && iqEstavel) {
        return {
            tipo: 'aceleracao_legitima',
            anguloEP_anterior: anguloAnterior,
            anguloEP_atual: anguloAtual,
            iq_anterior: prev.iq,
            iq_atual: curr.iq,
        }
    }

    return null
}

export type TipoAceleracao = 'legitima' | 'predatoria' | 'neutra'

/**
 * Classifica o tipo de aceleração com base no histórico de TAPoints.
 *
 * - 'predatoria' : ângulo E–P fecha + IQ cai (alerta vermelho)
 * - 'legitima'   : ângulo E–P fecha + IQ estável/subindo (evento positivo)
 * - 'neutra'     : nenhum dos dois (estado normal)
 *
 * Predatória tem precedência sobre legítima se ambas as condições fossem ativas.
 */
export function classificarAceleracao(historico: TAPoint[]): TipoAceleracao {
    if (detectarAceleracaoPredatoria(historico)) return 'predatoria'
    if (detectarAceleracaoLegitima(historico)) return 'legitima'
    return 'neutra'
}
