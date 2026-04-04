'use client'

import { Settings } from 'lucide-react'
import { AIInsightCard } from '@/components/aura/AIInsightCard'
import { SetupStepper } from '@/components/aura/SetupStepper'

export default function GovernancaPage({ params }: { params: { projetoId: string } }) {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <SetupStepper />
            <header className="border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <Settings className="h-8 w-8 text-blue-500" />
                    Setup: Governança
                </h1>
                <p className="text-slate-400 mt-2 font-medium">Configuração de Sponsors e Permissões do Projeto</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-lg min-h-[400px]">
                        <div className="text-center mt-20">
                            <Settings className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                            <p className="text-slate-400">Nenhuma configuração adicional de governança necessária para o setup inicial.</p>
                            <p className="text-sm font-medium text-slate-500 mt-2">Somente administradores da organização podem escalar permissões via Supabase RLS.</p>
                        </div>
                    </div>
                </div>

                <div>
                    <AIInsightCard
                        contexto={{
                            modulo: 'Governança',
                            dados: {},
                            projeto_id: params.projetoId
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
