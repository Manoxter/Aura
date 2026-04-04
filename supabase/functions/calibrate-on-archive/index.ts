// calibrate-on-archive/index.ts — Story 3.5
// Edge Function: Recalcular Zonas MATED ao Arquivar Projeto
//
// Body esperado: { projeto_id, tenant_id, setor, area_final, mated_medio, sdo_score, modo }
// Resposta: { n, mode: 'literature' | 'empirical', sigma_updated }
//
// @data-engineer (Dara) @devops (Gage): validado em sessão 3.5

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMPIRICAL_THRESHOLD = 30

interface ArchivePayload {
  projeto_id: string
  tenant_id: string
  setor: string
  area_final: number
  mated_medio: number
  sdo_score: number
  modo: 'normal' | 'invertido'
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Parse e validação do body ─────────────────────────────────────────
    const payload: ArchivePayload = await req.json()
    const { projeto_id, tenant_id, setor, area_final, mated_medio, sdo_score, modo } = payload

    if (!projeto_id || !tenant_id || !setor) {
      return new Response(
        JSON.stringify({ error: 'projeto_id, tenant_id e setor são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 2. Cliente Supabase com autorização do usuário ────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const db = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // ── 3. INSERT em aura_calibration_events (tipo='empirico') ────────────────
    const { error: insertErr } = await db.from('aura_calibration_events').insert({
      projeto_id,
      tenant_id,
      setor,
      area_final,
      mated_medio,
      sdo_score,
      modo,
      tipo: 'empirico',
      fonte: 'sistema',
      arquivado_em: new Date().toISOString(),
    })

    if (insertErr) {
      console.error('Erro INSERT calibration_events:', insertErr)
      return new Response(
        JSON.stringify({ error: 'Falha ao registrar evento de calibração', detail: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 4. Contar n = projetos arquivados do tenant/setor após INSERT ──────────
    const { count, error: countErr } = await db
      .from('aura_calibration_events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant_id)
      .eq('setor', setor)
      .eq('tipo', 'empirico')

    const n = (count as number) ?? 0
    let sigmaUpdated = false

    // ── 5. Se n ≥ 30: atualizar sigma_baseline em aura_setor_config ───────────
    if (!countErr && n >= EMPIRICAL_THRESHOLD) {
      // Calcular σ empírico via SQL (evita buscar todos os registros em TS)
      const { data: sigmaData, error: rpcErr } = await db.rpc('calc_empirical_sigma', {
        p_tenant_id: tenant_id,
        p_setor: setor,
      })

      if (!rpcErr && sigmaData !== null) {
        const sigmaEmpírico = Math.max(0.01, Number(sigmaData))

        // Upsert em aura_setor_config (atualiza sigma_prior com valor empírico)
        const { error: upsertErr } = await db
          .from('aura_setor_config')
          .upsert(
            {
              setor,
              sigma_baseline: sigmaEmpírico,  // sigma_baseline = valor empírico calibrado
              atualizado_em: new Date().toISOString(),
            },
            { onConflict: 'setor' }
          )

        sigmaUpdated = !upsertErr
      }
    }

    // ── 6. Resposta de sucesso ────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        n,
        mode: n >= EMPIRICAL_THRESHOLD ? 'empirical' : 'literature',
        sigma_updated: sigmaUpdated,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('calibrate-on-archive error:', err)
    return new Response(
      JSON.stringify({ error: 'Erro interno', detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
