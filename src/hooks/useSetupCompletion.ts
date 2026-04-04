import { useMemo } from 'react'
import { useProject } from '@/context/ProjectContext'

export type StepStatus = 'complete' | 'in-progress' | 'pending' | 'blocked'

export interface SetupStep {
    id: string
    label: string
    status: StepStatus
    detalhe: string
    ctaLabel?: string
    ctaHref?: string
}

export interface SetupCompletion {
    temNome: boolean        // projeto tem nome >= 3 chars
    temTarefas: boolean     // projeto tem >= 1 tarefa
    temEap: boolean         // projeto tem >= 1 nó EAP
    temDatas: boolean       // isCpmReady (tarefas calculadas com datas)
    percentual: number      // (concluidos/4) * 100
    steps: SetupStep[]      // 5 passos detalhados
}

export function useSetupCompletion(): SetupCompletion {
    const { tap, tarefas, eapCount, isCpmReady, orcamentoBase } = useProject()

    return useMemo(() => {
        // ── Passo 1: Projeto criado ──
        const temNome = !!(tap?.nome_projeto && tap.nome_projeto.length >= 3 &&
            tap.nome_projeto !== 'Novo Projeto (Rascunho)' &&
            tap.nome_projeto !== 'Sem Nome')

        // ── Passo 2: Tarefas definidas ──
        const temTarefas = tarefas.length > 0
        const tarefasComDuracao = tarefas.filter(t => (t.duracao_estimada ?? 0) > 0).length

        // ── Passo 3: EAP estruturada ──
        const temEap = eapCount > 0

        // ── Passo 4: Predecessoras ──
        const tarefasComPredecessoras = tarefas.filter(t => t.dependencias && t.dependencias.length > 0).length

        // ── Passo 5: Valores CDT (orcamento = O, prazo = P, e escopo = E via tarefas) ──
        // Escopo: tem tarefas; Prazo: tap.prazo_total > 0; Orçamento: orcamentoBase > 0
        const temEscopo = temTarefas
        const temPrazo = !!(tap?.prazo_total && tap.prazo_total > 0)
        const temOrcamento = !!(orcamentoBase && orcamentoBase > 0)
        const cdtDimensoesPreenchidas = [temEscopo, temPrazo, temOrcamento].filter(Boolean).length

        // ── Passo 5 status ──
        const temDatas = isCpmReady

        // ── Progresso geral (4 critérios históricos, compat com DS-5) ──
        const concluidos = [temNome, temTarefas, temEap, temDatas].filter(Boolean).length
        const percentual = Math.round((concluidos / 4) * 100)

        // ── projetoId para CTAs ──
        const pid = tap?.projeto_id ?? ''
        const ctaBase = pid ? `/${pid}` : ''

        // ── Passo 1: Projeto criado ──
        const step1: SetupStep = {
            id: 'projeto',
            label: 'Projeto criado',
            status: temNome ? 'complete' : 'pending',
            detalhe: temNome
                ? `Nome: ${tap!.nome_projeto}`
                : 'Nome não definido',
            ...(!temNome && ctaBase ? { ctaLabel: 'Definir agora →', ctaHref: `${ctaBase}/setup/tap` } : {}),
        }

        // ── Passo 2: Tarefas definidas ──
        const step2Status: StepStatus = !temTarefas
            ? 'pending'
            : tarefasComDuracao < tarefas.length
                ? 'in-progress'
                : 'complete'

        const step2: SetupStep = {
            id: 'tarefas',
            label: 'Tarefas definidas',
            status: step2Status,
            detalhe: temTarefas
                ? `${tarefas.length} tarefa${tarefas.length !== 1 ? 's' : ''} criada${tarefas.length !== 1 ? 's' : ''}, ${tarefasComDuracao} com duração`
                : 'Nenhuma tarefa criada',
            ...(step2Status !== 'complete' && ctaBase ? { ctaLabel: 'Definir agora →', ctaHref: `${ctaBase}/setup/tap` } : {}),
        }

        // ── Passo 3: EAP estruturada ──
        const step3: SetupStep = {
            id: 'eap',
            label: 'EAP estruturada',
            status: temEap ? 'complete' : 'pending',
            detalhe: temEap
                ? `${eapCount} nó${eapCount !== 1 ? 's' : ''} EAP estruturado${eapCount !== 1 ? 's' : ''}`
                : 'Nenhum nó EAP criado',
            ...(!temEap && ctaBase ? { ctaLabel: 'Definir agora →', ctaHref: `${ctaBase}/setup/wbs` } : {}),
        }

        // ── Passo 4: Predecessoras ──
        const step4Status: StepStatus = !temTarefas
            ? 'blocked'
            : tarefasComPredecessoras === 0
                ? 'pending'
                : 'complete'

        const step4: SetupStep = {
            id: 'predecessoras',
            label: 'Predecessoras definidas',
            status: step4Status,
            detalhe: !temTarefas
                ? 'Aguarda tarefas serem criadas'
                : tarefasComPredecessoras === 0
                    ? 'Nenhuma relação definida (CPM requer ≥1)'
                    : `${tarefasComPredecessoras} tarefa${tarefasComPredecessoras !== 1 ? 's' : ''} com predecessoras`,
            ...(step4Status !== 'complete' && step4Status !== 'blocked' && ctaBase
                ? { ctaLabel: 'Definir agora →', ctaHref: `${ctaBase}/setup/tarefas-diagramas` }
                : {}),
        }

        // ── Passo 5: Valores CDT ──
        const step5Status: StepStatus = cdtDimensoesPreenchidas === 3
            ? 'complete'
            : cdtDimensoesPreenchidas > 0
                ? 'in-progress'
                : 'pending'

        const dimensoesLabels: string[] = []
        if (temEscopo) dimensoesLabels.push('E')
        if (temPrazo) dimensoesLabels.push('P')
        if (temOrcamento) dimensoesLabels.push('O')

        const step5: SetupStep = {
            id: 'cdt',
            label: 'Valores CDT',
            status: step5Status,
            detalhe: cdtDimensoesPreenchidas === 3
                ? 'E, P e O definidos — triângulo completo'
                : cdtDimensoesPreenchidas === 0
                    ? 'E, P e O não definidos'
                    : `Definidos: ${dimensoesLabels.join(', ')} — faltam ${3 - cdtDimensoesPreenchidas}`,
            ...(step5Status !== 'complete' && ctaBase ? { ctaLabel: 'Definir agora →', ctaHref: `${ctaBase}/setup/tap` } : {}),
        }

        return {
            temNome,
            temTarefas,
            temEap,
            temDatas,
            percentual,
            steps: [step1, step2, step3, step4, step5],
        }
    }, [tap, tarefas, eapCount, isCpmReady, orcamentoBase])
}
