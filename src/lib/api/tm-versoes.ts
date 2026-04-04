import { supabase } from '@/lib/supabase'
import { areaTri } from '@/lib/engine/math'

// ═══════════════════════════════════════════════════════════════════════════
// TM Versoes — Histórico de Pecados (Story 5.4) + Remissões (Story 2.8)
// Gerencia versões versionadas do Triângulo Meta com motivo obrigatório.
// Usa tabela `triangulo_matriz_versoes` criada em Story 8.1.
// ═══════════════════════════════════════════════════════════════════════════

export interface LadosTM {
    E_antes: number
    P_antes: number
    O_antes: number
    E_depois: number
    P_depois: number
    O_depois: number
}

export interface VersaoTM {
    id: string
    projeto_id: string
    tenant_id: string
    versao: number
    area_baseline: number
    lados: LadosTM
    motivo: string
    zona_mated: string
    criado_em: string
    /** Story 2.10: área do TA no momento do regime obtuso (só em registros de Remissão) */
    area_regime_obtuso?: number | null
}

/**
 * Calcula a área de um triângulo pelos comprimentos dos seus 3 lados
 * usando a fórmula de Heron: s = (a+b+c)/2, área = sqrt(s*(s-a)*(s-b)*(s-c))
 */
function calcularAreaHeron(a: number, b: number, c: number): number {
    return areaTri(a, b, c)
}

/**
 * Retorna o próximo número de versão para o projeto.
 * MAX(versao) + 1 ou 1 se nenhuma versão existir ainda.
 */
async function getProximaVersao(projetoId: string): Promise<number> {
    const { data, error } = await supabase
        .from('triangulo_matriz_versoes')
        .select('versao')
        .eq('projeto_id', projetoId)
        .order('versao', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) {
        throw new Error(`Falha ao buscar versão atual: ${error.message}`)
    }

    return data ? data.versao + 1 : 1
}

/**
 * Verifica se a versão inicial (v1) existe para o projeto.
 */
async function v1Existe(projetoId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('triangulo_matriz_versoes')
        .select('id')
        .eq('projeto_id', projetoId)
        .eq('versao', 1)
        .maybeSingle()

    if (error) {
        throw new Error(`Falha ao verificar v1: ${error.message}`)
    }

    return data !== null
}

/**
 * Cria uma nova versão do TM registrando os lados anteriores e novos,
 * motivo obrigatório (mínimo 20 caracteres) e a área calculada via Heron.
 *
 * Fallback automático: se v1 não existir ao criar v2+, cria v1 com os
 * lados "antes" como referência inicial antes de criar a nova versão.
 */
export async function criarVersaoTM(
    projetoId: string,
    lados: LadosTM,
    motivo: string,
    zonaMated: string
): Promise<void> {
    if (motivo.trim().length < 20) {
        throw new Error('Motivo obrigatório deve ter no mínimo 20 caracteres.')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error('Usuário não autenticado. Faça login para registrar aditivo.')
    }

    // Fallback: garantir que v1 existe antes de criar versão 2+
    let proximaVersao = await getProximaVersao(projetoId)
    if (proximaVersao > 1 && !(await v1Existe(projetoId))) {
        await criarVersaoInicial(projetoId, lados.E_antes, lados.P_antes, lados.O_antes)
        // Após criar v1, recalcula a próxima versão
        proximaVersao = await getProximaVersao(projetoId)
    }

    // area_baseline = área do TM antes do aditivo (lados "antes")
    const areaBaseline = calcularAreaHeron(lados.E_antes, lados.P_antes, lados.O_antes)

    const { error } = await supabase
        .from('triangulo_matriz_versoes')
        .insert({
            projeto_id: projetoId,
            tenant_id: user.id,
            versao: proximaVersao,
            area_baseline: areaBaseline,
            lados: lados,
            motivo: motivo.trim(),
            zona_mated: zonaMated,
        })

    if (error) {
        throw new Error(`Falha ao criar versão TM: ${error.message}`)
    }
}

/**
 * Retorna o histórico completo de versões do TM para um projeto,
 * ordenado da mais recente para a mais antiga.
 */
export async function getHistoricoTM(projetoId: string): Promise<VersaoTM[]> {
    const { data, error } = await supabase
        .from('triangulo_matriz_versoes')
        .select('id, projeto_id, tenant_id, versao, area_baseline, lados, motivo, zona_mated, criado_em')
        .eq('projeto_id', projetoId)
        .order('versao', { ascending: false })

    if (error) {
        throw new Error(`Falha ao buscar histórico TM: ${error.message}`)
    }

    return (data ?? []) as VersaoTM[]
}

// ─── Story 2.8 — Remissão ─────────────────────────────────────────────────

