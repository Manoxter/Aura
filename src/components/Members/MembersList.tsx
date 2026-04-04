'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle, X, Check } from 'lucide-react'

export type MemberRole = 'admin' | 'editor' | 'viewer'
export type MemberStatus = 'pending' | 'active' | 'expired'

export interface ProjectMember {
    id: string
    projeto_id: string
    user_id: string | null
    email: string
    role: MemberRole
    status: MemberStatus
    invited_at: string
    invited_by: string | null
}

interface MembersListProps {
    members: ProjectMember[]
    currentUserId: string
    isCurrentUserAdmin: boolean
    ownerUserId: string
    onRemove: (memberId: string) => Promise<void>
    onResend: (email: string) => Promise<void>
}

const ROLE_BADGE: Record<MemberRole, string> = {
    admin: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    editor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    viewer: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
}

const ROLE_LABEL: Record<MemberRole, string> = {
    admin: 'Admin',
    editor: 'Editor',
    viewer: 'Viewer',
}

function isExpired(invitedAt: string): boolean {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
    return Date.now() - new Date(invitedAt).getTime() > SEVEN_DAYS_MS
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
}

export function MembersList({
    members,
    currentUserId,
    isCurrentUserAdmin,
    ownerUserId,
    onRemove,
    onResend,
}: MembersListProps) {
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
    const [removingId, setRemovingId] = useState<string | null>(null)
    const [resendingEmail, setResendingEmail] = useState<string | null>(null)

    const handleRemoveConfirmed = async (memberId: string) => {
        setRemovingId(memberId)
        try {
            await onRemove(memberId)
        } finally {
            setRemovingId(null)
            setConfirmRemoveId(null)
        }
    }

    const handleResend = async (email: string) => {
        setResendingEmail(email)
        try {
            await onResend(email)
        } finally {
            setResendingEmail(null)
        }
    }

    if (members.length === 0) {
        return (
            <p className="text-slate-500 text-sm text-center py-6">
                Nenhum membro neste projeto ainda.
            </p>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-left">
                        <th className="pb-3 font-medium">Email</th>
                        <th className="pb-3 font-medium">Role</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Convidado em</th>
                        <th className="pb-3 font-medium text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {members.map((member) => {
                        const expired =
                            member.status === 'pending' && isExpired(member.invited_at)
                        const isOwner = member.user_id === ownerUserId
                        const isSelf = member.user_id === currentUserId
                        const canRemove =
                            isCurrentUserAdmin && !isOwner && !isSelf

                        return (
                            <tr key={member.id} className="hover:bg-slate-800/20 transition-colors">
                                <td className="py-3 pr-4 text-slate-200 font-mono text-xs">
                                    {member.email}
                                    {isOwner && (
                                        <span className="ml-2 text-[10px] text-amber-400 border border-amber-400/30 rounded px-1">
                                            Dono
                                        </span>
                                    )}
                                    {isSelf && !isOwner && (
                                        <span className="ml-2 text-[10px] text-slate-500 border border-slate-600 rounded px-1">
                                            Você
                                        </span>
                                    )}
                                </td>
                                <td className="py-3 pr-4">
                                    <span
                                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGE[member.role]}`}
                                    >
                                        {ROLE_LABEL[member.role]}
                                    </span>
                                </td>
                                <td className="py-3 pr-4">
                                    {expired ? (
                                        <span className="inline-flex items-center gap-1 text-xs text-orange-400 border border-orange-400/30 rounded px-2 py-0.5">
                                            <AlertTriangle className="h-3 w-3" />
                                            Expirado
                                        </span>
                                    ) : member.status === 'active' ? (
                                        <span className="text-xs text-emerald-400">Ativo</span>
                                    ) : (
                                        <span className="text-xs text-slate-400">Pendente</span>
                                    )}
                                </td>
                                <td className="py-3 pr-4 text-slate-500 text-xs">
                                    {formatDate(member.invited_at)}
                                </td>
                                <td className="py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {expired && isCurrentUserAdmin && (
                                            <button
                                                onClick={() => handleResend(member.email)}
                                                disabled={resendingEmail === member.email}
                                                className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-400/30 rounded px-2 py-1 transition-colors disabled:opacity-50"
                                            >
                                                {resendingEmail === member.email
                                                    ? 'Reenviando...'
                                                    : 'Reenviar'}
                                            </button>
                                        )}

                                        {canRemove && confirmRemoveId !== member.id && (
                                            <button
                                                onClick={() => setConfirmRemoveId(member.id)}
                                                className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded"
                                                title="Remover membro"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}

                                        {confirmRemoveId === member.id && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-slate-400 mr-1">
                                                    Confirmar?
                                                </span>
                                                <button
                                                    onClick={() => handleRemoveConfirmed(member.id)}
                                                    disabled={removingId === member.id}
                                                    className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                                    title="Confirmar remoção"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmRemoveId(null)}
                                                    className="p-1 rounded bg-slate-700 text-slate-400 hover:bg-slate-600 transition-colors"
                                                    title="Cancelar"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
