import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { validateBody } from '@/lib/validation/validate-body'
import { InvitePostSchema } from '@/lib/schemas'

/** Plano free: máximo 3 membros ativos por projeto */
const FREE_MEMBER_LIMIT = 3

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req)
        if (auth.error) return auth.error

        // Story 8.6: Zod validation
        const validation = await validateBody(req, InvitePostSchema)
        if (!validation.success) return validation.error
        const { email, role, projeto_id } = validation.data

        const supabaseAdmin = getSupabaseAdmin()

        // ─── Verificar que o projeto pertence ao tenant do usuário ───────────
        const { data: projeto, error: projetoError } = await supabaseAdmin
            .from('projetos')
            .select('id, tenant_id')
            .eq('id', projeto_id)
            .maybeSingle()

        if (projetoError || !projeto) {
            return NextResponse.json(
                { error: 'Projeto não encontrado.' },
                { status: 404 }
            )
        }

        // ─── Verificar que o usuário autenticado é Admin ou dono ────────────
        const { data: tenant } = await supabaseAdmin
            .from('tenants')
            .select('id, owner_id, plan_tier')
            .eq('id', projeto.tenant_id)
            .maybeSingle()

        if (!tenant) {
            return NextResponse.json(
                { error: 'Tenant não encontrado.' },
                { status: 404 }
            )
        }

        const isOwner = tenant.owner_id === auth.user.id

        if (!isOwner) {
            const { data: requesterMember } = await supabaseAdmin
                .from('project_members')
                .select('role')
                .eq('projeto_id', projeto_id)
                .eq('user_id', auth.user.id)
                .eq('status', 'active')
                .maybeSingle()

            if (!requesterMember || requesterMember.role !== 'admin') {
                return NextResponse.json(
                    { error: 'Apenas Admins podem convidar membros.' },
                    { status: 403 }
                )
            }
        }

        // ─── Verificar limite de membros por plano ───────────────────────────
        const planTier: string = (tenant as { plan_tier?: string }).plan_tier ?? 'START'
        const isPaidPlan = ['PRO', 'ELITE'].includes(planTier)

        if (!isPaidPlan) {
            const { count } = await supabaseAdmin
                .from('project_members')
                .select('*', { count: 'exact', head: true })
                .eq('projeto_id', projeto_id)
                .neq('status', 'expired')

            if ((count ?? 0) >= FREE_MEMBER_LIMIT) {
                return NextResponse.json(
                    {
                        error: `Limite de ${FREE_MEMBER_LIMIT} membros atingido no plano gratuito. Faça upgrade para convidar mais.`,
                        code: 'MEMBER_LIMIT_REACHED',
                    },
                    { status: 402 }
                )
            }
        }

        // ─── Enviar convite via Supabase Auth ────────────────────────────────
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        const redirectTo = `${appUrl}/${projeto_id}/configuracoes/membros?invited=1`

        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
            email,
            {
                redirectTo,
                data: {
                    projeto_id,
                    role,
                    invited_by: auth.user.id,
                },
            }
        )

        if (inviteError) {
            console.error('[invite] Erro ao enviar convite:', inviteError)
            return NextResponse.json(
                { error: `Falha ao enviar convite: ${inviteError.message}` },
                { status: 400 }
            )
        }

        const invitedUserId = inviteData?.user?.id ?? null

        // ─── Registrar membro na tabela project_members ──────────────────────
        const { data: member, error: memberError } = await supabaseAdmin
            .from('project_members')
            .upsert(
                {
                    projeto_id,
                    user_id: invitedUserId,
                    role,
                    status: 'pending',
                    invited_at: new Date().toISOString(),
                    invited_by: auth.user.id,
                    tenant_id: projeto.tenant_id,
                },
                {
                    onConflict: 'projeto_id,user_id',
                    ignoreDuplicates: false,
                }
            )
            .select()
            .single()

        if (memberError) {
            console.error('[invite] Erro ao registrar membro:', memberError)
            return NextResponse.json(
                { error: 'Convite enviado mas falha ao registrar membro na tabela.' },
                { status: 500 }
            )
        }

        return NextResponse.json({ member, invited_email: email }, { status: 201 })
    } catch (error) {
        console.error('[invite] Erro inesperado:', error)
        return NextResponse.json(
            { error: 'Erro interno ao processar convite.' },
            { status: 500 }
        )
    }
}
