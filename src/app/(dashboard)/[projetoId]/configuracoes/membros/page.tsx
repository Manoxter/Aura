'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, UserPlus, RefreshCw, ShieldAlert } from 'lucide-react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { authFetch } from '@/lib/auth-fetch'
import { useProject } from '@/context/ProjectContext'
import { MembersList, type ProjectMember } from '@/components/Members/MembersList'
import { InviteMemberModal } from '@/components/Members/InviteMemberModal'

const FREE_MEMBER_LIMIT = 3

export default function MembrosPage() {
    const { projetoId } = useParams<{ projetoId: string }>()
    const { plan, tenantId } = useProject()

    const [members, setMembers] = useState<ProjectMember[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [ownerUserId, setOwnerUserId] = useState<string | null>(null)
    const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false)

    const isPaidPlan = ['PRO', 'ELITE'].includes(plan ?? '')
    const activeCount = members.filter((m) => m.status !== 'expired').length

    const fetchMembers = useCallback(async () => {
        if (!projetoId) return
        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) setCurrentUserId(user.id)

            // Buscar dono do tenant
            if (tenantId) {
                const { data: tenant } = await supabase
                    .from('tenants')
                    .select('owner_id')
                    .eq('id', tenantId)
                    .maybeSingle()
                if (tenant) setOwnerUserId(tenant.owner_id)
            }

            // Buscar membros do projeto com email via join em auth.users
            // Usamos a view pública ou metadados disponíveis
            const { data, error: fetchError } = await supabase
                .from('project_members')
                .select('*')
                .eq('projeto_id', projetoId)
                .order('invited_at', { ascending: true })

            if (fetchError) {
                setError('Erro ao carregar membros.')
                return
            }

            // Resolver emails dos membros
            // O user_id está disponível; o email pode estar em user_metadata do convite
            // ou em uma tabela de perfis. Aqui usamos o campo email direto se existir,
            // ou fallback para o user_id como identificador.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const enriched: ProjectMember[] = (data ?? []).map((row: any) => ({
                id: row.id as string,
                projeto_id: row.projeto_id as string,
                user_id: row.user_id as string | null,
                email: (row.email as string | undefined) ?? row.user_id ?? 'Desconhecido',
                role: (row.role as ProjectMember['role']) ?? 'viewer',
                status: (row.status as ProjectMember['status']) ?? 'pending',
                invited_at: row.invited_at as string,
                invited_by: row.invited_by as string | null,
            }))

            setMembers(enriched)

            // Verificar se o user atual é Admin
            const isOwner = user?.id === ownerUserId
            const selfMember = enriched.find((m) => m.user_id === user?.id)
            setIsCurrentUserAdmin(isOwner || selfMember?.role === 'admin')
        } finally {
            setLoading(false)
        }
    }, [projetoId, tenantId, ownerUserId])

    useEffect(() => {
        fetchMembers()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projetoId, tenantId])

    const handleRemove = async (memberId: string) => {
        const { error: removeError } = await supabase
            .from('project_members')
            .delete()
            .eq('id', memberId)

        if (removeError) {
            console.error('[membros] Erro ao remover membro:', removeError)
            return
        }

        setMembers((prev) => prev.filter((m) => m.id !== memberId))
    }

    const handleResend = async (email: string) => {
        try {
            const res = await authFetch('/api/invite', {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    role: members.find((m) => m.email === email)?.role ?? 'viewer',
                    projeto_id: projetoId,
                }),
            })
            if (!res.ok) {
                const data = (await res.json()) as { error?: string }
                console.error('[membros] Erro ao reenviar:', data.error)
            }
        } catch (err) {
            console.error('[membros] Erro de rede ao reenviar:', err)
        }
    }

    const handleInviteSuccess = () => {
        fetchMembers()
    }

    const canInvite = isCurrentUserAdmin

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                            <Users className="h-5 w-5 text-indigo-400" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-100 tracking-tight">
                            Membros do Projeto
                        </h1>
                    </div>
                    <p className="text-slate-400 text-sm">
                        Gerencie quem tem acesso a este projeto.{' '}
                        {!isPaidPlan && (
                            <span className="text-amber-400">
                                Plano gratuito: {activeCount}/{FREE_MEMBER_LIMIT} membros.
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchMembers}
                        disabled={loading}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
                        title="Atualizar lista"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {canInvite && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            disabled={!isPaidPlan && activeCount >= FREE_MEMBER_LIMIT}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                        >
                            <UserPlus className="h-4 w-4" />
                            Convidar
                        </button>
                    )}
                </div>
            </div>

            {/* Aviso para não-admin */}
            {!isCurrentUserAdmin && !loading && (
                <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-400">
                    <ShieldAlert className="h-5 w-5 shrink-0" />
                    Apenas Admins podem convidar ou remover membros.
                </div>
            )}

            {/* Tabela de membros */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                {error ? (
                    <div className="text-red-400 text-sm text-center py-4">{error}</div>
                ) : loading ? (
                    <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-sm">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Carregando membros...
                    </div>
                ) : (
                    <MembersList
                        members={members}
                        currentUserId={currentUserId ?? ''}
                        isCurrentUserAdmin={isCurrentUserAdmin}
                        ownerUserId={ownerUserId ?? ''}
                        onRemove={handleRemove}
                        onResend={handleResend}
                    />
                )}
            </div>

            {/* Modal de convite */}
            <InviteMemberModal
                projetoId={projetoId}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleInviteSuccess}
                memberCount={activeCount}
                isPaidPlan={isPaidPlan}
            />
        </div>
    )
}
