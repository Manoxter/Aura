'use client'

import { Bell, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { AIInsightCard } from '@/components/aura/AIInsightCard'
import { useProject } from '@/context/ProjectContext'
import { classificarFormaTriangulo } from '@/lib/engine/math'

// Limiares MATED CDT v3.0 (delta-based, relativos ao baseline isósceles sqrt(7)/12)
const LIMIAR_SEGURO = 0.15
const LIMIAR_RISCO  = 0.30

export default function AlertasPage({ params }: { params: { projetoId: string } }) {
    const { taAtual, matedAtual } = useProject()

    const mated = matedAtual
    const zona  = mated === null ? null
        : mated >= LIMIAR_RISCO   ? 'CRISE'
        : mated >= LIMIAR_SEGURO  ? 'RISCO'
        : 'SEGURO'
    const forma = taAtual ? classificarFormaTriangulo(taAtual.E, taAtual.O, taAtual.P) : null
    const cetOk = taAtual
        ? (taAtual.E < taAtual.O + taAtual.P && taAtual.O < taAtual.E + taAtual.P && taAtual.P < taAtual.E + taAtual.O)
        : true

    // Alertas ativos derivados do estado atual do motor
    const alertas: { icon: React.ReactNode; cor: string; titulo: string; descricao: string }[] = []

    if (!cetOk) {
        alertas.push({
            icon: <AlertTriangle className="h-5 w-5" />,
            cor: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
            titulo: 'CET Violada — Triângulo Inválido',
            descricao: 'A Condição de Existência do Triângulo foi violada. O projeto está geometricamente impossível. Intervenção imediata obrigatória.',
        })
    }

    if (forma === 'retangulo') {
        alertas.push({
            icon: <AlertTriangle className="h-5 w-5" />,
            cor: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
            titulo: 'Ângulo Reto Detectado — Dissociação P/C',
            descricao: 'O triângulo atingiu ângulo reto entre prazo e custo. O projeto perdeu resiliência elástica. Redesenho da TAP recomendado.',
        })
    }

    if (zona === 'CRISE' || (mated !== null && mated >= LIMIAR_RISCO)) {
        alertas.push({
            icon: <AlertTriangle className="h-5 w-5" />,
            cor: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
            titulo: `Zona CRISE — MATED ${mated?.toFixed(3) ?? '?'}`,
            descricao: 'A distância ao NVO excede o limiar de crise. O projeto está em deformação plástica. Acione o Gabinete de Crise imediatamente.',
        })
    } else if (zona === 'RISCO' || (mated !== null && mated >= LIMIAR_SEGURO)) {
        alertas.push({
            icon: <Clock className="h-5 w-5" />,
            cor: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
            titulo: `Zona RISCO — MATED ${mated?.toFixed(3) ?? '?'}`,
            descricao: 'O projeto está se afastando do NVO. Monitoramento intensificado recomendado. Verifique tendência no Triângulo Matriz.',
        })
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="border-b border-slate-800 pb-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Bell className="h-8 w-8 text-blue-500" />
                        Alertas do Projeto
                    </h1>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-slate-700 text-slate-400">
                        Notificações Resend — Em desenvolvimento
                    </span>
                </div>
                <p className="text-slate-400 mt-2 font-medium">
                    Alertas geométricos ativos derivados do motor Aura. Notificações por e-mail (Resend) disponíveis na v7.x.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {alertas.length > 0 ? (
                        alertas.map((alerta, i) => (
                            <div key={i} className={`border rounded-2xl p-5 flex items-start gap-4 ${alerta.cor}`}>
                                <div className="mt-0.5 flex-shrink-0">{alerta.icon}</div>
                                <div>
                                    <p className="font-bold text-sm">{alerta.titulo}</p>
                                    <p className="text-xs opacity-80 mt-1">{alerta.descricao}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg min-h-[300px]">
                            <div className="text-center mt-16">
                                <CheckCircle className="h-12 w-12 text-emerald-600/40 mx-auto mb-4" />
                                <p className="text-slate-400 font-medium">Nenhum alerta ativo.</p>
                                <p className="text-sm text-slate-500 mt-2">
                                    {mated !== null
                                        ? `Zona atual: ${zona ?? '—'} · MATED: ${mated.toFixed(3)}`
                                        : 'Configure TAP e CPM para ativar monitoramento geométrico.'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <AIInsightCard
                        contexto={{
                            modulo: 'Alertas',
                            dados: { zona, mated, forma, cetOk },
                            projeto_id: params.projetoId
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
