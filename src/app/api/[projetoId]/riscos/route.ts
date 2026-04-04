// Story 13.3 — POST /api/[projetoId]/riscos
// Cria um novo risco com score_rc calculado via calcularScoreRC()
// Story 8.6 — Zod validation

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { supabase } from '@/lib/supabase'
import { calcularScoreRC } from '@/lib/engine/prometeu-extrinseco'
import { validateBody } from '@/lib/validation/validate-body'
import { RiscoPostSchema } from '@/lib/schemas'

export async function POST(
    req: Request,
    { params }: { params: { projetoId: string } }
): Promise<NextResponse> {
    // AC-3: autenticação obrigatória
    const auth = await requireAuth(req)
    if (auth.error) return auth.error

    // AC-4 + Story 8.6: Zod validation
    const validation = await validateBody(req, RiscoPostSchema)
    if (!validation.success) return validation.error

    const { titulo, categoria, probabilidade, impacto, descricao } = validation.data

    // SEC-03: verificar ownership explícito — projeto deve pertencer ao tenant autenticado
    const { data: projeto, error: projetoError } = await supabase
        .from('projetos')
        .select('tenant_id')
        .eq('id', params.projetoId)
        .single()

    if (projetoError || !projeto) {
        return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }
    if (projeto.tenant_id !== auth.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // AC-1: calcular score_rc antes de inserir
    const scoreRc = calcularScoreRC(probabilidade, impacto)

    const { data, error } = await supabase
        .from('riscos_projeto')
        .insert({
            projeto_id: params.projetoId,
            tenant_id: auth.user.id,
            titulo: titulo.trim(),
            categoria,
            probabilidade,
            impacto,
            score_rc: scoreRc,
            descricao: descricao?.trim() ?? null,
        })
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
}
