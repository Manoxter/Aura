import { CrisisReport, CETDuplaResult } from '../types'

export function checkCDTExistence(E: number, O: number, P: number): boolean {
  return (
    E + O > P &&
    E + P > O &&
    O + P > E
  )
}

/**
 * Identifica o lado violador da CEt: o maior lado quando a soma dos outros dois é insuficiente.
 * Retorna 'E', 'P' ou 'O' (mapeando para os lados E=escopo, C→'O'=orçamento, P=prazo).
 *
 * @param E  - Escopo
 * @param O  - Orçamento (Custo)
 * @param P  - Prazo
 */
function identificarLadoViolador(E: number, O: number, P: number): 'E' | 'P' | 'O' {
    if (O + P <= E) return 'E'
    if (E + P <= O) return 'O'
    return 'P'
}

/**
 * Verificação CEt Dupla (Story 1.1).
 *
 * Verifica a Condição de Existência do Triângulo em dois momentos:
 * 1. Pré-normalização: valores brutos (E, O, P) — se falhar, bloqueia imediatamente (stage='pre')
 * 2. Pós-normalização: valores adimensionais (En, On, Pn) — se falhar, bloqueia (stage='post')
 *
 * Retorna `{ valid: true }` se ambas as verificações passam,
 * ou `{ valid: false, violatedSide, stage }` na primeira falha encontrada.
 *
 * @param E   - Lado Escopo bruto
 * @param O   - Lado Orçamento bruto
 * @param P   - Lado Prazo bruto
 * @param En  - Lado Escopo normalizado
 * @param On  - Lado Orçamento normalizado
 * @param Pn  - Lado Prazo normalizado
 */
export function checkCETDupla(
    E: number, O: number, P: number,
    En: number, On: number, Pn: number
): CETDuplaResult {
    // Etapa 1: verificação pré-normalização (valores brutos)
    if (!checkCDTExistence(E, O, P)) {
        return { valid: false, violatedSide: identificarLadoViolador(E, O, P), stage: 'pre' }
    }

    // Etapa 2: verificação pós-normalização (valores adimensionais)
    if (!checkCDTExistence(En, On, Pn)) {
        return { valid: false, violatedSide: identificarLadoViolador(En, On, Pn), stage: 'post' }
    }

    return { valid: true }
}

export function generateCrisisReport(E: number, O: number, P: number): CrisisReport {
  const isValid = checkCDTExistence(E, O, P)
  
  if (isValid) {
    return {
      timestamp: new Date().toISOString(),
      status: 'ESTÁVEL',
      causa_raiz: [],
      metricas_atuais: { escopo: E, orcamento: O, prazo: P },
      violacao_regra: '',
      rotas_de_escape: []
    }
  }

  const causas: string[] = []
  let regra = ''
  
  if (E + O <= P) {
    regra = 'E + O ≤ P'
    causas.push('O Prazo é excessivo em relação à soma de Escopo e Orçamento (Overstretch).')
  } else if (E + P <= O) {
    regra = 'E + P ≤ O'
    causas.push('O Orçamento é excessivo (Recurso sem vazão).')
  } else if (O + P <= E) {
    regra = 'O + P ≤ E'
    causas.push('O Escopo é impossível para os recursos atuais (Sub-recurso).')
  }

  return {
    timestamp: new Date().toISOString(),
    status: 'CRISE_GEOMÉTRICA',
    causa_raiz: causas,
    metricas_atuais: { escopo: E, orcamento: O, prazo: P },
    violacao_regra: regra,
    rotas_de_escape: [
      { id: 'R01', titulo: 'Redução de Escopo', descricao: 'Ajustar E para 0.8', impacto_mated: 0.12 },
      { id: 'R02', titulo: 'Injeção de Capital', descricao: 'Ajustar O para cima', impacto_mated: 0.08 },
      { id: 'R03', titulo: 'Compressão Prazo', descricao: 'Ajustar P para baixo', impacto_mated: 0.15 }
    ]
  }
}
