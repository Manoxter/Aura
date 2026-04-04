import React from 'react'
import { Target, ArrowRight } from 'lucide-react'
import { calcularMATED } from '@/lib/engine/math'
import { supabase } from '@/lib/supabase'

interface DecisionSimulatorProps {
    projetoId: string
    tenantId: string
    pontoOperacao: { x: number, y: number }
    baricentro: number[]
    onSimulate: (impact: { dx: number, dy: number }) => void
}

export const DecisionSimulator = ({ projetoId, tenantId, pontoOperacao, baricentro, onSimulate }: DecisionSimulatorProps) => {
    // BUG-02: baricentro vazio ou undefined causa NaN em calcularMATED (acessa [0] e [1] sem guarda)
    if (!baricentro || baricentro.length < 2) return null

    const currentDist = calcularMATED(pontoOperacao, baricentro)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSimulate = async (decision: any) => {
        onSimulate(decision.impact)

        // Persistence in historico_projeto
        await supabase.from('historico_projeto').insert({
            projeto_id: projetoId,
            tenant_id: tenantId,
            tipo: 'decisao_tatica',
            usuario: 'Comandante (Simulação)',
            nota: `Decisão: ${decision.label}`,
            alteracoes: {
                label: decision.label,
                impacto_geometrico: decision.impact,
                impacto_burn: decision.burnImpact,
                ponto_anterior: pontoOperacao,
                ponto_projetado: { 
                    x: pontoOperacao.x + decision.impact.dx, 
                    y: pontoOperacao.y + decision.impact.dy 
                }
            }
        })
    }

    const decisions = [
        { 
            id: 'crashing', 
            label: 'Crashing (Aceleração)', 
            desc: 'Aumentar recursos para reduzir o prazo. Risco de fadiga.',
            impact: { dx: -0.1, dy: 0.05 }, 
            burnImpact: 0.25, // +25% burn
            color: 'blue'
        },
        { 
            id: 'descope', 
            label: 'Redução de Escopo', 
            desc: 'Remover tarefas não críticas para aliviar a carga.',
            impact: { dx: -0.05, dy: -0.05 },
            burnImpact: -0.15, // -15% burn
            color: 'amber'
        },
        { 
            id: 'budget', 
            label: 'Injeção de Capital', 
            desc: 'Aumento do teto orçamentário para manter o ritmo.',
            impact: { dx: 0, dy: -0.08 },
            burnImpact: 0.1, // +10% liquidity health (simplified as positive burn impact or just strain)
            color: 'emerald'
        }
    ]

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                <Target className="h-5 w-5 text-indigo-400" />
                Simulador Tático de Decisões
            </h3>
            
            <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl mb-6">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-indigo-300 uppercase">Distância ao Baricentro (KPI MATED)</span>
                    <span className="font-mono text-xl text-white">{(currentDist * 100).toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 mt-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, currentDist * 200)}%` }} />
                </div>
            </div>

            <div className="space-y-3">
                {decisions.map(d => {
                    const projectedPonto = { x: pontoOperacao.x + d.impact.dx, y: pontoOperacao.y + d.impact.dy }
                    const projectedDist = calcularMATED(projectedPonto, baricentro)
                    const improvement = currentDist - projectedDist
                    
                    return (
                        <button 
                            key={d.id}
                            onClick={() => handleSimulate(d)}
                            className="w-full group text-left p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-indigo-500/50 transition-all active:scale-[0.98]"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-100 group-hover:text-white transition-colors">{d.label}</h4>
                                    <p className="text-[10px] text-slate-500 mt-1">{d.desc}</p>
                                </div>
                                <div className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${improvement > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                    {improvement > 0 ? `+${(improvement * 100).toFixed(1)}% Estabilidade` : `${(improvement * 100).toFixed(1)}% Perda`}
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                <div className="flex gap-3">
                                    <span>Δ Geom: {d.impact.dx > 0 ? '+' : ''}{d.impact.dx}, {d.impact.dy > 0 ? '+' : ''}{d.impact.dy}</span>
                                    <span className={d.burnImpact > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                                        Burn: {d.burnImpact > 0 ? '+' : ''}{(d.burnImpact * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </button>
                    )
                })}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-800">
                <p className="text-[10px] text-slate-500 italic text-center">
                    * Recomendações baseadas na geometria analítica do Triângulo Órtico.
                </p>
            </div>
        </div>
    )
}
