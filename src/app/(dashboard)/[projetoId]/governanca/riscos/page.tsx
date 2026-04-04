'use client'

// Story 13.2 — Página de Riscos: /[projetoId]/governanca/riscos/
// AC-1: acessível via menu de governança

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { ShieldAlert, Plus } from 'lucide-react'
import { RiscosList } from '@/components/prometeu/RiscosList'
import { NovoRiscoModal } from '@/components/prometeu/NovoRiscoModal'

export default function RiscosPage() {
    const { projetoId } = useParams<{ projetoId: string }>()
    const [modalOpen, setModalOpen] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)

    function handleCreated() {
        setModalOpen(false)
        setRefreshKey(k => k + 1)
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-surface-raised border border-border flex items-center justify-center">
                        <ShieldAlert className="h-5 w-5 text-slate-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100">Riscos do Projeto</h1>
                        <p className="text-xs text-slate-500">Mapa de riscos — Prometeu Extrínseco</p>
                    </div>
                </div>
                <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Novo Risco
                </button>
            </div>

            {/* Lista de riscos */}
            <div className="bg-surface-raised border border-border rounded-2xl p-5">
                <RiscosList projetoId={projetoId} refreshKey={refreshKey} />
            </div>

            {/* Modal de criação */}
            <NovoRiscoModal
                open={modalOpen}
                projetoId={projetoId}
                onClose={() => setModalOpen(false)}
                onCreated={handleCreated}
            />
        </div>
    )
}
