/**
 * API Pública de Estimativas — Épico 1
 *
 * Colaboradores respondem via link (token JWT) sem precisar de login.
 * Quando 100% responderam, o sistema notifica o PM/PO.
 *
 * POST /api/estimativas — receber estimativa de um colaborador
 * GET  /api/estimativas?token=xxx — buscar tarefas do convite
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── GET: buscar tarefas do convite pelo token ────────────────────────────────

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 })
  }

  // 1. Validar token
  const { data: convite, error: cErr } = await getSupabase()
    .from('convites_projeto')
    .select('id, projeto_id, email, nome, papel, respondido')
    .eq('token', token)
    .single()

  if (cErr || !convite) {
    return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 404 })
  }

  if (convite.respondido) {
    return NextResponse.json({ error: 'Estimativas já enviadas', convite }, { status: 409 })
  }

  // 2. Buscar tarefas do projeto
  const { data: tarefas } = await getSupabase()
    .from('tarefas')
    .select('id, nome, id_string, ordem')
    .eq('projeto_id', convite.projeto_id)
    .order('ordem')

  // 3. Buscar sprints do projeto
  const { data: sprints } = await getSupabase()
    .from('sprints_fractais')
    .select('id, nome, ordem, data_inicio, data_fim')
    .eq('projeto_id', convite.projeto_id)
    .order('ordem')

  // 4. Buscar projeto (nome)
  const { data: projeto } = await getSupabase()
    .from('projetos')
    .select('nome')
    .eq('id', convite.projeto_id)
    .single()

  return NextResponse.json({
    convite: {
      id: convite.id,
      nome: convite.nome,
      papel: convite.papel,
      email: convite.email,
    },
    projeto: {
      id: convite.projeto_id,
      nome: projeto?.nome ?? 'Projeto',
    },
    tarefas: tarefas ?? [],
    sprints: sprints ?? [],
  })
}

// ── POST: receber estimativas do colaborador ─────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, estimativas } = body as {
    token: string
    estimativas: {
      tarefa_id: string
      sprint_id?: string
      duracao_otimista: number
      duracao_pessimista: number
      custo_otimista: number
      custo_pessimista: number
      papel?: string
      notas?: string
    }[]
  }

  if (!token || !estimativas || estimativas.length === 0) {
    return NextResponse.json({ error: 'Token e estimativas obrigatórios' }, { status: 400 })
  }

  // 1. Validar token
  const { data: convite, error: cErr } = await getSupabase()
    .from('convites_projeto')
    .select('id, projeto_id, respondido')
    .eq('token', token)
    .single()

  if (cErr || !convite) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
  }

  if (convite.respondido) {
    return NextResponse.json({ error: 'Já respondido' }, { status: 409 })
  }

  // 2. Validar estimativas (otimista < pessimista)
  for (const est of estimativas) {
    if (est.duracao_otimista <= 0 || est.duracao_pessimista <= 0) {
      return NextResponse.json({ error: 'Durações devem ser positivas' }, { status: 400 })
    }
    if (est.duracao_otimista > est.duracao_pessimista) {
      return NextResponse.json({
        error: `Duração otimista não pode ser maior que pessimista (tarefa ${est.tarefa_id})`
      }, { status: 400 })
    }
  }

  // 3. Inserir estimativas
  const rows = estimativas.map(est => ({
    convite_id: convite.id,
    projeto_id: convite.projeto_id,
    tarefa_id: est.tarefa_id,
    sprint_id: est.sprint_id ?? null,
    duracao_otimista: est.duracao_otimista,
    duracao_pessimista: est.duracao_pessimista,
    custo_otimista: est.custo_otimista,
    custo_pessimista: est.custo_pessimista,
    papel: est.papel ?? 'dev',
    notas: est.notas ?? null,
  }))

  const { error: insErr } = await getSupabase()
    .from('estimativas_colaborador')
    .insert(rows)

  if (insErr) {
    return NextResponse.json({ error: 'Erro ao salvar: ' + insErr.message }, { status: 500 })
  }

  // 4. Marcar convite como respondido
  await getSupabase()
    .from('convites_projeto')
    .update({ respondido: true, respondido_em: new Date().toISOString() })
    .eq('id', convite.id)

  // 5. Atualizar tarefas com estimativas (média se múltiplos colaboradores)
  for (const est of estimativas) {
    await supabase
      .from('tarefas')
      .update({
        duracao_otimista: est.duracao_otimista,
        duracao_estimada: est.duracao_pessimista,
        custo_otimista: est.custo_otimista,
        custo_pessimista: est.custo_pessimista,
      })
      .eq('id', est.tarefa_id)
  }

  // 6. Verificar se todos responderam
  const { count: total } = await getSupabase()
    .from('convites_projeto')
    .select('*', { count: 'exact', head: true })
    .eq('projeto_id', convite.projeto_id)

  const { count: respondidos } = await getSupabase()
    .from('convites_projeto')
    .select('*', { count: 'exact', head: true })
    .eq('projeto_id', convite.projeto_id)
    .eq('respondido', true)

  const todosResponderam = total !== null && respondidos !== null && respondidos >= total

  return NextResponse.json({
    success: true,
    todos_responderam: todosResponderam,
    progresso: `${respondidos ?? 0}/${total ?? 0}`,
  })
}
