'use client'

import { useState, useMemo, useEffect } from 'react'
import { Activity, Loader2, Plus, Trash2, TrendingDown, TrendingUp, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { MatedSimulator } from '@/components/aura/MatedSimulator'
import { CalibrationBadge } from '@/components/calibration/CalibrationBadge'
import { getModeInfo, SigmaModeInfo } from '@/lib/calibration/sigma-manager'
import { useProject } from '@/context/ProjectContext'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { gerarTrianguloCDT, calcularProjecaoFinanceira, CDTResult } from '@/lib/engine/math'
import { translateCDT, HealthBadge } from '@/components/aura/MetricTranslator'
import { MATEDTimeline } from '@/components/aura/MATEDTimeline'
import { getMATEDHistorico, type MATEDHistoricoPoint } from '@/lib/api/historico'
import { CausalBreakdown } from '@/components/aura/CausalBreakdown'
import { decompMATEDCausal, topCausas } from '@/lib/engine/causal-analysis'

// ── Tabela de Decisões MATED — Simulação What-if com Distância Euclidiana ────
interface DecisaoSimulada {
    id: string
    descricao: string
    deltaPrazo: number  // % de variação no Lado P (+5 = +5% no prazo)
    deltaCusto: number  // % de variação no Lado O (+10 = +10% no custo)
    deltaEscopo: number // % de variação no Lado E (+0 = sem mudança)
}

interface ImpactoDecisao {
    novoP: number
    novoO: number
    novoE: number
    novaDistNVO: number
    deltaDistNVO: number   // positivo = piorou (afastou do NVO), negativo = melhorou
    deltaDias: number      // dias adicionados/removidos
    deltaCustoReais: number // custo incremental em R$
    zonaResultante: string
    cetValida: boolean
}

function calcularImpactoDecisao(
    decisao: DecisaoSimulada,
    cdtAtual: { lados: { prazo: number; orcamento: number; escopo: number }; mated_distancia: number; nvo: number[] },
    prazoBase: number,
    orcamentoBase: number
): ImpactoDecisao {
    const novoP = Math.max(0.01, cdtAtual.lados.prazo * (1 + decisao.deltaPrazo / 100))
    const novoO = Math.max(0.01, cdtAtual.lados.orcamento * (1 + decisao.deltaCusto / 100))
    const novoE = Math.max(0.01, cdtAtual.lados.escopo * (1 + decisao.deltaEscopo / 100))

    // Distância euclidiana do novo ponto de operação ao NVO
    // O ponto de operação está no espaço (P, O) normalizado
    const nvoP = cdtAtual.nvo[0]
    const nvoO = cdtAtual.nvo[1]
    const novaDistNVO = Math.sqrt((novoP - nvoP) ** 2 + (novoO - nvoO) ** 2)
    const deltaDistNVO = novaDistNVO - cdtAtual.mated_distancia

    // Impacto em valores absolutos
    const deltaDias = Math.round((decisao.deltaPrazo / 100) * prazoBase)
    const deltaCustoReais = Math.round((decisao.deltaCusto / 100) * orcamentoBase)

    // Verificação CEt simplificada: |P−O| < E < P+O
    const cetValida = Math.abs(novoP - novoO) < novoE && novoE < novoP + novoO

    // Zona resultante baseada na distância ao NVO
    const zonaResultante = novaDistNVO < 0.15
        ? 'ÓTIMO' : novaDistNVO < 0.30
        ? 'SEGURO' : novaDistNVO < 0.50
        ? 'RISCO' : 'CRISE'

    return { novoP, novoO, novoE, novaDistNVO, deltaDistNVO, deltaDias, deltaCustoReais, zonaResultante, cetValida }
}

export default function MatedPage() {
    const { projetoId } = useParams()
    const { isMotorReady, orcamentoBase, prazoBase, tarefas, custosTarefas, marcos, dataInicio, tenantId, tap } = useProject()
    const [calibInfo, setCalibInfo] = useState<SigmaModeInfo | null>(null)
    const [matedHistorico, setMatedHistorico] = useState<MATEDHistoricoPoint[]>([])

    // Tabela de decisões simuladas
    const [decisoes, setDecisoes] = useState<DecisaoSimulada[]>([])
    const [tabelaExpanded, setTabelaExpanded] = useState(true)
    const [novaDecisao, setNovaDecisao] = useState<Omit<DecisaoSimulada, 'id'>>({
        descricao: '', deltaPrazo: 0, deltaCusto: 0, deltaEscopo: 0
    })

    function adicionarDecisao() {
        if (!novaDecisao.descricao.trim()) return
        setDecisoes(prev => [...prev, { ...novaDecisao, id: crypto.randomUUID() }])
        setNovaDecisao({ descricao: '', deltaPrazo: 0, deltaCusto: 0, deltaEscopo: 0 })
    }

    function removerDecisao(id: string) {
        setDecisoes(prev => prev.filter(d => d.id !== id))
    }

    // Story 3.6: Carregar info de calibração
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const setor = (tap as any)?.setor ?? 'geral'
        getModeInfo(setor, tenantId ?? null, supabase).then(setCalibInfo)
    }, [tenantId, tap])

    // Story 5.9: Carregar histórico MATED
    useEffect(() => {
        if (projetoId) {
            getMATEDHistorico(String(projetoId), supabase).then(setMatedHistorico)
        }
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
            const tarefasConcluidas = tarefas.filter(t => (t.ef || 0) <= dia).length
            pontos.push({ x: dia, y: (tarefasConcluidas / tarefas.length) * 100 })
        }
        if (pontos.length > 0 && pontos[pontos.length - 1].x < prazoBase) {
            pontos.push({ x: prazoBase, y: 100 })
        }
        return pontos
    }, [tarefas, prazoBase])

    // CDT baseline + current
    const cdtBaseline = useMemo(() => {
        if (curvaCusto.length < 2 || curvaPrazo.length < 2) return null
        return gerarTrianguloCDT({ curvaCusto, curvaPrazo, diaAtual: 0, diaBaseline: 0, orcamentoBase: orcamentoBase ?? undefined, prazoBase: prazoBase ?? undefined })
    }, [curvaCusto, curvaPrazo, orcamentoBase, prazoBase])

    const diaAtual = useMemo(() => {
        if (!dataInicio) return Math.floor((prazoBase || 1) * 0.5)
        const diffMs = new Date().getTime() - new Date(dataInicio).getTime()
        return Math.max(0, Math.min(Math.floor(diffMs / 86400000), prazoBase || 1))
    }, [dataInicio, prazoBase])

    const cdtAtual = useMemo<CDTResult | null>(() => {
        if (curvaCusto.length < 2 || curvaPrazo.length < 2 || !cdtBaseline) return null
        return gerarTrianguloCDT({
            curvaCusto, curvaPrazo, diaAtual, diaBaseline: 0,
            areaBaseline: cdtBaseline.cdt_area,
            orcamentoBase: orcamentoBase ?? undefined, prazoBase: prazoBase ?? undefined,
        })
    }, [curvaCusto, curvaPrazo, diaAtual, cdtBaseline, orcamentoBase, prazoBase])

    const metrics = useMemo(() => {
        if (!cdtAtual) return null
        return translateCDT(cdtAtual, orcamentoBase ?? undefined, prazoBase ?? undefined)
    }, [cdtAtual, orcamentoBase, prazoBase])

    if (!isMotorReady || !cdtAtual) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-4">
                {!isMotorReady ? (
                    <p className="font-medium">O motor CDT precisa estar ativo para acessar o MATED.</p>
                ) : (
                    <>
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p className="font-medium">Calculando distancia euclidiana do projeto...</p>
                    </>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="border-b border-slate-800 pb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Activity className="h-8 w-8 text-blue-500" />
                        Simulador MATED
                    </h1>
                    <p className="text-slate-400 mt-2 font-medium">
                        Distancia Euclidiana e Simulacao What-if — dia {diaAtual}
                    </p>
                    {metrics && <div className="mt-3"><HealthBadge metrics={metrics} /></div>}
                    {calibInfo && (
                        <div className="mt-2">
                            <CalibrationBadge
                                n={calibInfo.n}
                                setor={calibInfo.setor}
                                mode={calibInfo.mode}
                            />
                        </div>
                    )}
                </div>
                {cdtAtual && (
                    <div className="text-right">
                        <p className="text-xs text-slate-500 font-bold uppercase">Qualidade CDT</p>
                        <p className={`text-2xl font-bold font-mono ${
                            cdtAtual.zona_mated === 'OTIMO' ? 'text-emerald-500' :
                            cdtAtual.zona_mated === 'SEGURO' ? 'text-blue-500' :
                            cdtAtual.zona_mated === 'RISCO' ? 'text-amber-500' : 'text-rose-500'
                        }`}>
                            {cdtAtual.desvio_qualidade?.toFixed(1) ?? '—'}%
                        </p>
                    </div>
                )}
            </header>

            <div className="flex justify-center items-start min-h-[500px]">
                <MatedSimulator
                    baricentroAtual={cdtAtual.nvo as [number, number]}
                    pontoOperacaoAtual={{ x: cdtAtual.centroide[0], y: cdtAtual.centroide[1] }}
                    threshold={cdtAtual.mated_distancia + 0.1}
                />
            </div>

            {/* Story 5.9: Série Temporal MATED */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    Evolução MATED — Série Temporal
                </h3>
                <MATEDTimeline historico={matedHistorico} />
            </div>

            {/* Story 5.8: Análise Causal — Top 3 causas raiz por tarefa crítica */}
            {tarefas.length > 0 && cdtAtual && (
                <CausalBreakdown
                    causas={topCausas(decompMATEDCausal({
                        ta: {
                            escopo: cdtAtual.lados.escopo,
                            prazo: cdtAtual.lados.prazo,
                            orcamento: cdtAtual.lados.orcamento,
                            mated_distancia: cdtAtual.mated_distancia,
                        },
                        tm: {
                            escopo: 1.0,
                            prazo: 1.0,
                            orcamento: 1.0,
                        },
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        tarefas: tarefas as any,
                    }))}
                />
            )}

            {/* ── Tabela de Simulação de Decisões MATED ── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {/* Cabeçalho collapsible */}
                <button
                    onClick={() => setTabelaExpanded(v => !v)}
                    className="aura-section-toggle w-full px-6 py-4"
                    title={tabelaExpanded ? 'Recolher tabela' : 'Expandir tabela'}
                >
                    <span className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-indigo-400" />
                        Tabela de Decisões — Simulação What-if com Distância Euclidiana
                        <span className="ml-2 px-2 py-0.5 text-[10px] bg-indigo-500/15 text-indigo-400 rounded-full font-bold border border-indigo-500/20">
                            {decisoes.length} decisão{decisoes.length !== 1 ? 'ões' : ''}
                        </span>
                    </span>
                    {tabelaExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {tabelaExpanded && (
                    <div className="px-6 pb-6 space-y-5">
                        {/* Formulário de nova decisão */}
                        <div className="bg-slate-950/60 border border-slate-700/50 rounded-xl p-4 space-y-3">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Plus className="h-3.5 w-3.5" />
                                Simular nova decisão
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="text-xs text-slate-500 block mb-1">Descrição da decisão *</label>
                                    <input
                                        type="text"
                                        value={novaDecisao.descricao}
                                        onChange={e => setNovaDecisao(p => ({ ...p, descricao: e.target.value }))}
                                        placeholder="Ex: Contratar 2 engenheiros adicionais"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                                        onKeyDown={e => e.key === 'Enter' && adicionarDecisao()}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">
                                        Δ Prazo <span className="text-slate-600">(%)</span>
                                        <span title="Impacto no prazo. Ex: -10 = acelera 10%; +15 = atrasa 15%">
                                            <Info className="h-3 w-3 inline ml-1 text-slate-600" />
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        value={novaDecisao.deltaPrazo}
                                        onChange={e => setNovaDecisao(p => ({ ...p, deltaPrazo: Number(e.target.value) }))}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                        step="1"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">
                                        Δ Custo <span className="text-slate-600">(%)</span>
                                        <span title="Impacto no orçamento. Ex: +20 = aumenta custo 20%">
                                            <Info className="h-3 w-3 inline ml-1 text-slate-600" />
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        value={novaDecisao.deltaCusto}
                                        onChange={e => setNovaDecisao(p => ({ ...p, deltaCusto: Number(e.target.value) }))}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                        step="1"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">
                                            Δ Escopo <span className="text-slate-600">(%)</span>
                                            <span title="Impacto no escopo. Ex: +5 = 5% mais tarefas">
                                                <Info className="h-3 w-3 inline ml-1 text-slate-600" />
                                            </span>
                                        </label>
                                        <input
                                            type="number"
                                            value={novaDecisao.deltaEscopo}
                                            onChange={e => setNovaDecisao(p => ({ ...p, deltaEscopo: Number(e.target.value) }))}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                            step="1"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={adicionarDecisao}
                                    disabled={!novaDecisao.descricao.trim()}
                                    className="self-end flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-semibold rounded-lg transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                    Simular
                                </button>
                            </div>
                        </div>

                        {/* Tabela de resultados */}
                        {decisoes.length === 0 ? (
                            <div className="text-center py-8 text-slate-600 text-sm">
                                Adicione decisões acima para ver o impacto no triângulo CDT.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-800">
                                <table className="w-full aura-table text-left">
                                    <thead>
                                        <tr className="border-b border-slate-800 bg-slate-950/40">
                                            <th>Decisão</th>
                                            <th className="text-center">Δ Prazo</th>
                                            <th className="text-center">Δ Custo</th>
                                            <th className="text-center">Dist. NVO</th>
                                            <th className="text-center">Δ vs. Atual</th>
                                            <th className="text-center">Zona</th>
                                            <th className="text-center">CEt</th>
                                            <th>Impacto</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {decisoes.map(dec => {
                                            const impacto = calcularImpactoDecisao(
                                                dec, cdtAtual,
                                                prazoBase ?? 0,
                                                orcamentoBase ?? 0
                                            )
                                            const melhora = impacto.deltaDistNVO < 0
                                            const zonaColor = {
                                                'ÓTIMO':  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                                                'SEGURO': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                                                'RISCO':  'text-amber-400 bg-amber-500/10 border-amber-500/20',
                                                'CRISE':  'text-rose-400 bg-rose-500/10 border-rose-500/20',
                                            }[impacto.zonaResultante] ?? 'text-slate-400'

                                            // Texto de impacto narrativo
                                            const partes: string[] = []
                                            if (Math.abs(impacto.deltaDias) > 0) {
                                                partes.push(impacto.deltaDias < 0
                                                    ? `acelera ${Math.abs(impacto.deltaDias)}d`
                                                    : `atrasa ${impacto.deltaDias}d`)
                                            }
                                            if (Math.abs(impacto.deltaCustoReais) > 0) {
                                                const val = Math.abs(impacto.deltaCustoReais)
                                                const fmt = val >= 1000
                                                    ? `R$ ${(val/1000).toFixed(0)}k`
                                                    : `R$ ${val.toLocaleString('pt-BR')}`
                                                partes.push(impacto.deltaCustoReais > 0
                                                    ? `+${fmt}`
                                                    : `-${fmt}`)
                                            }
                                            if (dec.deltaEscopo !== 0) {
                                                partes.push(dec.deltaEscopo > 0
                                                    ? `escopo +${dec.deltaEscopo}%`
                                                    : `escopo ${dec.deltaEscopo}%`)
                                            }

                                            return (
                                                <tr key={dec.id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="font-medium text-slate-200 max-w-[200px]">
                                                        <span className="truncate block">{dec.descricao}</span>
                                                    </td>
                                                    <td className="text-center font-mono">
                                                        <span className={dec.deltaPrazo < 0 ? 'text-emerald-400' : dec.deltaPrazo > 0 ? 'text-rose-400' : 'text-slate-500'}>
                                                            {dec.deltaPrazo > 0 ? '+' : ''}{dec.deltaPrazo}%
                                                        </span>
                                                    </td>
                                                    <td className="text-center font-mono">
                                                        <span className={dec.deltaCusto < 0 ? 'text-emerald-400' : dec.deltaCusto > 0 ? 'text-amber-400' : 'text-slate-500'}>
                                                            {dec.deltaCusto > 0 ? '+' : ''}{dec.deltaCusto}%
                                                        </span>
                                                    </td>
                                                    <td className="text-center font-mono text-slate-200 font-semibold">
                                                        {impacto.novaDistNVO.toFixed(3)}
                                                    </td>
                                                    <td className="text-center font-mono">
                                                        <span className={`flex items-center justify-center gap-1 ${melhora ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {melhora ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                                                            {melhora ? '' : '+'}{impacto.deltaDistNVO.toFixed(3)}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${zonaColor}`}>
                                                            {impacto.zonaResultante}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        {impacto.cetValida
                                                            ? <span className="text-emerald-400 text-xs font-bold">✓</span>
                                                            : <span className="text-rose-400 text-xs font-bold" title="Triângulo geometricamente inválido após esta decisão">✗</span>
                                                        }
                                                    </td>
                                                    <td className="text-slate-400 text-xs max-w-[180px]">
                                                        {partes.length > 0 ? partes.join(' · ') : '—'}
                                                    </td>
                                                    <td>
                                                        <button
                                                            onClick={() => removerDecisao(dec.id)}
                                                            className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                            title="Remover decisão"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <p className="text-xs text-slate-600 flex items-center gap-1">
                            <Info className="h-3 w-3 flex-shrink-0" />
                            Dist. NVO = distância euclidiana ao Núcleo Viável Ótimo (baricentro do triângulo órtico).
                            Menor distância = decisão mais alinhada com o baseline.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
