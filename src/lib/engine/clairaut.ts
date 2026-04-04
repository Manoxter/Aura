/**
 * Síntese de Clairaut — Motor de Classificação Morfológica
 *
 * Classifica o triângulo de monitoramento (E, P, O) e determina o protocolo
 * ativo: Agudo, β (orçamento em colapso) ou γ (prazo em colapso).
 * Detecta Estado Singular (ângulo = 90°) antes de qualquer fitting.
 *
 * Story 2.0-engine — Sprint SC-FOUNDATION
 */

const RAD_TO_DEG = 180 / Math.PI
const DEG_TO_RAD = Math.PI / 180
const SINGULARIDADE_TOLERANCIA = 0.01 // graus

// ─── Tipos Exportados ──────────────────────────────────────────────────────────

export type TipoProtocolo = 'agudo' | 'obtuso_beta' | 'obtuso_gamma' | 'singular'

/**
 * Parâmetros geométricos do Protocolo β (orçamento em colapso).
 * Função custo refletida: m → -m, âncora no pé da perpendicular E-O.
 */
export interface ProtocoloBeta {
  /** Sinal de transformação da inclinação (aplicar m → -m na regressão ativa) */
  transformacao_m: 'reflect'
  /** Pé da perpendicular do vértice P à aresta E-O em coordenadas do lado E */
  t_ancora: number
  /** Orçamento disponível no momento de detecção (= lado O) */
  b_prime: number
}

/**
 * Parâmetros geométricos do Protocolo γ (prazo em colapso).
 * Função prazo transladada paralelamente até V_origem; m preservado.
 */
export interface ProtocoloGamma {
  /** Vértice mais próximo à origem (mínimo dos lados) */
  v_origem: number
  /** Deslocamento da translação paralela */
  delta_translacao: number
}

/**
 * Resultado completo da Síntese de Clairaut.
 */
export interface ResultadoSC {
  /** Tipo de protocolo ativo */
  tipo: TipoProtocolo
  /** α — Absorção: ângulo no vértice E-O (oposto ao lado P), em graus */
  alpha: number
  /** ω — Entrega: ângulo no vértice E-P (oposto ao lado O), em graus */
  omega: number
  /** ε — Equilíbrio: ângulo no vértice P-O (oposto ao lado E), em graus */
  epsilon: number
  /** Índice de Risco Intrínseco: IR = 1 − (ε / 90) ∈ [0, 1] */
  IR: number
  /** Risco direcional orçamentário: Rα = max(0, α − 45) / 45 ∈ [0, 1] */
  Ralpha: number
  /** Risco direcional de prazo: Rω = max(0, ω − 45) / 45 ∈ [0, 1] */
  Romega: number
  /** Presente apenas quando tipo = 'obtuso_beta' */
  beta?: ProtocoloBeta
  /** Presente apenas quando tipo = 'obtuso_gamma' */
  gamma?: ProtocoloGamma
}

// ─── Funções Internas ──────────────────────────────────────────────────────────

/**
 * Calcula o ângulo (em graus) no vértice formado pelos lados `a` e `b`,
 * oposto ao lado `c`, usando a lei dos cossenos.
 * Clamps o cosseno em [-1, 1] para evitar NaN por arredondamento de ponto flutuante.
 */
function calcularAngulo(a: number, b: number, c: number): number {
  const cos = (a * a + b * b - c * c) / (2 * a * b)
  // Sessão 29 (G4): Clamp unificado [-0.9999, 0.9999] — consistente com math.ts
  const clamped = Math.max(-0.9999, Math.min(0.9999, cos))
  return Math.acos(clamped) * RAD_TO_DEG
}

function isSingular(angulo: number): boolean {
  return Math.abs(angulo - 90) < SINGULARIDADE_TOLERANCIA
}

// ─── Função Principal ──────────────────────────────────────────────────────────

