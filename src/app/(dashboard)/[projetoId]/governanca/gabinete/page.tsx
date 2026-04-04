'use client'

import { useState, useMemo } from 'react'
import { ShieldAlert, Target, TrendingDown, TrendingUp, Lock, RefreshCcw, Activity, Clock, DollarSign, AlertCircle } from 'lucide-react'
import { useProject } from '@/context/ProjectContext'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { useToast } from '@/hooks/useToast'
import { CaixaFerramentas } from '@/components/aura/CaixaFerramentas'
import type { Ferramenta } from '@/components/aura/CaixaFerramentas'

const FERRAMENTAS_CRISE: Ferramenta[] = [
    {
        id: 'arvore-decisao',
        nome: 'Árvore de Decisão',
        sigla: 'AD',
        descricao: 'Mapeamento visual de decisões e consequências',
        quando: 'Use para escolher entre múltiplas opções de resposta à crise com probabilidades estimadas.',
        zonas: ['RISCO', 'CRISE'],
        guia: [
            'Defina o nó raiz: a decisão principal a ser tomada',
            'Trace ramificações para cada opção disponível',
            'Para cada ramo, estime a probabilidade de sucesso (0–1)',
            'Estime o impacto em custo e prazo de cada desfecho',
            'Calcule o valor esperado: probabilidade × impacto',
            'Escolha a rota com melhor valor esperado e menor risco CDT',
        ],
    },
    {
        id: 'fta',
        nome: 'Árvore de Falhas',
        sigla: 'FTA',
        descricao: 'Análise sistemática de eventos que levam à falha',
        quando: 'Use para entender a combinação de eventos que causou ou pode causar uma crise.',
        zonas: ['CRISE'],
        guia: [
            'Defina o evento indesejado (top event) — ex: violação da CET',
            'Identifique os eventos intermediários que contribuem para ele',
            'Use portas lógicas: AND (todos ocorrem), OR (qualquer um ocorre)',
            'Continue decomposindo até eventos básicos (causas raiz)',
            'Identifique cortes mínimos: menor combinação que leva à falha',
            'Priorize ações para eliminar cortes mínimos críticos',
        ],
    },
    {
        id: 'monte-carlo',
        nome: 'Monte Carlo',
        sigla: 'MC',
        descricao: 'Simulação probabilística de cenários de prazo e custo',
        quando: 'Use para quantificar a incerteza do prazo e custo finais com base em distribuições estatísticas.',
        zonas: ['SEGURO', 'RISCO'],
        guia: [
            'Para cada tarefa crítica, defina estimativa otimista, mais provável e pessimista',
            'Modele cada tarefa com distribuição triangular ou PERT',
            'Execute 1.000+ simulações variando os valores dentro das distribuições',
            'Analise o histograma de prazo total — identifique o percentil 80% e 90%',
            'Identifique tarefas com maior contribuição à variância total',
            'Aplique reserva de contingência no percentil escolhido como meta',
        ],
    },
    {
        id: 'fmea',
        nome: 'FMEA',
        sigla: 'FMEA',
        descricao: 'Análise de modos de falha e seus efeitos no projeto',
        quando: 'Use para priorizar riscos antes que se tornem crises, especialmente em projetos de infraestrutura.',
        zonas: ['SEGURO', 'RISCO', 'CRISE'],
        guia: [
            'Liste todas as atividades ou componentes críticos do projeto',
            'Para cada item, identifique modos de falha possíveis',
            'Avalie Severidade (S), Ocorrência (O) e Detecção (D) — escala 1–10',
            'Calcule RPN = S × O × D para cada modo de falha',
            'Priorize os itens com RPN > 100 para ação imediata',
            'Defina ações corretivas e reavalie o RPN após implementação',
        ],
    },
    {
        id: '5-porques',
        nome: '5 Porquês',
        sigla: '5P',
        descricao: 'Técnica rápida de causa raiz por perguntas encadeadas',
        quando: 'Use para crises com causa raiz não óbvia — rápido, eficaz, sem ferramentas.',
        zonas: ['RISCO', 'CRISE', 'TODOS'],
        guia: [
            'Declare o problema claramente em uma frase objetiva',
            'Pergunta 1: Por quê isso ocorreu? → anote a resposta',
            'Pergunta 2: Por quê [resposta 1] ocorreu? → anote',
            'Repita até 5 vezes ou até chegar a uma causa raiz controlável',
            'Verifique: a causa raiz encontrada é sistêmica ou pontual?',
            'Defina ação preventiva para eliminar a causa raiz identificada',
        ],
    },
]

