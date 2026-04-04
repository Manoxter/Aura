/**
 * Zod Schemas — Validação de Request Bodies
 * Story: SaaS-6 — Segurança: Rate Limiting e Zod Validation
 *
 * Zod v4 — usa `error` em vez de `required_error`/`invalid_type_error`
 * Todos os schemas exportados são reutilizáveis para validação client-side e server-side.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Base schema — campos comuns a requisições autenticadas
// ---------------------------------------------------------------------------

export const AiRequestBaseSchema = z.object({
  projeto_id: z.string().uuid('projeto_id deve ser um UUID válido').optional(),
  tenant_id: z.string().min(1, 'tenant_id é obrigatório').optional(),
})

// ---------------------------------------------------------------------------
// /api/ai/cpm — Calcula CPM a partir de lista de tarefas
// ---------------------------------------------------------------------------

// P5: aceita tanto `duracao` (legado) quanto `duracao_estimada` (modelo canônico)
const TarefaCpmSchema = z.object({
  id: z.string().min(1, 'ID da tarefa é obrigatório'),
  nome: z.string().min(1, 'Nome da tarefa é obrigatório'),
  duracao: z.number().int('Duração deve ser um número inteiro').positive('Duração deve ser maior que zero').optional(),
  duracao_estimada: z.number().int('Duração deve ser um número inteiro').positive('Duração deve ser maior que zero').optional(),
  predecessoras: z.array(z.string()).optional().default([]),
}).refine(
  d => (d.duracao ?? d.duracao_estimada) != null,
  { message: 'duracao ou duracao_estimada é obrigatório', path: ['duracao'] }
)

export const AiCpmRequestSchema = z.object({
  tarefas: z.array(TarefaCpmSchema).min(1, 'Ao menos uma tarefa deve ser informada').max(500, 'Máximo de 500 tarefas por requisição'),
})

export type AiCpmRequest = z.infer<typeof AiCpmRequestSchema>

// ---------------------------------------------------------------------------
// /api/ai/extract — Extrai dados de TAP em texto livre
// ---------------------------------------------------------------------------

export const AiExtractRequestSchema = z.object({
  text: z
    .string()
    .min(10, 'Texto muito curto para extração (mínimo 10 caracteres)')
    .max(50000, 'Texto excede o tamanho máximo permitido (50.000 caracteres)'),
})

export type AiExtractRequest = z.infer<typeof AiExtractRequestSchema>

// ---------------------------------------------------------------------------
// /api/ai/insight — Gera insights a partir de contexto de módulo
// ---------------------------------------------------------------------------

const InsightContextSchema = z.object({
  modulo: z.string().min(1, 'contexto.modulo é obrigatório'),
  dados: z.record(z.string(), z.unknown()).optional().default({}),
})

export const AiInsightRequestSchema = z.object({
  contexto: InsightContextSchema,
})

export type AiInsightRequest = z.infer<typeof AiInsightRequestSchema>

// ---------------------------------------------------------------------------
// /api/ai/tap — Gera TAP estruturado a partir de texto livre
// ---------------------------------------------------------------------------

export const AiTapRequestSchema = z.object({
  text: z
    .string()
    .min(10, 'Texto muito curto para gerar TAP (mínimo 10 caracteres)')
    .max(50000, 'Texto excede o tamanho máximo permitido (50.000 caracteres)'),
})

export type AiTapRequest = z.infer<typeof AiTapRequestSchema>

// ---------------------------------------------------------------------------
// /api/ai/predecessors — Infere predecessoras de lista de tarefas
// ---------------------------------------------------------------------------

const TarefaPredecessorSchema = z.object({
  id: z.string().min(1, 'ID da tarefa é obrigatório'),
  nome: z.string().optional(),
  duracao: z.number().positive().optional(),
  duracao_estimada: z.number().positive().optional(),
})

const EapNodeSchema = z.object({
  id: z.string().min(1),
  nome: z.string().optional(),
  pai_id: z.string().nullable().optional(),
})

export const AiPredecessorsRequestSchema = z.object({
  tarefas: z.array(TarefaPredecessorSchema).min(1, 'Ao menos uma tarefa deve ser informada').max(500, 'Máximo de 500 tarefas por requisição'),
  eapNodes: z.array(EapNodeSchema).max(1000).optional(),
})

export type AiPredecessorsRequest = z.infer<typeof AiPredecessorsRequestSchema>

// ---------------------------------------------------------------------------
// /api/ai/proactive-setup — Gera setup proativo a partir da TAP
// ---------------------------------------------------------------------------

const TarefaTapSchema = z.object({
  id: z.string().min(1),
  nome: z.string().min(1),
  duracao: z.number().int().positive(),
})

const TapDataSchema = z.object({
  nome_projeto: z.string().min(1, 'Nome do projeto é obrigatório'),
  justificativa: z.string().optional(),
  objetivo_smart: z.string().optional(),
  escopo_sintetizado: z.string().optional(),
  orcamento_total: z.number().nonnegative().optional(),
  prazo_total: z.number().int().positive().optional(),
  restricoes: z.string().optional(),
  tarefas: z.array(TarefaTapSchema).optional().default([]),
})

export const AiProactiveSetupRequestSchema = z.object({
  tap: TapDataSchema,
})

export type AiProactiveSetupRequest = z.infer<typeof AiProactiveSetupRequestSchema>

// ---------------------------------------------------------------------------
// /api/ai/klauss — Copilot técnico (chat)
// ---------------------------------------------------------------------------

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
})

const ProjectContextSchema = z
  .object({
    totalCost: z.number().optional(),
    totalDuration: z.number().optional(),
    cdtStatus: z.string().optional(),
    globalIQo: z.number().optional(),
    tarefas: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .catchall(z.unknown())

export const AiKlaussRequestSchema = z.object({
  message: z
    .string()
    .min(1, 'Mensagem não pode estar vazia')
    .max(4000, 'Mensagem excede o limite de 4.000 caracteres'),
  projectContext: ProjectContextSchema.optional().default({}),
  history: z.array(ChatMessageSchema).max(50, 'Histórico máximo de 50 mensagens').optional().default([]),
  // Story 7.5 — projetoId para injetar histórico de decisoes_mated entre sessões
  projetoId: z.string().uuid().optional(),
})

export type AiKlaussRequest = z.infer<typeof AiKlaussRequestSchema>

// ---------------------------------------------------------------------------
// /api/ai/dica-metodo-prazo — Consultor de Prazo (chat)
// ---------------------------------------------------------------------------

const ScheduleProjectContextSchema = z
  .object({
    totalDuration: z.number().optional(),
    totalCost: z.number().optional(),
    modeloBurndown: z.string().optional(),
    murphyCount: z.number().optional(),
    olsRate: z.number().optional(),
    tarefas: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .catchall(z.unknown())

export const AiDicaPrazoRequestSchema = z.object({
  message: z
    .string()
    .min(1, 'Mensagem não pode estar vazia')
    .max(4000, 'Mensagem excede o limite de 4.000 caracteres'),
  projectContext: ScheduleProjectContextSchema.optional().default({}),
  history: z.array(ChatMessageSchema).max(50, 'Histórico máximo de 50 mensagens').optional().default([]),
})

export type AiDicaPrazoRequest = z.infer<typeof AiDicaPrazoRequestSchema>

// ---------------------------------------------------------------------------
// /api/report/cdt — Relatório CDT (query params)
// ---------------------------------------------------------------------------

export const ReportCdtRequestSchema = z.object({
  projetoId: z.string().uuid('projetoId deve ser um UUID válido'),
})

export type ReportCdtRequest = z.infer<typeof ReportCdtRequestSchema>

// ---------------------------------------------------------------------------
// /api/ai/klauss-to-mated — Texto livre → Parâmetros Numéricos MATED
// Story 7.1
// ---------------------------------------------------------------------------

const CdtDimensionSchema = z.object({
  E: z.number(),
  P: z.number(),
  O: z.number(),
})

export const KlaussMATEDRequestSchema = z.object({
  descricao: z.string().min(10, 'Descrição deve ter ao menos 10 caracteres').max(5000, 'Descrição excede o limite de 5.000 caracteres'),
  projetoId: z.string().uuid('projetoId deve ser um UUID válido'),
  taAtual: CdtDimensionSchema.optional(),
  tmAtual: CdtDimensionSchema.optional(),
})

export type KlaussMATEDRequest = z.infer<typeof KlaussMATEDRequestSchema>

// ---------------------------------------------------------------------------
// /api/invite — Convite de membro para projeto (Story 8.6)
// ---------------------------------------------------------------------------

export const InvitePostSchema = z.object({
    email: z.string().email('E-mail inválido'),
    role: z.enum(['admin', 'editor', 'viewer'], {
        error: 'Role inválido. Use "admin", "editor" ou "viewer".',
    }),
    projeto_id: z.string().uuid('projeto_id deve ser um UUID válido'),
})

export type InvitePostRequest = z.infer<typeof InvitePostSchema>

// ---------------------------------------------------------------------------
// /api/[projetoId]/riscos — Criação de risco do projeto (Story 8.6 + 13.3)
// ---------------------------------------------------------------------------

export const RiscoPostSchema = z.object({
    titulo: z.string().min(1, 'titulo é obrigatório').max(200, 'Título muito longo (máximo 200 chars)'),
    categoria: z.enum(['escopo', 'prazo', 'custo', 'qualidade', 'externo'], {
        error: 'categoria deve ser: escopo, prazo, custo, qualidade ou externo.',
    }),
    probabilidade: z.number().min(0, 'probabilidade mínima é 0').max(1, 'probabilidade máxima é 1'),
    impacto: z.number().min(0, 'impacto mínimo é 0').max(1, 'impacto máximo é 1'),
    descricao: z.string().max(1000).optional(),
})

export type RiscoPostRequest = z.infer<typeof RiscoPostSchema>

// ---------------------------------------------------------------------------
// DB12 — custos_tarefas JSONB — validação de shape client/server-side
// ---------------------------------------------------------------------------

export const CustosTarefasSchema = z.record(
    z.string().min(1, 'Chave deve ser um ID de tarefa não-vazio'),
    z.number().nonnegative('Custo deve ser ≥ 0')
)

export type CustosTarefas = z.infer<typeof CustosTarefasSchema>

export function parseCustosTarefas(raw: unknown): CustosTarefas {
    const result = CustosTarefasSchema.safeParse(raw)
    if (!result.success) {
        console.warn('[custosTarefas] shape inválido, usando {}', result.error.flatten())
        return {}
    }
    return result.data
}
