/**
 * sigma-manager.ts — Story 3.4
 *
 * Fornece σ (desvio padrão) por setor para simulações Monte Carlo.
 * - n < 30 projetos arquivados: usa σ da literatura (Flyvbjerg et al. 2022)
 * - n ≥ 30 projetos arquivados: migra automaticamente para σ empírico via STDDEV(mated_medio)
 *
 * @roberta: σ por setor validados com nota técnica (Sessão 3.4)
 */

import { getSetorConfig } from './setor-config'

export const EMPIRICAL_THRESHOLD = 30

export type SigmaMode = 'literature' | 'empirical'

export interface SigmaModeInfo {
  mode: SigmaMode
  n: number
  sigma: number
  setor: string
}

/**
 * Retorna σ sincronamente a partir da literatura (sem acesso ao DB).
 * Fonte: setor-config.ts → sigma_prior (Flyvbjerg et al. 2022, PMI 2024).
 * Usado como fallback em math.ts quando nenhum cliente Supabase está disponível.
 */
export function getSigmaSync(setor: string): number {
  const cfg = getSetorConfig(setor)
  return cfg.sigma_prior
}

/**
 * Retorna σ para simulação Monte Carlo do projeto.
 *
 * Lógica de migração automática:
 * - Conta projetos arquivados (tipo = 'empirico') do tenant/setor
 * - Se n < 30: retorna σ da literatura (sigma_prior do setor)
 * - Se n ≥ 30: chama RPC `calc_empirical_sigma` que calcula STDDEV(mated_medio)
 *   com COALESCE para fallback em caso de STDDEV = NULL (valores idênticos)
 *
 * Fallback gracioso: qualquer erro retorna { mode: 'literature', ... }
 *
 * @param setor          - Nome do setor (ex: 'construcao_civil', 'tecnologia')
 * @param tenantId       - UUID do tenant (string formato UUID ou null)
 * @param supabaseClient - Cliente Supabase inicializado ou null para fallback
 */
export async function getSigmaForProject(
  setor: string,
  tenantId: string | null,
  supabaseClient: unknown
): Promise<number> {
  const info = await getModeInfo(setor, tenantId, supabaseClient)
  return info.sigma
}

/**
 * Retorna informações completas sobre o modo σ atual do tenant/setor.
 * Útil para exibição de diagnóstico e logging.
 *
 * @returns SigmaModeInfo com { mode, n, sigma, setor }
 */
export async function getModeInfo(
  setor: string,
  tenantId: string | null,
  supabaseClient: unknown
): Promise<SigmaModeInfo> {
  const literatureSigma = getSigmaSync(setor)

  // Sem cliente ou tenant: fallback imediato para literatura
  if (!supabaseClient || !tenantId) {
    return { mode: 'literature', n: 0, sigma: literatureSigma, setor }
  }

  try {
    // Conta projetos arquivados do tenant/setor
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error: countErr } = await (supabaseClient as any)
      .from('aura_calibration_events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('setor', setor)
      .eq('tipo', 'empirico')

    if (countErr || count === null) {
      return { mode: 'literature', n: 0, sigma: literatureSigma, setor }
    }

    const n = count as number

    if (n < EMPIRICAL_THRESHOLD) {
      return { mode: 'literature', n, sigma: literatureSigma, setor }
    }

    // n ≥ 30: calcular σ empírico via RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: rpcErr } = await (supabaseClient as any).rpc('calc_empirical_sigma', {
      p_tenant_id: tenantId,
      p_setor: setor,
    })

    if (rpcErr || data === null || data === undefined) {
      // Fallback para literatura se RPC falhar ou retornar NULL
      return { mode: 'literature', n, sigma: literatureSigma, setor }
    }

    const empiricalSigma = typeof data === 'number' ? data : Number(data)

    return {
      mode: 'empirical',
      n,
      // Guard contra σ próximo de zero (projetos com valores idênticos)
      sigma: Math.max(0.01, isFinite(empiricalSigma) ? empiricalSigma : literatureSigma),
      setor,
    }
  } catch {
    return { mode: 'literature', n: 0, sigma: literatureSigma, setor }
  }
}
