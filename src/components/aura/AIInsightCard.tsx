'use client'

import { useState, useEffect } from 'react'
import { Sparkles, AlertTriangle, CheckCircle, ChevronRight, Loader2 } from 'lucide-react'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { cn } from '@/lib/utils'

interface AIInsightCardProps {
    contexto: {
        modulo: string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dados: Record<string, any>
        projeto_id: string
    }
}

interface InsightResponse {
    resumo: string
    alertas: string[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    acoes: Array<{ descricao: string; payload: any }>
}

export function AIInsightCard({ contexto }: AIInsightCardProps) {
    const [insight, setInsight] = useState<InsightResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const dadosKey = JSON.stringify(contexto.dados)

    useEffect(() => {
        async function fetchInsight() {
            setLoading(true)
            setError('')
            try {
                await new Promise(r => setTimeout(r, 1500))
                
                // AUDIT LOGIC FOR TAP (V6.2)
                if (contexto.modulo === 'Setup TAP' && contexto.dados.mode === 'AUDIT_ONLY') {
                    const { orcamento_total, prazo_total, raw_text } = contexto.dados
                    const alerts = []
                    
                    // Simple simulated audit
                    if (raw_text && orcamento_total > 0 && !raw_text.includes(orcamento_total.toLocaleString())) {
                        alerts.push(`Inconsistência: O valor R$ ${orcamento_total.toLocaleString()} não foi encontrado explicitamente no texto original.`)
                    }
                    if (prazo_total > 365) {
                        alerts.push("Alerta: Prazo superior a 1 ano detectado. Recomenda-se dividir em fases.")
                    }

                    setInsight({
                        resumo: `Klauss Auditor: Análise de integridade concluída para ${contexto.dados.nome_projeto || 'projeto'}.`,
                        alertas: alerts.length > 0 ? alerts : ['Nenhuma inconsistência crítica detectada entre o texto e os campos.'],
                        acoes: [{ descricao: 'Validar Estrutura CPM', payload: {} }]
                    })
                } else {
                    setInsight({
                        resumo: `Análise do módulo ${contexto.modulo} concluída. O cenário atual sugere atenção em parâmetros de resiliência.`,
                        alertas: contexto.dados.custo > 1000 ? ['Custo excede o valor de atenção.'] : [],
                        acoes: [{ descricao: 'Otimizar Cronograma', payload: {} }]
                    })
                }
            } catch (_err) {
                setError('Falha ao obter insight.')
            } finally {
                setLoading(false)
            }
        }

        if (contexto.dados && Object.keys(contexto.dados).length > 0) {
            fetchInsight()
        }
    }, [dadosKey])

    return (
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-900/40 via-blue-950/40 to-slate-900/60 p-5 shadow-2xl backdrop-blur-md">
            {/* Decorative background glow */}
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-blue-600/20 blur-3xl" />

            <div className="flex items-center gap-3 mb-4">
                <div className="flex bg-blue-500/20 p-2 rounded-lg text-blue-400">
                    <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-white tracking-tight">IA Insight</h3>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400 mb-2" />
                    <p className="text-sm">Analisando contexto...</p>
                </div>
            ) : error ? (
                <div className="text-red-400 text-sm bg-red-950/30 p-3 rounded-lg border border-red-900/50">{error}</div>
            ) : insight ? (
                <div className="space-y-4 animate-in fade-in duration-500">
                    <p className="text-sm text-slate-300 leading-relaxed">{insight.resumo}</p>

                    {insight.alertas.length > 0 && (
                        <div className="space-y-2">
                            {insight.alertas.map((alerta, idx) => (
                                <div key={idx} className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-200/90">{alerta}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {insight.acoes.length > 0 && (
                        <div className="space-y-2 pt-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ações Recomendadas</h4>
                            {insight.acoes.map((acao, idx) => (
                                <button
                                    key={idx}
                                    className="w-full group flex items-center justify-between bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg p-3 transition-colors text-left"
                                >
                                    <span className="text-sm text-slate-200 font-medium flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                                        {acao.descricao}
                                    </span>
                                    <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-sm text-slate-400 py-4">Aguardando dados para análise...</p>
            )}
        </div>
    )
}
