'use client'

import { useState } from 'react'
import { X, UserPlus, Loader2 } from 'lucide-react'
import { authFetch } from '@/lib/auth-fetch'

type MemberRole = 'admin' | 'editor' | 'viewer'

interface InviteMemberModalProps {
    projetoId: string
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    memberCount: number
    isPaidPlan: boolean
}

const FREE_MEMBER_LIMIT = 3

const ROLE_OPTIONS: { value: MemberRole; label: string; description: string }[] = [
    {
        value: 'admin',
        label: 'Admin',
        description: 'Gerencia membros, edita e visualiza tudo',
    },
    {
        value: 'editor',
        label: 'Editor',
        description: 'Cria e edita tarefas, visualiza tudo',
    },
    {
        value: 'viewer',
        label: 'Viewer',
        description: 'Somente visualização (sem edição)',
    },
]

export function InviteMemberModal({
    projetoId,
    isOpen,
    onClose,
    onSuccess,
    memberCount,
    isPaidPlan,
}: InviteMemberModalProps) {
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<MemberRole>('viewer')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    const atLimit = !isPaidPlan && memberCount >= FREE_MEMBER_LIMIT

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim() || atLimit) return

        setIsSubmitting(true)
        setError(null)
        setSuccessMsg(null)

        try {
            const res = await authFetch('/api/invite', {
                method: 'POST',
                body: JSON.stringify({ email: email.trim(), role, projeto_id: projetoId }),
            })

            const data = (await res.json()) as { error?: string; invited_email?: string }

            if (!res.ok) {
                setError(data.error ?? 'Erro ao enviar convite.')
                return
            }

            setSuccessMsg(`Convite enviado para ${data.invited_email ?? email}.`)
            setEmail('')
            setRole('viewer')
            onSuccess()
        } catch {
            setError('Erro de rede. Tente novamente.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        setEmail('')
        setRole('viewer')
        setError(null)
        setSuccessMsg(null)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            <UserPlus className="h-4 w-4 text-indigo-400" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-100">Convidar Membro</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-800"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {atLimit && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-400">
                            Limite de <strong>{FREE_MEMBER_LIMIT} membros</strong> atingido no plano
                            gratuito. Faça upgrade para convidar mais colaboradores.
                        </div>
                    )}

                    {!isPaidPlan && !atLimit && (
                        <p className="text-xs text-slate-500">
                            {FREE_MEMBER_LIMIT - memberCount} convito(s) restante(s) no plano
                            gratuito.
                        </p>
                    )}

                    <div className="space-y-2">
                        <label
                            htmlFor="invite-email"
                            className="block text-sm font-medium text-slate-300"
                        >
                            Email
                        </label>
                        <input
                            id="invite-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="colaborador@empresa.com"
                            required
                            disabled={atLimit || isSubmitting}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 disabled:opacity-50 transition-colors"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">Role</label>
                        <div className="space-y-2">
                            {ROLE_OPTIONS.map((option) => (
                                <label
                                    key={option.value}
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                        role === option.value
                                            ? 'border-indigo-500/50 bg-indigo-500/10'
                                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                    } ${atLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="role"
                                        value={option.value}
                                        checked={role === option.value}
                                        onChange={() => setRole(option.value)}
                                        disabled={atLimit || isSubmitting}
                                        className="mt-0.5 accent-indigo-500"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-slate-200">
                                            {option.label}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {option.description}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    {successMsg && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-sm text-emerald-400">
                            {successMsg}
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={atLimit || isSubmitting || !email.trim()}
                            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                'Enviar Convite'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
