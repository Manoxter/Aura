// Story 13.3 — DELETE /api/[projetoId]/riscos/[riscoId]
// Remove risco via RLS — ownership validado automaticamente pelo Supabase

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { supabase } from '@/lib/supabase'

export async function DELETE(
    req: Request,
    { params }: { params: { projetoId: string; riscoId: string } }
): Promise<NextResponse> {
    // AC-3: autenticação obrigatória
    const auth = await requireAuth(req)
    if (auth.error) return auth.error

    // AC-2: RLS garante que só o tenant pode deletar (tenant_id = auth.uid())
    const { error } = await supabase
        .from('riscos_projeto')
        .delete()
        .eq('id', params.riscoId)
        .eq('projeto_id', params.projetoId)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
}
