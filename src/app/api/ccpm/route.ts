/**
 * API CCPM — Trigger do Pipeline Automático
 *
 * POST /api/ccpm — executa o pipeline CCPM completo para um projeto
 * Chamado quando 100% das estimativas foram recebidas.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { executarPipelineCCPM } from '@/lib/engine/pipeline-ccpm'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projetoId, tenantId } = body as { projetoId: string; tenantId: string }

  if (!projetoId || !tenantId) {
    return NextResponse.json({ error: 'projetoId e tenantId obrigatórios' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Verificar se todas as estimativas foram recebidas
  const { count: totalConvites } = await supabase
    .from('convites_projeto')
    .select('*', { count: 'exact', head: true })
    .eq('projeto_id', projetoId)

  const { count: respondidos } = await supabase
    .from('convites_projeto')
    .select('*', { count: 'exact', head: true })
    .eq('projeto_id', projetoId)
    .eq('respondido', true)

  if (totalConvites && respondidos && respondidos < totalConvites) {
    return NextResponse.json({
      error: 'Nem todos os colaboradores responderam',
      progresso: respondidos + '/' + totalConvites,
    }, { status: 422 })
  }

  // Executar pipeline
  const result = await executarPipelineCCPM(supabase, { projetoId, tenantId })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Salvar resultado no projeto
  await supabase.from('projetos').update({
    ccpm_calculado: true,
    prazo_ccpm: result.prazo_ccpm,
    project_buffer: result.project_buffer,
    cost_buffer: result.cost_buffer,
    prazo_agressivo: result.prazo_agressivo,
  }).eq('id', projetoId)

  return NextResponse.json({
    success: true,
    ...result,
  })
}
