import { getSupabaseAdmin } from '@/lib/supabase'

export interface RateLimitResult {
  ok: boolean
  retryAfter?: number
  remaining?: number
}

/**
 * Verifica rate limiting por tenant + endpoint usando tabela Supabase.
 * Sem Redis — utiliza INSERT com ON CONFLICT DO UPDATE para contagem atômica.
 *
 * @param tenantId  - ID do tenant (user.id do JWT)
 * @param endpoint  - Identificador do endpoint (ex: '/api/ai/cpm')
 * @param limit     - Número máximo de requisições por janela
 * @param windowMs  - Duração da janela em milissegundos (ex: 3600000 = 1h)
 */
export async function checkRateLimit(
  tenantId: string,
  endpoint: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  try {
    const supabase = getSupabaseAdmin()

    // Calcular início da janela atual (truncado ao múltiplo de windowMs)
    const now = Date.now()
    const windowStart = new Date(Math.floor(now / windowMs) * windowMs).toISOString()

    // Atomic increment: INSERT ... ON CONFLICT DO UPDATE SET count = count + 1
    // Retorna o count atual após o incremento
    const { data, error } = await supabase.rpc('increment_ratelimit_count', {
      p_tenant_id: tenantId,
      p_endpoint: endpoint,
      p_window_start: windowStart,
    })

    if (error) {
      // Fallback: tentar via upsert direto se a RPC não existir
      const { data: upsertData, error: upsertError } = await supabase
        .from('ratelimit_log')
        .upsert(
          {
            tenant_id: tenantId,
            endpoint,
            window_start: windowStart,
            count: 1,
          },
          { onConflict: 'tenant_id,endpoint,window_start' }
        )
        .select('count')
        .single()

      if (upsertError || !upsertData) {
        // SEC-07: fail-safe — em caso de erro no rate limit, bloquear para evitar abuso
        console.error('[rate-limit] Erro no fallback upsert:', upsertError?.message)
        return { ok: false, remaining: 0 }
      }

      const currentCount: number = upsertData.count ?? 1
      const remaining = Math.max(0, limit - currentCount)

      if (currentCount > limit) {
        const windowEndMs = Math.floor(now / windowMs) * windowMs + windowMs
        const retryAfter = Math.ceil((windowEndMs - now) / 1000)
        return { ok: false, retryAfter, remaining: 0 }
      }

      return { ok: true, remaining }
    }

    const currentCount: number = data ?? 1
    const remaining = Math.max(0, limit - currentCount)

    if (currentCount > limit) {
      const windowEndMs = Math.floor(now / windowMs) * windowMs + windowMs
      const retryAfter = Math.ceil((windowEndMs - now) / 1000)
      return { ok: false, retryAfter, remaining: 0 }
    }

    return { ok: true, remaining }
  } catch (err) {
    // SEC-07: fail-safe — erro inesperado bloqueia para evitar bypass por falha de infra
    console.error('[rate-limit] Erro inesperado:', err)
    return { ok: false, remaining: 0 }
  }
}
