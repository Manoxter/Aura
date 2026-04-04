'use client'

import { ReactNode } from 'react'
import { Lock, Zap } from 'lucide-react'
import { useProject } from '@/context/ProjectContext'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface PlanGateProps {
    children: ReactNode
    minPlan?: 'START' | 'PRO' | 'ELITE'
    featureName: string
}

const PLAN_LEVELS = {
    'START': 0,
    'PRO': 1,
    'ELITE': 2
}

export function PlanGate({ children, minPlan = 'PRO', featureName }: PlanGateProps) {
    const { plan } = useProject()
    const { projetoId } = useParams()

    const currentLevel = PLAN_LEVELS[plan || 'START']
    const requiredLevel = PLAN_LEVELS[minPlan]

    if (currentLevel < requiredLevel) {
        return (
            <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm rounded-3xl border border-slate-800 animate-in fade-in zoom-in duration-500 relative overflow-hidden group">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] group-hover:bg-indigo-500/20 transition-all duration-700" />
                
                <div className="relative z-10 text-center max-w-md p-8">
                    <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-950 border border-slate-800 mb-6 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                        <Lock className="h-10 w-10 text-indigo-500" />
                    </div>
                    
                    <h2 className="text-2xl font-black text-white tracking-tight mb-3">
                        Recurso Exclusivo <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-500">{minPlan}</span>
                    </h2>
                    
                    <p className="text-slate-400 mb-8 leading-relaxed text-sm">
                        O módulo <span className="text-slate-100 font-bold">{featureName}</span> está disponível apenas para assinantes do plano {minPlan} ou superior. 
                        Potencialize sua gestão com a governança analítica tridimensional do Aura.
                    </p>
                    
                    <Link 
                        href={`/${projetoId}/admin/planos`}
                        className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-xl shadow-indigo-900/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Zap className="h-4 w-4 fill-current" />
                        Upgrade para Platinum
                    </Link>
                    
                    <p className="mt-8 text-[10px] text-slate-600 uppercase tracking-[0.2em] font-mono">
                        Aura Neural Gating Protection
                    </p>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
