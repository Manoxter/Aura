/**
 * Sessão 29 — Tipos e interfaces para Âncora Semântica, Pipeline Dual TM/TA,
 * Overlay, Heatmap e Filtros de camadas.
 *
 * Decisões canônicas: D-S29-01 a D-S29-07
 * Todas as interfaces são aditivas — nenhuma alteração breaking.
 */

import type { TipoProtocolo } from './clairaut'

// ─── Pipeline Dual TM/TA ─────────────────────────────────────────────────────

/** Origem do pipeline que gerou o CDTResult */
export type PipelineSource = 'tm' | 'ta'

/** Input estendido para o pipeline TA (Triângulo Atual com curvas reais) */
export interface TAInput {
    /** Curva S de custo REAL (execução) — se ausente, usa curva planejada */
    curvaCustoReal?: { x: number; y: number }[]
    /** Burndown de prazo REAL (execução) — se ausente, usa curva planejada */
    curvaPrazoReal?: { x: number; y: number }[]
}

/** Resultado estendido do pipeline TA */
export interface TAResultExtension {
    /** Origem do pipeline: 'tm' (baseline) ou 'ta' (real) */
    pipeline_source?: PipelineSource
}

// ─── Âncora Semântica (D-S29-01) ──────────────────────────────────────────────

/** Configuração da âncora semântica aplicada na construção do triângulo */
export interface AncoraSemantica {
    /** Vértice usado como âncora: 'epsilon' (agudo/singular), 'omega' (beta), 'alpha' (gamma) */
    vertice: 'epsilon' | 'omega' | 'alpha'
    /** Lados selecionados: a (base), b (lado angular), c (lado oposto) */
    lados: { a: number; b: number; c: number }
    /** Se Y é invertido (flipY) para distinguir beta de gamma */
    flipY: boolean
    /** Protocolo que gerou esta configuração */
    protocolo: TipoProtocolo
}

// ─── Pré-classificação via Slopes (D-S29-03) ──────────────────────────────────

/** Resultado da pré-classificação antes de construir o triângulo */
export interface PreClassificacao {
    /** Protocolo provável baseado em mc²-mp² vs threshold 1.0 */
    protocolo_provavel: 'provavel_beta' | 'provavel_gamma' | 'neutro'
    /** Discriminante: mc²-mp² (positivo = custo domina, negativo = prazo domina) */
    discriminante: number
    /** Se está na dead zone (|discriminante| < threshold) */
    dead_zone: boolean
}

// ─── Transição de Protocolo (Etapa 4) ─────────────────────────────────────────

/** Evento de transição entre protocolos (datável, persistível) */
export interface TransicaoEvento {
    /** Protocolo anterior */
    de: TipoProtocolo
    /** Protocolo novo */
    para: TipoProtocolo
    /** Timestamp da detecção */
    timestamp: number
    /** O que disparou a transição (ex: 'omega > 90°', 'mc²-mp² > 1') */
    trigger: string
    /** Ângulo crítico no momento da transição */
    angulo_critico?: number
}

// ─── Compensação Bidirecional TM↔TA (Etapa 5) ────────────────────────────────

/** Resultado da compensação entre TM e TA */
export interface CompensacaoBidirecionalResult {
    /** Delta por lado: TA - TM */
    delta_E: number
    delta_C: number
    delta_P: number
    /** Deltas normalizados pelo baseline */
    delta_E_norm: number
    delta_C_norm: number
    delta_P_norm: number
    /** Qual lado deve ser compensado prioritariamente (maior delta normalizado) */
    lado_prioritario: 'E' | 'C' | 'P'
    /** Direção da pressão: acima ou abaixo do baseline */
    direcao: 'acima' | 'abaixo' | 'neutro'
    /** Se há divergência de protocolo entre TM e TA */
    divergencia_protocolo: boolean
}

// ─── Overlay Visual TM+TA (D-S29-05) ─────────────────────────────────────────

