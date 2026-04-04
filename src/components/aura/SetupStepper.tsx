'use client'

import { useProject } from '@/context/ProjectContext'
import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { FileText, Layers, Calendar, GitMerge, DollarSign, TrendingDown, Gauge } from 'lucide-react'

type StepStatus = 'pending' | 'active' | 'done' | 'error'

interface Step {
    id: string
    label: string
    path: string
    icon: React.ReactNode
    isReady: boolean
}

export function SetupStepper() {
    const { projetoId } = useParams()
    const pathname = usePathname()
    const {
        isTapReady, isEapReady, isCalendarioReady,
        isCpmReady, isOrcamentoReady, isFuncoesReady, isMotorReady
    } = useProject()

    const steps: Step[] = [
        { id: 'tap', label: 'TAP', path: `/${projetoId}/setup/tap`, icon: <FileText className="h-4 w-4" />, isReady: isTapReady },
        { id: 'wbs', label: 'WBS', path: `/${projetoId}/setup/wbs`, icon: <Layers className="h-4 w-4" />, isReady: isEapReady },
        { id: 'calendario', label: 'Calendario', path: `/${projetoId}/setup/calendario`, icon: <Calendar className="h-4 w-4" />, isReady: isCalendarioReady },
        { id: 'tarefas-diagramas', label: 'Tarefas', path: `/${projetoId}/setup/tarefas-diagramas`, icon: <GitMerge className="h-4 w-4" />, isReady: isCpmReady },
        { id: 'orcamento', label: 'Orcamento', path: `/${projetoId}/setup/orcamento`, icon: <DollarSign className="h-4 w-4" />, isReady: isOrcamentoReady },
        { id: 'funcoes', label: 'Funcoes', path: `/${projetoId}/setup/funcoes`, icon: <TrendingDown className="h-4 w-4" />, isReady: isFuncoesReady },
        { id: 'triangulo-matriz', label: 'Motor', path: `/${projetoId}/motor/triangulo-matriz`, icon: <Gauge className="h-4 w-4" />, isReady: isMotorReady },
    ]

    const getStatus = (step: Step, _idx: number): StepStatus => {
        const isActive = pathname?.includes(step.id) || pathname?.includes(step.path)
        if (isActive) return 'active'
        if (step.isReady) return 'done'
        return 'pending'
    }

    const statusStyles: Record<StepStatus, string> = {
        pending: 'bg-slate-800 border-slate-700 text-slate-500',
        active: 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20',
        done: 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400',
        error: 'bg-rose-600/20 border-rose-500/50 text-rose-400',
    }

    const lineStyles: Record<StepStatus, string> = {
        pending: 'bg-slate-700',
        active: 'bg-blue-500',
        done: 'bg-emerald-500',
        error: 'bg-rose-500',
    }

    return (
        <div className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl p-2 sm:p-3 lg:p-4 mb-4 sm:mb-6">
            <div className="flex items-center justify-between gap-0.5 sm:gap-1">
                {steps.map((step, idx) => {
                    const status = getStatus(step, idx)
                    return (
                        <div key={step.id} className="flex items-center flex-1">
                            <Link
                                href={step.path}
                                className={`flex items-center gap-1 sm:gap-2 px-1.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl border text-[10px] sm:text-xs font-bold transition-all hover:scale-105 duration-200 ${statusStyles[status]}`}
                                title={step.label}
                            >
                                {step.icon}
                                <span className="hidden lg:inline">{step.label}</span>
                            </Link>
                            {idx < steps.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-1 rounded-full transition-colors ${lineStyles[status === 'done' ? 'done' : 'pending']}`} />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
