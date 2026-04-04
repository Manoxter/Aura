'use client'

import { useState, useMemo, useEffect } from 'react'
import { AlertCircle, Clock, Activity, Shield, TrendingDown, ArrowRight } from 'lucide-react'
import { StickyFerramentasButton } from '@/components/aura/StickyFerramentasButton'
import { useProject } from '@/context/ProjectContext'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { gerarTrianguloCDT, calcularProjecaoFinanceira, decomporMATED, CDTResult } from '@/lib/engine/math'
import { translateCDT, CDTNarrative, HealthBadge } from '@/components/aura/MetricTranslator'
import { MATEDBadge } from '@/components/ui/MATEDBadge'
import { ZONA_LABELS } from '@/lib/constants/cdt-labels'

export default function WarRoomPage() {
    const { projetoId } = useParams()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { isMotorReady, orcamentoBase, prazoBase, tarefas, custosTarefas, marcos, dataInicio, tenantId } = useProject()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [history, setHistory] = useState<any[]>([])
    const [scenarioCusto, setScenarioCusto] = useState(0)  // % de variacao
    const [scenarioPrazo, setScenarioPrazo] = useState(0)  // % de variacao

    // Load decision history
    useEffect(() => {
        async function loadHistory() {
            if (!projetoId) return
            const { data } = await supabase
                .from('mated_history')
                .select('*')
                .eq('projeto_id', projetoId)
                .order('created_at', { ascending: false })
                .limit(10)
            if (data) setHistory(data)
        }
        loadHistory()
    }, [projetoId])

    // Build project curves
    const curvaCusto = useMemo(() => {
        if (!prazoBase || tarefas.length === 0) return []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const projecao = calcularProjecaoFinanceira(tarefas as any, custosTarefas, marcos, prazoBase)
        return projecao.map(p => ({ x: p.dia, y: p.acumulado }))
    }, [tarefas, custosTarefas, marcos, prazoBase])

    const curvaPrazo = useMemo(() => {
        if (!prazoBase || tarefas.length === 0) return []
        const pontos: { x: number; y: number }[] = []
        const step = Math.max(1, Math.floor(prazoBase / 50))
        for (let dia = 0; dia <= prazoBase; dia += step) {
            const tarefasConcluidas = tarefas.filter(t => (t.ef ?? 0) <= dia).length
            pontos.push({ x: dia, y: (tarefasConcluidas / tarefas.length) * 100 })
        }
        if (pontos.length > 0 && pontos[pontos.length - 1].x < prazoBase) {
            pontos.push({ x: prazoBase, y: 100 })
        }
        return pontos
    }, [tarefas, prazoBase])

    // CDT v2: baseline
    const cdtBaseline = useMemo(() => {
        if (curvaCusto.length < 2 || curvaPrazo.length < 2) return null
        return gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0, orcamentoBase: orcamentoBase ?? undefined, prazoBase: prazoBase ?? undefined })
    }, [curvaCusto, curvaPrazo, orcamentoBase, prazoBase])

    // Current project day
    const diaAtual = useMemo(() => {
        if (!dataInicio) return Math.floor((prazoBase || 1) * 0.5)
        const diffMs = new Date().getTime() - new Date(dataInicio).getTime()
        return Math.max(0, Math.min(Math.floor(diffMs / 86400000), prazoBase || 1))
    }, [dataInicio, prazoBase])

    // CDT v2: estado atual
    const cdtAtual = useMemo<CDTResult | null>(() => {
        if (curvaCusto.length < 2 || curvaPrazo.length < 2 || !cdtBaseline) return null
        return gerarTrianguloCDT({
            curvaCusto, curvaPrazo, diaAtual, diaBaseline: 0,
            areaBaseline: cdtBaseline.cdt_area,
            orcamentoBase: orcamentoBase ?? undefined, prazoBase: prazoBase ?? undefined,
        })
    }, [curvaCusto, curvaPrazo, diaAtual, cdtBaseline, orcamentoBase, prazoBase])

    // CDT v2: cenario what-if (aplicar variacao % nas curvas)
    const cdtCenario = useMemo<CDTResult | null>(() => {
        if (!cdtBaseline || curvaCusto.length < 2 || curvaPrazo.length < 2) return null
        if (scenarioCusto === 0 && scenarioPrazo === 0) return null
        const factorCusto = 1 + scenarioCusto / 100
        const factorPrazo = 1 + scenarioPrazo / 100
        const curvaModCusto = curvaCusto.map(p => ({ x: p.x, y: p.y * factorCusto }))
        const curvaModPrazo = curvaPrazo.map(p => ({ x: p.x * factorPrazo, y: p.y }))
        return gerarTrianguloCDT({
            curvaCusto: curvaModCusto, curvaPrazo: curvaModPrazo,
            diaAtual, diaBaseline: 0, areaBaseline: cdtBaseline.cdt_area,
            orcamentoBase: orcamentoBase ?? undefined, prazoBase: prazoBase ?? undefined,
        })
    }, [cdtBaseline, curvaCusto, curvaPrazo, diaAtual, scenarioCusto, scenarioPrazo, orcamentoBase, prazoBase])

    const metricsAtual = useMemo(() => {
        if (!cdtAtual) return null
        return translateCDT(cdtAtual, orcamentoBase ?? undefined, prazoBase ?? undefined)
    }, [cdtAtual, orcamentoBase, prazoBase])

    const metricsCenario = useMemo(() => {
        if (!cdtCenario) return null
        return translateCDT(cdtCenario, orcamentoBase ?? undefined, prazoBase ?? undefined)
    }, [cdtCenario, orcamentoBase, prazoBase])

    // Klauss IA interpretation
    const klaussInterpretacao = useMemo(() => {
        if (!cdtAtual) return null
        const zona = cdtAtual.zona_mated
        const decomp = decomporMATED(
            { x: cdtAtual.centroide[0], y: cdtAtual.centroide[1] },
            cdtAtual.nvo, cdtAtual.lados
        )

        if (zona === 'OTIMO') {
            return {
                titulo: 'Equilibrio Estavel',
                narrativa: 'O projeto esta no ponto de equilibrio ideal. Escopo, custo e prazo coexistem dentro dos limites planejados. Mantenha monitoramento preventivo.',
                acao: 'Continuar execucao conforme planejado.',
                severidade: 'low' as const,
            }
        }
        if (zona === 'SEGURO') {
            return {
                titulo: 'Margem Reduzida',
                narrativa: `O projeto opera dentro da resiliencia, mas com margem reduzida. Direcao principal de desvio: ${decomp.direcao_principal}. Atencao redobrada recomendada.`,
                acao: 'Revisar cronograma e custos na proxima reuniao de status.',
                severidade: 'medium' as const,
            }
        }
        if (zona === 'RISCO') {
            return {
                titulo: 'Zona de Risco',
                narrativa: `Desvio significativo detectado (direcao: ${decomp.direcao_principal}). Qualidade do projeto em ${cdtAtual.desvio_qualidade?.toFixed(1) ?? '?'}%. ${!cdtAtual.cet.valida ? 'ALERTA: Condicao de Existencia violada — projeto geometricamente inviavel.' : 'A CEt ainda e valida mas o triangulo esta deformado.'}`,
                acao: `Acao corretiva necessaria: ${decomp.direcao_principal === 'custo' ? 'conter burn rate e revisar alocacoes' : decomp.direcao_principal === 'prazo' ? 'acelerar entregas ou renegociar cronograma' : 'rebalancear escopo, custo e prazo simultaneamente'}.`,
                severidade: 'high' as const,
            }
        }
        return {
            titulo: 'CRISE ATIVA',
            narrativa: `Ruptura de resiliencia detectada. ${!cdtAtual.cet.valida ? 'O triangulo de qualidade nao existe mais — escopo, custo e prazo sao geometricamente impossiveis de conciliar.' : `Qualidade em ${cdtAtual.desvio_qualidade?.toFixed(1) ?? '?'}% — abaixo do limiar critico.`} Direcao do desvio: ${decomp.direcao_principal}.`,
            acao: 'Convocar War Room imediatamente. Decisoes de trade-off obrigatorias: cortar escopo, aumentar orcamento ou estender prazo.',
            severidade: 'critical' as const,
        }
    }, [cdtAtual])

    if (!isMotorReady) {
        return (
            <div className="p-20 text-center text-slate-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                <p>Motor CDT precisa estar ativo para acessar o War Room.</p>
            </div>
        )
    }

    const severidadeCores = {
        low: { bg: 'bg-emerald-950/30', border: 'border-emerald-900/50', text: 'text-emerald-400', icon: Shield },
        medium: { bg: 'bg-blue-950/30', border: 'border-blue-900/50', text: 'text-blue-400', icon: Activity },
        high: { bg: 'bg-amber-950/30', border: 'border-amber-900/50', text: 'text-amber-400', icon: AlertCircle },
        critical: { bg: 'bg-rose-950/30', border: 'border-rose-900/50', text: 'text-rose-400', icon: AlertCircle },
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500">
            <header className="border-b border-slate-800 pb-4 sm:pb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
                <div>
                    <div className="flex items-center gap-3 text-rose-500 mb-2">
                        <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                        <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider">Gabinete de Crise</h2>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-50">War Room</h1>
                    <p className="text-slate-400 mt-1 sm:mt-2 text-sm sm:text-base">
                        Centro de decisao com simulacao MATED em tempo real — dia {diaAtual} do projeto.
                    </p>
                    {metricsAtual && <div className="mt-3"><HealthBadge metrics={metricsAtual} /></div>}
                </div>
                {cdtAtual && (
                    <div className="text-left sm:text-right flex sm:block items-center gap-3 sm:gap-0">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Qualidade CDT</p>
                        <p className={`text-2xl sm:text-3xl font-bold font-mono ${
                            cdtAtual.zona_mated === 'OTIMO' ? 'text-emerald-500' :
                            cdtAtual.zona_mated === 'SEGURO' ? 'text-blue-500' :
                            cdtAtual.zona_mated === 'RISCO' ? 'text-amber-500' : 'text-rose-500'
                        }`}>
                            {cdtAtual.desvio_qualidade?.toFixed(1) ?? '—'}%
                        </p>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">

                {/* Col 1: Status + Klauss — first on mobile */}
                <div className="space-y-6 order-1">
                    {/* Klauss IA Interpretation */}
                    {klaussInterpretacao && (() => {
                        const cores = severidadeCores[klaussInterpretacao.severidade]
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const _Icon = cores.icon
                        return (
                            <div className={`${cores.bg} border ${cores.border} rounded-2xl p-6 space-y-4`}>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <span className="absolute inline-flex h-3 w-3 rounded-full bg-indigo-400 opacity-75 animate-ping" />
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500" />
                                    </div>
                                    <h3 className="text-sm font-bold text-indigo-400">Klauss IA</h3>
                                </div>
                                <div>
                                    <h4 className={`text-lg font-bold ${cores.text}`}>{klaussInterpretacao.titulo}</h4>
                                    <p className="text-sm text-slate-300 mt-2 leading-relaxed">{klaussInterpretacao.narrativa}</p>
                                </div>
                                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Acao Recomendada</p>
                                    <p className="text-sm text-slate-200">{klaussInterpretacao.acao}</p>
                                </div>
                            </div>
                        )
                    })()}

                    {/* CDT Metrics */}
                    {cdtAtual && (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metricas CDT v2</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-800/50 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-500 uppercase">Escopo</p>
                                    <p className="text-lg font-bold font-mono text-slate-200">{cdtAtual.lados_brutos.E.toFixed(2)}</p>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-500 uppercase">Custo</p>
                                    <p className={`text-lg font-bold font-mono ${cdtAtual.lados_brutos.C > 1.2 ? 'text-rose-400' : 'text-slate-200'}`}>
                                        {cdtAtual.lados_brutos.C.toFixed(3)}
                                    </p>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-500 uppercase">Prazo</p>
                                    <p className={`text-lg font-bold font-mono ${cdtAtual.lados_brutos.P > 1.2 ? 'text-amber-400' : 'text-slate-200'}`}>
                                        {cdtAtual.lados_brutos.P.toFixed(3)}
                                    </p>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-3">
                                    <p className="text-[10px] text-slate-500 uppercase">CEt</p>
                                    <p className={`text-lg font-bold ${cdtAtual.cet.valida ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {cdtAtual.cet.valida ? 'OK' : 'FALHA'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Col 2: What-If Simulator — second on mobile */}
                <div className="space-y-6 order-2">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2 mb-6">
                            <TrendingDown className="h-5 w-5 text-indigo-400" />
                            Cenario What-If
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <label className="flex justify-between text-sm font-medium text-slate-400 mb-2">
                                    <span>Variacao de Custo</span>
                                    <span className={`font-mono ${scenarioCusto > 0 ? 'text-rose-400' : scenarioCusto < 0 ? 'text-emerald-400' : 'text-slate-50'}`}>
                                        {scenarioCusto > 0 ? '+' : ''}{scenarioCusto}%
                                    </span>
                                </label>
                                <input
                                    type="range" min="-50" max="100" step="5"
                                    value={scenarioCusto}
                                    onChange={e => setScenarioCusto(parseInt(e.target.value))}
                                    className="w-full accent-rose-500"
                                />
                            </div>
                            <div>
                                <label className="flex justify-between text-sm font-medium text-slate-400 mb-2">
                                    <span>Variacao de Prazo</span>
                                    <span className={`font-mono ${scenarioPrazo > 0 ? 'text-amber-400' : scenarioPrazo < 0 ? 'text-emerald-400' : 'text-slate-50'}`}>
                                        {scenarioPrazo > 0 ? '+' : ''}{scenarioPrazo}%
                                    </span>
                                </label>
                                <input
                                    type="range" min="-30" max="50" step="5"
                                    value={scenarioPrazo}
                                    onChange={e => setScenarioPrazo(parseInt(e.target.value))}
                                    className="w-full accent-amber-500"
                                />
                            </div>
                        </div>

                        {/* Comparison: Current vs Scenario */}
                        {cdtCenario && cdtAtual && (
                            <div className="mt-6 pt-6 border-t border-slate-800">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <p className="text-[10px] text-slate-500 uppercase mb-1">Atual</p>
                                        <div className="flex justify-center my-1">
                                            <MATEDBadge zona={cdtAtual.zona_mated} size="sm" />
                                        </div>
                                        <p className="text-xs text-slate-500">{cdtAtual.desvio_qualidade?.toFixed(1) ?? '—'}%</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-slate-500 uppercase mb-1">Cenario</p>
                                        <div className="flex justify-center my-1">
                                            <MATEDBadge zona={cdtCenario.zona_mated} size="sm" />
                                        </div>
                                        <p className="text-xs text-slate-500">{cdtCenario.desvio_qualidade?.toFixed(1) ?? '—'}%</p>
                                    </div>
                                </div>

                                {cdtCenario.zona_mated !== cdtAtual.zona_mated && (
                                    <div className={`mt-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
                                        cdtCenario.zona_mated === 'CRISE' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' :
                                        cdtCenario.zona_mated === 'RISCO' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' :
                                        'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                    }`}>
                                        <ArrowRight className="h-4 w-4" />
                                        <span>
                                            Zona muda de <strong>{ZONA_LABELS[cdtAtual.zona_mated].nome}</strong> para <strong>{ZONA_LABELS[cdtCenario.zona_mated].nome}</strong>
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => { setScenarioCusto(0); setScenarioPrazo(0) }}
                            className="mt-4 w-full py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            Resetar cenario
                        </button>
                    </div>

                    {/* Scenario CDT Narrative */}
                    {metricsCenario && (
                        <div className="border border-dashed border-slate-700 rounded-2xl p-1">
                            <p className="text-[10px] text-slate-600 text-center mb-1 uppercase tracking-wider">Projecao do Cenario</p>
                            <CDTNarrative metrics={metricsCenario} />
                        </div>
                    )}
                </div>

                {/* Col 3: Current Narrative + History — third on mobile */}
                <div className="space-y-6 order-3">
                    {metricsAtual && <CDTNarrative metrics={metricsAtual} />}

                    {/* Decision History */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Historico de Decisoes
                        </h3>
                        {history.length === 0 ? (
                            <p className="text-xs text-slate-600 italic">Nenhuma decisao registrada. Use o Dashboard CDT para registrar snapshots.</p>
                        ) : (
                            <div className="space-y-3">
                                {history.map(h => (
                                    <div key={h.id} className="flex justify-between items-center text-xs border-b border-slate-800 pb-2 last:border-none">
                                        <div>
                                            <p className="font-bold text-slate-200">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(h.custo)} / {h.prazo}d
                                            </p>
                                            <p className="text-[10px] text-slate-500">{new Date(h.created_at).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`font-mono font-bold ${h.assertividade > 80 ? 'text-emerald-500' : h.assertividade > 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                {h.assertividade}%
                                            </span>
                                            {h.config_simulada?.zona_mated && (
                                                <MATEDBadge zona={h.config_simulada.zona_mated} size="xs" showIcon={false} />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Req I: Ferramentas sticky no War Room (mesmo do Dashboard) */}
            <StickyFerramentasButton />
        </div>
    )
}
