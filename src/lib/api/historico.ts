/**
 * historico.ts — Story 5.9: Query histórico MATED do projeto
 *
 * Junta mated_history (snapshots) com triangulo_matriz_versoes (aditivos)
 * para construir a série temporal da evolução do MATED.
 */

import { supabase } from '@/lib/supabase'

export interface MATEDHistoricoPoint {
  data: string
  mated: number
  iq: number | null
  zona: 'OTIMO' | 'SEGURO' | 'RISCO' | 'CRISE'
  is_aditivo: boolean
  label?: string
}

function classificarZona(mated: number): MATEDHistoricoPoint['zona'] {
  if (mated < 0.05) return 'OTIMO'
  if (mated < 0.15) return 'SEGURO'
  if (mated < 0.30) return 'RISCO'
  return 'CRISE'
}

/**
 * Busca histórico MATED do projeto em série temporal.
 * Fonte primária: `mated_history` (snapshots registrados pelo PM).
 * Aditivos marcados via JOIN com `triangulo_matriz_versoes`.
 *
 * @param projetoId - UUID do projeto
 * @param client    - Cliente Supabase (injetável; usa singleton por padrão)
 */
export async function getMATEDHistorico(
  projetoId: string,
  client: unknown = supabase
): Promise<MATEDHistoricoPoint[]> {
  const db = client as typeof supabase

  // ── 1. Buscar snapshots MATED ─────────────────────────────────────────────
  const { data: snapshots, error } = await db
    .from('mated_history')
    .select('assertividade, prazo, custo, config_simulada, created_at')
    .eq('projeto_id', projetoId)
    .order('created_at', { ascending: true })

  if (error || !snapshots || snapshots.length === 0) return []

  // ── 2. Buscar datas de aditivos (triangulo_matriz_versoes) ─────────────────
  const { data: versoes } = await db
    .from('triangulo_matriz_versoes')
    .select('criado_em, motivo')
    .eq('projeto_id', projetoId)
    .gt('versao', 1)
    .order('criado_em', { ascending: true })

  const dataAditivos = new Set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((versoes as any[]) ?? []).map((v: any) =>
      new Date(v.criado_em).toISOString().split('T')[0]
    )
  )

  // ── 3. Construir série temporal ───────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (snapshots as any[]).map((s: any) => {
    const mated: number =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s.config_simulada as any)?.mated_distancia ??
      Math.max(0, 1 - (Number(s.assertividade) / 100))

    const iq: number | null =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s.config_simulada as any)?.desvio_qualidade ?? null

    const dataStr = new Date(s.created_at).toISOString().split('T')[0]

    return {
      data: dataStr,
      mated: Math.round(mated * 10000) / 10000,
      iq: iq !== null ? Math.round(iq * 10) / 10 : null,
      zona: classificarZona(mated),
      is_aditivo: dataAditivos.has(dataStr),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      label: (s.config_simulada as any)?.zona_mated ?? undefined,
    }
  })
}