/** Prefixo que identifica registros de Remissão no campo motivo */
export const REMISSAO_PREFIX = '🔄 Remissão'

/**
 * Detecta se um motivo pertence ao Histórico de Remissões.
 * Pure function — testável sem Supabase.
 */
export function isRegistroRemissao(motivo: string): boolean {
    return motivo.startsWith(REMISSAO_PREFIX)
}

/**
 * Constrói o motivo canônico de remissão a partir do tipo anterior.
 * Garante ≥ 20 caracteres conforme regra de `criarVersaoTM`.
 * Pure function — testável sem Supabase.
 */
export function buildMotivoRemissao(tipoAnterior: 'beta' | 'gamma'): string {
    const regime = tipoAnterior === 'beta' ? 'β (custo)' : 'γ (prazo)'
    return `${REMISSAO_PREFIX} — Regime ${regime} recuperado. Triângulo retornou ao regime agudo.`
}

/**
 * Registra um snapshot do TM no momento da Remissão.
 * Antes = depois = lados atuais (não há alteração no TM, só registro do evento).
 *
 * @param areaRegimeObtuso - Story 2.10: área do TA no pico do regime obtuso (dado longitudinal)
 */
export async function registrarRemissaoTM(
    projetoId: string,
    ladoE: number,
    ladoP: number,
    ladoO: number,
    tipoAnterior: 'beta' | 'gamma',
    zonaMated: string,
    areaRegimeObtuso?: number
): Promise<void> {
    const lados: LadosTM = {
        E_antes: ladoE,
        P_antes: ladoP,
        O_antes: ladoO,
        E_depois: ladoE,
        P_depois: ladoP,
        O_depois: ladoO,
    }
    const motivo = buildMotivoRemissao(tipoAnterior)

    // Obtém próxima versão e cria o registro com area_regime_obtuso
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado.')

    let proximaVersao = await getProximaVersao(projetoId)
    if (proximaVersao > 1 && !(await v1Existe(projetoId))) {
        await criarVersaoInicial(projetoId, ladoE, ladoP, ladoO)
        proximaVersao = await getProximaVersao(projetoId)
    }

    const areaBaseline = calcularAreaHeron(ladoE, ladoP, ladoO)

    const { error } = await supabase
        .from('triangulo_matriz_versoes')
        .insert({
            projeto_id: projetoId,
            tenant_id: user.id,
            versao: proximaVersao,
            area_baseline: areaBaseline,
            lados,
            motivo,
            zona_mated: zonaMated,
            ...(areaRegimeObtuso != null ? { area_regime_obtuso: areaRegimeObtuso } : {}),
        })

    if (error) throw new Error(`Falha ao registrar remissão TM: ${error.message}`)
}

/**
 * Retorna apenas os registros de Remissão do projeto,
 * ordenados do mais recente para o mais antigo.
 */
export async function getHistoricoRemissoes(projetoId: string): Promise<VersaoTM[]> {
    const { data, error } = await supabase
        .from('triangulo_matriz_versoes')
        .select('id, projeto_id, tenant_id, versao, area_baseline, lados, motivo, zona_mated, criado_em')
        .eq('projeto_id', projetoId)
        .ilike('motivo', `${REMISSAO_PREFIX}%`)
        .order('versao', { ascending: false })

    if (error) {
        throw new Error(`Falha ao buscar histórico de remissões: ${error.message}`)
    }

    return (data ?? []) as VersaoTM[]
}

// ─── Setup ────────────────────────────────────────────────────────────────

/**
 * Cria a versão inicial (v1) do TM — chamada automaticamente ao finalizar
 * o setup do projeto. Os lados "antes" e "depois" são iguais na v1 (baseline).
 */
export async function criarVersaoInicial(
    projetoId: string,
    ladoE: number,
    ladoP: number,
    ladoO: number
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error('Usuário não autenticado. Faça login para registrar versão inicial.')
    }

    // Verificar se v1 já existe para evitar duplicata
    if (await v1Existe(projetoId)) {
        return
    }

    const areaBaseline = calcularAreaHeron(ladoE, ladoP, ladoO)

    const ladosIniciais: LadosTM = {
        E_antes: ladoE,
        P_antes: ladoP,
        O_antes: ladoO,
        E_depois: ladoE,
        P_depois: ladoP,
        O_depois: ladoO,
    }

    const { error } = await supabase
        .from('triangulo_matriz_versoes')
        .insert({
            projeto_id: projetoId,
            tenant_id: user.id,
            versao: 1,
            area_baseline: areaBaseline,
            lados: ladosIniciais,
            motivo: 'Versão inicial — baseline do projeto definido no setup.',
            zona_mated: 'OTIMO',
        })

    if (error) {
        throw new Error(`Falha ao criar versão inicial TM: ${error.message}`)
    }
}