/** Configuração do overlay TM + TA no TrianglePlotter */
export interface OverlayConfig {
    /** Mostrar TM (baseline tracejado) */
    showTM: boolean
    /** Mostrar TA (atual sólido) */
    showTA: boolean
    /** Estilo do TM: opacidade, dash array */
    tmStyle: {
        opacity: number
        strokeDasharray: string
        strokeColor: string
    }
    /** Estilo do TA: segue zona operacional */
    taStyle: {
        opacity: number
    }
    /** De qual pipeline vêm as sombras: sempre 'ta' (dados reais) */
    shadowSource: 'ta'
}

/** Configuração default do overlay */
export const OVERLAY_CONFIG_DEFAULT: OverlayConfig = {
    showTM: true,
    showTA: true,
    tmStyle: {
        opacity: 0.25,
        strokeDasharray: '6 4',
        strokeColor: '#94a3b8',
    },
    taStyle: {
        opacity: 1.0,
    },
    shadowSource: 'ta',
}

// ─── Heatmap (Feature Futura) ─────────────────────────────────────────────────

/** Configuração do mapa de calor de zonas de decisão */
export interface HeatmapConfig {
    /** Habilitar renderização do heatmap */
    enabled: boolean
    /** Resolução da grade (pixels entre amostras) */
    resolution: number
    /** Escala de cor: do centro (NVO, verde) para fora (vermelho) */
    colorScale: 'green-red' | 'blue-red' | 'viridis'
    /** Opacidade máxima do gradiente */
    maxOpacity: number
}

/** Configuração default do heatmap */
export const HEATMAP_CONFIG_DEFAULT: HeatmapConfig = {
    enabled: false,
    resolution: 20,
    colorScale: 'green-red',
    maxOpacity: 0.25,
}

// ─── Filtro de Camadas (Consolidação) ─────────────────────────────────────────

/** Configuração unificada de camadas visíveis no TrianglePlotter */
export interface LayerFilterConfig {
    /** Camadas do triângulo */
    triangulo: boolean
    zre: boolean
    nvo: boolean
    baseline: boolean
    altitudes: boolean
    /** Camadas de sombra */
    mancha: boolean
    rebarba: boolean
    /** Camadas de referência */
    bandas: boolean
    eixos: boolean
    angulos: boolean
    /** Camadas de interação */
    heatmap: boolean
    decisaoSimulada: boolean
}

/** Todas as camadas visíveis por default */
export const LAYER_FILTER_DEFAULT: LayerFilterConfig = {
    triangulo: true,
    zre: true,
    nvo: true,
    baseline: true,
    altitudes: true,
    mancha: true,
    rebarba: true,
    bandas: true,
    eixos: true,
    angulos: true,
    heatmap: false,
    decisaoSimulada: true,
}

// ─── NVO Simplificado (D-S29-07) ──────────────────────────────────────────────

/** NVO simplificado: 2 níveis em vez de 3 (elimina incentro) */
export type NVONivel = 1 | 2
export type NVOTipo = 'ortico' | 'centroide_tm'

/** Tipo expandido de protocolo com sub-tipos de singular */
export type TipoProtocoloExpandido =
    | 'agudo'
    | 'obtuso_beta'
    | 'obtuso_gamma'
    | 'singular_custo'
    | 'singular_prazo'
    | 'singular_escopo'

// ─── Feature Flags ────────────────────────────────────────────────────────────

/** Flags de controle para ativação gradual de features */
export interface FeatureFlags {
    ENABLE_TA_PIPELINE: boolean
    ENABLE_OVERLAY: boolean
    ENABLE_HEATMAP: boolean
    ENABLE_ANCORA_SEMANTICA: boolean
    ENABLE_PRE_CLASSIFICACAO: boolean
    ENABLE_TRANSICAO_EVENTO: boolean
}

/** Sessão 29: ENABLE_ANCORA_SEMANTICA ativado após validação SSS (15 testes, 0 regressão) */
export const FEATURE_FLAGS_DEFAULT: FeatureFlags = {
    ENABLE_TA_PIPELINE: false,
    ENABLE_OVERLAY: false,
    ENABLE_HEATMAP: false,
    ENABLE_ANCORA_SEMANTICA: false,  // REVERTIDO — renderização quebrou em produção (β sem triângulo, γ na posição de β, α degradado)
    ENABLE_PRE_CLASSIFICACAO: false,
    ENABLE_TRANSICAO_EVENTO: false,
}
