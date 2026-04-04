import { z } from 'zod';

export const ExtractSchema = z.object({
  nomeProj: z.string().min(1).describe("Nome principal do projeto inferido ou explícito"),
  sponsor: z.string().describe("Nome ou cargo do patrocinador responsavel"),
  bac: z.number().nonnegative().describe("Custo base em numero float"),
  prazoDias: z.number().int().positive().describe("Duração total em dias"),
  tarefasIdentificadas: z.number().int().nonnegative().describe("Numero estimado de macro tarefas")
});

export type ExtractData = z.infer<typeof ExtractSchema>;

export const TAPSchema = z.object({
  nome_projeto: z.string().min(1).describe("Nome curto ou inferido"),
  justificativa: z.string().default('').describe("Qual o motivo da existência ou problema a ser resolvido"),
  objetivo_smart: z.string().default('').describe("O que deve ser entregue concretamente (escopo prático)"),
  escopo_sintetizado: z.string().default('').describe("Resumo super curto (1 frase) do que é o projeto"),
  // coerce: aceita string "2800000000" → number (Groq às vezes retorna números como string)
  orcamento_total: z.coerce.number().nonnegative().default(0).describe("Valor total estimado do projeto"),
  prazo_total: z.coerce.number().int().min(0).default(0).describe("Duração total em dias"),
  restricoes: z.string().default('').describe("Quais limites impostos"),
  // preprocess: normaliza qualquer formato que o LLM retorne (string[], object[], ausente)
  tarefas: z.preprocess((raw) => {
    if (!Array.isArray(raw)) return []
    return raw.map((item, i) => {
      if (typeof item === 'string') {
        return { id: `T${String(i + 1).padStart(2, '0')}`, nome: item, duracao: 1 }
      }
      if (typeof item === 'object' && item !== null) {
        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          id: String((item as any).id ?? `T${String(i + 1).padStart(2, '0')}`),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nome: String((item as any).nome ?? (item as any).name ?? (item as any).tarefa ?? ''),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          duracao: Number((item as any).duracao ?? (item as any).duration ?? 1) || 1,
        }
      }
      return null
    }).filter(Boolean)
  }, z.array(z.object({
    id: z.string(),
    nome: z.string(),
    duracao: z.coerce.number().int().min(1).default(1)
  }))).default([]).describe("Array de macro-etapas lógicas ou tarefas lidas do texto")
});

export type TAPData = z.infer<typeof TAPSchema>;