export default function GabinetePage() {
    const { projetoId } = useParams()
    const { toast } = useToast()
    const {
        prazoBase, orcamentoBase, interrupcoes, dataBaseline, setDataBaseline,
        isMotorReady, tenantId
    } = useProject()
    
    const [saving, setSaving] = useState(false)

    // Lógica de Desvio
    const totalParadas = useMemo(() => {
        return interrupcoes.reduce((acc, curr) => acc + (curr.dias || 0), 0)
    }, [interrupcoes])

    const prazoReal = (prazoBase || 0) + totalParadas
    const desvioPrazo = dataBaseline ? prazoReal - dataBaseline.prazo : 0
    const percentualDesvio = dataBaseline ? (desvioPrazo / dataBaseline.prazo) * 100 : 0

    const isEmCrise = percentualDesvio > 5

    const handleCongelarBaseline = async () => {
        if (!tenantId) return
        setSaving(true)
        try {
            const baseline = {
                prazo: prazoBase,
                orcamento: orcamentoBase,
                data: new Date().toISOString()
            }
            const { error } = await supabase
                .from('projetos')
                .update({ data_baseline: baseline })
                .eq('id', projetoId)

            if (error) throw error
            setDataBaseline(baseline)
            toast({ variant: 'success', message: 'Baseline congelada com sucesso! Este agora é o seu "Norte Verdadeiro".' })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            toast({ variant: 'error', message: 'Erro ao congelar baseline: ' + err.message })
        } finally {
            setSaving(false)
        }
    }

    if (!isMotorReady) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-500">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md shadow-2xl">
                    <ShieldAlert className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Gabinete de Crise Bloqueado</h2>
                    <p className="text-slate-400 text-sm">O monitoramento de governança exige que o motor CDT esteja calibrado e o setup concluído.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="border-b border-slate-800 pb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <ShieldAlert className={`h-8 w-8 ${isEmCrise ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`} />
                        Gabinete de Crise
                    </h1>
                    <p className="text-slate-400 mt-2">Monitoramento de desvios e governança estratégica em tempo real.</p>
                </div>
                {!dataBaseline ? (
                    <button 
                        onClick={handleCongelarBaseline}
                        disabled={saving}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                    >
                        <RefreshCcw className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
                        {saving ? 'Congelando...' : 'Congelar Baseline Oficial'}
                    </button>
                ) : (
                    <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
                        <Lock className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Baseline Ativa</span>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`border rounded-3xl p-8 space-y-4 ${isEmCrise ? 'bg-rose-500/5 border-rose-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                    <div className="flex justify-between items-start">
                        <div className={`p-3 rounded-2xl ${isEmCrise ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            <Activity className="h-6 w-6" />
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${isEmCrise ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                            {isEmCrise ? 'Em Crise' : 'Saudável'}
                        </span>
                    </div>
                    <div>
                        <h3 className="text-slate-400 text-sm font-medium">Status de Saúde</h3>
                        <p className="text-2xl font-bold text-white mt-1">
                            {isEmCrise ? 'Desvio Crítico Detectado' : 'Operação Estável'}
                        </p>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4">
                    <div className="p-3 bg-blue-500/10 text-blue-500 w-fit rounded-2xl">
                        <Clock className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-slate-400 text-sm font-medium">Cronograma (Real vs Baseline)</h3>
                        <div className="flex items-end gap-3 mt-1">
                            <p className="text-2xl font-bold text-white font-mono">{prazoReal}d</p>
                            <p className={`text-sm font-mono flex items-center gap-1 mb-1 ${desvioPrazo > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {desvioPrazo > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                {desvioPrazo > 0 ? `+${desvioPrazo}` : desvioPrazo} dias
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4">
                    <div className="p-3 bg-amber-500/10 text-amber-500 w-fit rounded-2xl">
                        <DollarSign className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-slate-400 text-sm font-medium">Impacto em Custo</h3>
                        <p className="text-2xl font-bold text-white mt-1">R$ 0,00</p>
                        <p className="text-xs text-slate-500 mt-1">Cálculo de penalidade por dia de atraso inativo.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                        <Target className="h-5 w-5 text-emerald-500" /> Vértice de Prazo vs Baseline
                    </h3>
                    
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-2">
                                <span>Baseline Oficial</span>
                                <span>{dataBaseline?.prazo || 0} dias</span>
                            </div>
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500/50 w-full"></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-2">
                                <span>Projeção Atual (Com Interrupções)</span>
                                <span className={isEmCrise ? 'text-rose-500' : 'text-emerald-500'}>{prazoReal} dias</span>
                            </div>
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 ${isEmCrise ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min(100, (prazoReal / (dataBaseline?.prazo || prazoReal)) * 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 mt-8">
                            <h4 className="text-sm font-bold text-slate-300 mb-2">Análise de Risco</h4>
                            <p className="text-sm text-slate-500">
                                {isEmCrise 
                                    ? 'O projeto ultrapassou a margem de segurança de 5%. Recomenda-se reancoragem das tarefas críticas no CPM.'
                                    : 'Desvios dentro da zona de tolerância. Nenhuma ação estratégica necessária no momento.'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                        <AlertCircle className="h-5 w-5 text-rose-500" /> Fatores Contribuintes
                    </h3>
                    {interrupcoes.length === 0 ? (
                        <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl text-slate-600 text-sm">
                            Nenhuma interrupção registrada para análise.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {interrupcoes.map((int, i) => (
                                <div key={i} className="flex justify-between items-center bg-slate-950 border border-slate-800 p-4 rounded-xl">
                                    <div>
                                        <p className="text-sm font-bold text-slate-200">{int.motivo}</p>
                                        <p className="text-xs text-slate-500">{int.data}</p>
                                    </div>
                                    <span className="text-rose-500 font-mono font-bold">+{int.dias}d</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Ferramentas de Resposta a Crises */}
            <CaixaFerramentas
                ferramentas={FERRAMENTAS_CRISE}
                klaussRecomenda={isEmCrise ? 'fta' : '5-porques'}
                titulo="Ferramentas de Resposta"
                subtitulo="Crise detectada — Klauss sugere a ferramenta mais adequada"
            />
        </div>
    )
}
