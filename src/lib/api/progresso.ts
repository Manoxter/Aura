import { supabase } from '@/lib/supabase'
import { recalcularTA } from '@/lib/engine/execution'
import type { TrianguloAtual } from '@/lib/engine/execution'

/**
 * Callback opcional chamado após o recálculo assíncrono do TA.
 * Permite que componentes React (ex: ProjectContext) recebam o novo TA
 * sem bloquear o fluxo de save.
 */
export type OnTARecalculado = (ta: TrianguloAtual) => void

/**
 * Salva o percentual de avanço de uma tarefa em `progresso_tarefas`.
 * Colunas: tarefa_id, percentual_avanco, registrado_por (auth.uid()), registrado_em (now())
 *
 * Após o INSERT bem-sucedido, dispara `recalcularTA()` de forma assíncrona
 * (fire-and-forget) para manter o TA atualizado sem bloquear a resposta ao usuário.
 *
 * @param tarefaId    UUID da tarefa
 * @param percentual  Percentual de avanço (0–100)
 * @param projetoId   UUID do projeto (necessário para o recálculo do TA)
 * @param onRecalculo Callback opcional chamado com o novo TA após recálculo
 * @param taAtual     TA atual para rollback caso o novo TA seja inválido
 */
export async function saveProgresso(
    tarefaId: string,
    percentual: number,
    projetoId?: string,
    onRecalculo?: OnTARecalculado,
    taAtual?: TrianguloAtual
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Usuário não autenticado. Faça login para registrar progresso.')
    }

    const { error } = await supabase
        .from('progresso_tarefas')
        .insert({
            tarefa_id: tarefaId,
            percentual_avanco: percentual,
            registrado_por: user.id,
            registrado_em: new Date().toISOString(),
        })

    if (error) {
        throw new Error(`Falha ao salvar progresso: ${error.message}`)
    }

    // Fire-and-forget: recalcular TA sem bloquear o retorno ao chamador.
    // Erros aqui são tratados internamente pelo recalcularTA() — nunca propagam.
    if (projetoId) {
        recalcularTA(projetoId, supabase, taAtual)
            .then((novoTA) => {
                if (onRecalculo) {
                    onRecalculo(novoTA)
                }
            })
            .catch((err: unknown) => {
                console.warn('[progresso] Recálculo assíncrono do TA falhou silenciosamente:', err)
            })
    }
}

/**
 * Retorna o último percentual de avanço registrado para a tarefa.
 * Retorna 0 se nenhum registro for encontrado.
 */
export async function getUltimoProgresso(tarefaId: string): Promise<number> {
    const { data, error } = await supabase
        .from('progresso_tarefas')
        .select('percentual_avanco')
        .eq('tarefa_id', tarefaId)
        .order('registrado_em', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) {
        console.error('Erro ao buscar progresso:', error)
        return 0
    }

    return data?.percentual_avanco ?? 0
}
