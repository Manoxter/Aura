/**
 * Hook useSinteseClairaut
 *
 * Expõe o ResultadoSC reativamente para consumo por componentes React.
 * Recalcula automaticamente quando E, P ou O mudam.
 *
 * Story 2.0-engine — Sprint SC-FOUNDATION
 * UI consumidora: Story 2.0-ui (PainelClairaut)
 */

'use client'

import { useMemo } from 'react'
import { sintetizarClairaut, ResultadoSC } from '../clairaut'

export interface UseSinteseClairautResult {
  resultado: ResultadoSC | null
  /** true quando os lados são válidos para síntese */
  pronto: boolean
}

/**
 * Hook que roda a Síntese de Clairaut dado os três lados do triângulo.
 *
 * @param E - Lado Esforço/Escopo (> 0)
 * @param P - Lado Prazo (> 0)
 * @param O - Lado Orçamento/Origem (> 0)
 */
export function useSinteseClairaut(
  E: number | null | undefined,
  P: number | null | undefined,
  O: number | null | undefined
): UseSinteseClairautResult {
  const resultado = useMemo<ResultadoSC | null>(() => {
    if (E == null || P == null || O == null) return null
    if (E <= 0 || P <= 0 || O <= 0) return null
    return sintetizarClairaut(E, P, O)
  }, [E, P, O])

  return {
    resultado,
    pronto: resultado !== null,
  }
}
