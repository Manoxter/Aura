'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[Aura Dashboard Error]', error)
    }, [error])

    const message =
        process.env.NODE_ENV === 'production'
            ? 'Ocorreu um erro inesperado ao carregar o painel.'
            : error.message || 'Erro desconhecido'

    return (
        <div className="flex items-center justify-center min-h-[60vh] p-6 animate-fade-in">
            <div className="bg-surface-raised border border-zona-crise-border rounded-2xl p-8 max-w-md w-full text-center shadow-glow-rose">
                <div className="h-14 w-14 bg-zona-crise-bg rounded-full flex items-center justify-center mx-auto mb-5">
                    <AlertTriangle className="h-7 w-7 text-zona-crise" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                    Algo deu errado
                </h2>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                    {message}
                </p>
                {error.digest && (
                    <p className="text-2xs text-slate-600 mb-4 font-mono">
                        ref: {error.digest}
                    </p>
                )}
                <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 bg-zona-crise/10 hover:bg-zona-crise/20 text-zona-crise-text border border-zona-crise-border px-5 py-2.5 rounded-xl font-semibold transition-colors"
                >
                    <RotateCcw className="h-4 w-4" />
                    Tentar novamente
                </button>
            </div>
        </div>
    )
}
