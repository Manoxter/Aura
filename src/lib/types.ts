export type PlanTier = 'START' | 'PRO' | 'ELITE'
export type ProjectStatus = 'planejamento' | 'execucao' | 'concluido' | 'arquivado'

// ─── SaaS Camaleão: Tipos de Perfil por Setor ─────────────────────────────
export type ProfileType = 'TECH' | 'CONSTRUCAO' | 'DEFAULT'

// ─── Relatório de Crise Geométrica (usado por crisis.ts) ──────────────────
export interface RotaEscape {
    id: string
    titulo: string
    descricao: string
    impacto_mated: number
}

export interface CrisisReport {
    timestamp: string
    status: 'ESTÁVEL' | 'CRISE_GEOMÉTRICA'
    causa_raiz: string[]
    metricas_atuais: { escopo: number; orcamento: number; prazo: number }
    violacao_regra: string
    rotas_de_escape: RotaEscape[]
}

/**
 * Resultado tipado da Condição de Existência do Triângulo (CEt) dupla.
 * Verificada em dois momentos: pré-normalização (valores brutos) e pós-normalização (adimensionais).
 */
export type CETDuplaResult =
    | { valid: true }
    | { valid: false; violatedSide: 'E' | 'P' | 'O'; stage: 'pre' | 'post' }

export interface Tenant {
    id: string
    owner_id: string
    plan_tier: PlanTier
    plan: PlanTier                    // alias usado na assinatura/page.tsx
    profile_type: ProfileType         // SaaS Camaleão — setor do gestor
    projeto_count: number
    stripe_customer_id: string | null
    stripe_sub_id: string | null
    criado_em: string
}

export interface Projeto {
    id: string
    tenant_id: string
    gestor_id: string | null
    nome: string
    descricao: string | null
    sponsor: string | null
    data_inicio: string
    data_fim: string
    status: ProjectStatus
    tap_pdf_url: string | null
    tap_extraida: boolean
    prazo_reta: { a: number; b: number; metodo: string } | null
    prazo_metodo: string | null
    atualizado_em: string
    criado_em: string
}

export interface Tarefa {
    id: string
    projeto_id: string
    tenant_id: string
    nome: string
    ordem: number | null
    duracao_estimada: number
    duracao_realizada: number | null
    es: number | null
    ef: number | null
    ls: number | null
    lf: number | null
    folga_total: number | null
    folga_livre: number | null
    no_caminho_critico: boolean
    status: string
    data_inicio_real: string | null
    data_fim_real: string | null
    predecessoras: string[] | null
    concluida: boolean
}

export interface Orcamento {
    id: string
    projeto_id: string
    tenant_id: string
    custo_minimo: number
    orcamento_base: number
    contingencia_pct: number
    teto_tap: number
    custo_atual: number
    caixa_atual: number
    aportes: Array<{ valor: number; origem: string; motivacao: string; data: string }>
    custos_tarefas: Record<string, number>
    reta_tangente: { x1: number; y1: number; x2: number; y2: number; a: number; b: number; metodo: string } | null
    metodo_reta: string | null
    cdt_triangulo: { A: [number, number]; B: [number, number]; C: [number, number] } | null
    cdt_area: number | null
    cdt_area_ortico: number | null
    cdt_baricentro: { x: number; y: number } | null
    cdt_lados: { escopo: number; orcamento: number; prazo: number } | null
    mated_threshold: number
}

export interface HistoricoProjeto {
    id: string
    projeto_id: string
    tenant_id: string
    created_at: string
    usuario: string | null
    tipo: string // 'edicao_gerenciamento' | 'decisao_ia' | 'alerta_mated'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    alteracoes: Record<string, { antes: any; depois: any }> | null
    nota: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    snapshot: any | null
}
