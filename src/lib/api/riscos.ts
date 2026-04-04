// ═══════════════════════════════════════════════════════════════════════════
// Story 13.6 — riscos.ts: centraliza cálculo de score_rc + persistência
// Funções client-safe para uso no modal de criação (Story 13.2)
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabase'
import { calcularScoreRC, classificarScoreRC, type ClassificacaoRC } from '@/lib/engine/prometeu-extrinseco'

export type CategoriaRisco = 'escopo' | 'prazo' | 'custo' | 'qualidade' | 'externo'

export interface RiscoProjeto {
    id: string
    projeto_id: string
    tenant_id: string
    titulo: string
    categoria: CategoriaRisco
    probabilidade: number
    impacto: number
    score_rc: number
    zona_cet: string | null
    descricao: string | null
    criado_em: string
    atualizado_em: string
}

export interface CriarRiscoInput {
    projetoId: string
    titulo: string
    categoria: CategoriaRisco
    probabilidade: number
    impacto: number
    descricao?: string
}

/**
 * Cria um novo risco calculando e persistindo score_rc automaticamente.
 * AC-1 Story 13.6: score_rc calculado pela aplicação antes do INSERT.
 */
export async function criarRisco(input: CriarRiscoInput): Promise<RiscoProjeto> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado.')

    // AC-1 Story 13.6: calcular score_rc antes de inserir
    const scoreRc = calcularScoreRC(input.probabilidade, input.impacto)

    const { data, error } = await supabase
        .from('riscos_projeto')
        .insert({
            projeto_id: input.projetoId,
            tenant_id: user.id,
            titulo: input.titulo.trim(),
            categoria: input.categoria,
            probabilidade: input.probabilidade,
            impacto: input.impacto,
            score_rc: scoreRc,
            descricao: input.descricao?.trim() ?? null,
        })
        .select()
        .single()

    if (error) throw new Error(`Falha ao criar risco: ${error.message}`)
    return data as RiscoProjeto
}

/**
 * Busca todos os riscos de um projeto, ordenados por score_rc desc.
 */
export async function getRiscosProjeto(projetoId: string): Promise<RiscoProjeto[]> {
    const { data, error } = await supabase
        .from('riscos_projeto')
        .select('*')
        .eq('projeto_id', projetoId)
        .order('score_rc', { ascending: false })

    if (error) throw new Error(`Falha ao buscar riscos: ${error.message}`)
    return (data ?? []) as RiscoProjeto[]
}

/**
 * Remove um risco pelo id. RLS garante ownership.
 */
export async function deletarRisco(riscoId: string): Promise<void> {
    const { error } = await supabase
        .from('riscos_projeto')
        .delete()
        .eq('id', riscoId)

    if (error) throw new Error(`Falha ao deletar risco: ${error.message}`)
}

/**
 * Cria ou atualiza um risco calculando score_rc automaticamente.
 * AC-3 Story 13.6: centraliza o cálculo e persistência — sem trigger de banco.
 * - Se `id` for informado: atualiza o registro existente.
 * - Se `id` for omitido: insere novo registro (equivalente a criarRisco).
 */
export async function upsertRiscoProjeto(
    input: CriarRiscoInput & { id?: string }
): Promise<RiscoProjeto> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado.')

    // AC-1/AC-4 Story 13.6: score_rc calculado pela aplicação, nunca por trigger
    const scoreRc = calcularScoreRC(input.probabilidade, input.impacto)

    const payload = {
        projeto_id: input.projetoId,
        tenant_id: user.id,
        titulo: input.titulo.trim(),
        categoria: input.categoria,
        probabilidade: input.probabilidade,
        impacto: input.impacto,
        score_rc: scoreRc,
        descricao: input.descricao?.trim() ?? null,
    }

    if (input.id) {
        const { data, error } = await supabase
            .from('riscos_projeto')
            .update(payload)
            .eq('id', input.id)
            .select()
            .single()

        if (error) throw new Error(`Falha ao atualizar risco: ${error.message}`)
        return data as RiscoProjeto
    }

    const { data, error } = await supabase
        .from('riscos_projeto')
        .insert(payload)
        .select()
        .single()

    if (error) throw new Error(`Falha ao criar risco: ${error.message}`)
    return data as RiscoProjeto
}

export { classificarScoreRC, type ClassificacaoRC }