/**
 * Classifica o triângulo de monitoramento e retorna o protocolo ativo
 * com os ângulos α, ω, ε e as métricas Prometeu Intrínseco.
 *
 * Convenção de lados:
 *   E = Esforço/Escopo
 *   P = Prazo
 *   O = Orçamento/Origem
 *
 * Convenção de ângulos:
 *   α (alpha)   = ângulo no vértice E-O, oposto a P  → cos α = (E²+O²−P²)/(2EO)
 *   ω (omega)   = ângulo no vértice E-P, oposto a O  → cos ω = (E²+P²−O²)/(2EP)
 *   ε (epsilon) = ângulo no vértice P-O, oposto a E  → cos ε = (P²+O²−E²)/(2PO)
 *
 * @param E - Lado Esforço/Escopo (> 0)
 * @param P - Lado Prazo (> 0)
 * @param O - Lado Orçamento/Origem (> 0)
 */
export function sintetizarClairaut(E: number, P: number, O: number): ResultadoSC {
  // Ângulos pelos vértices
  const alpha = calcularAngulo(E, O, P)   // vértice E-O, oposto P
  const omega = calcularAngulo(E, P, O)   // vértice E-P, oposto O
  const epsilon = calcularAngulo(P, O, E) // vértice P-O, oposto E

  // Prometeu Intrínseco (calculado antes do gate — válido até para singular)
  const IR = Math.max(0, Math.min(1, 1 - epsilon / 90))
  const Ralpha = Math.max(0, alpha - 45) / 45
  const Romega = Math.max(0, omega - 45) / 45

  // AC-2: Pré-gate de singularidade — qualquer ângulo = 90° ±0.01° → HALT
  if (isSingular(alpha) || isSingular(omega) || isSingular(epsilon)) {
    return { tipo: 'singular', alpha, omega, epsilon, IR, Ralpha, Romega }
  }

  // AC-3: Classificação pela lei dos cossenos
  // Convenção: β = pressão de custo (O dominante), γ = pressão de prazo (P dominante)
  let tipo: TipoProtocolo
  if (E * E + P * P < O * O) {
    // ω > 90°: ângulo E-P obtuso → O é o maior lado → orçamento em colapso
    tipo = 'obtuso_beta'
  } else if (E * E + O * O < P * P) {
    // α > 90°: ângulo E-O obtuso → P é o maior lado → prazo em colapso
    tipo = 'obtuso_gamma'
  } else {
    tipo = 'agudo'
  }

  const resultado: ResultadoSC = { tipo, alpha, omega, epsilon, IR, Ralpha, Romega }

  // AC-7: Protocolo β — reflexão m → -m (O dominante, ω > 90°)
  if (tipo === 'obtuso_beta') {
    const omegaRad = omega * DEG_TO_RAD
    // Pé da altitude do vértice O à aresta E-P = E · cos(ω)
    const t_ancora = E * Math.cos(omegaRad)
    resultado.beta = {
      transformacao_m: 'reflect',
      t_ancora,
      b_prime: O,
    }
  }

  // AC-6: Protocolo γ — translação paralela até V_origem (P dominante, α > 90°)
  if (tipo === 'obtuso_gamma') {
    const v_origem = Math.min(E, P, O)
    const delta_translacao = Math.abs(P - v_origem)
    resultado.gamma = {
      v_origem,
      delta_translacao,
    }
  }

  return resultado
}

// ─── Utilitário: Invariante Visual (AC-9) ─────────────────────────────────────

/**
 * Clipa uma projeção de função tangente dentro dos limites dimensionais do triângulo.
 * Garante que nenhuma projeção ultrapasse os vértices do triângulo.
 *
 * @param valor     - Valor a ser clipado
 * @param limiteMin - Limite inferior (ex: 0 ou vértice mínimo)
 * @param limiteMax - Limite superior (ex: maior lado do triângulo)
 */
export function cliparProjecao(
  valor: number,
  limiteMin: number,
  limiteMax: number
): number {
  return Math.max(limiteMin, Math.min(limiteMax, valor))
}

/**
 * Aplica a invariante visual a um conjunto de pontos de projeção,
 * usando os lados do triângulo como limites dimensionais.
 */
export function aplicarInvarianteVisual(
  pontos: number[],
  E: number,
  P: number,
  O: number
): number[] {
  const limiteMax = Math.max(E, P, O)
  return pontos.map(p => cliparProjecao(p, 0, limiteMax))
}
