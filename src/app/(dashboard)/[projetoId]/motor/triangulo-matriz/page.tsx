'use client'
// build-hash: gamma-fix-v2

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Activity, Beaker, CheckCircle2, AlertTriangle, Circle, ChevronDown } from 'lucide-react'
import { EmptyState, DashboardEmptyIllustration } from '@/components/ui/EmptyState'
import { TrianglePlotter } from '@/components/motor/TrianglePlotter'
import { SingularModal, type SingularTipo } from '@/components/motor/SingularModal'
import { Triangle, calculateOrthicTriangle, calculateBarycenter } from '@/lib/engine/triangle-logic'
import { evaluateDecision } from '@/lib/engine/euclidian'
import { DimensionMapper } from '@/lib/engine/mapper'
import { gerarTrianguloCDT, validarProjecaoCEt, CDTResult, buildCurvaCusto, decomporMATED, calcularAMancha } from '@/lib/engine/math'
import { ComposedChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { translateCDT, CDTNarrative, HealthBadge } from '@/components/aura/MetricTranslator'
import { MATEDBadge } from '@/components/ui/MATEDBadge'
import { CalibrationBadge } from '@/components/calibration/CalibrationBadge'
import { getModeInfo, SigmaModeInfo } from '@/lib/calibration/sigma-manager'
import { useProject } from '@/context/ProjectContext'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { ZonaSemaforo } from '@/components/aura/ZonaSemaforo'
import { ZonaTimeline, type HistoricoZonaItem } from '@/components/aura/ZonaTimeline'
import { classificarCandidatoCEt, type ZonaOperacional } from '@/lib/engine/zones'
import { calcularVelocidadeDegradacao, type HistoricoZona, type VelocidadeDegradacao } from '@/lib/engine/execution'
import { getDefaultContingencia } from '@/lib/calibration/setor-config'
import { PlanGate } from '@/components/saas/PlanGate'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useToast } from '@/hooks/useToast'
// Story 2.6 — Modo Invertido
import { useSinteseClairaut } from '@/lib/engine/hooks/useSinteseClairaut'
import { inverterCoordenadas } from '@/lib/engine/modo-invertido'
import { clampCos } from '@/lib/engine/guards'
import { calcularAncoragem, transformarSombras } from '@/lib/engine/ancoragem-guia'
import { detectarTransicao, classificarSeveridade } from '@/lib/engine/transicao-evento'
import { calcularCompensacaoBidirecional, gerarRecomendacao } from '@/lib/engine/compensacao-bidirecional'
import { analisarDivergencia } from '@/lib/engine/pipeline-dual'
import { DisclaimerModoInvertido } from '@/components/aura/DisclaimerModoInvertido'

// Sprint 3 Sessão 27: Canvas maior para melhor nitidez (Req A)
const CANVAS_MAPPINGS = { width: 900, height: 600 }

// ─── CEt-1: Badge CEt Dupla — P7 Sessão 27: só mostra quando VIOLADA (sinal com informação) ──
function CetDuplaBadge({ cetDupla }: {
    cetDupla: { valid: boolean; violatedSide?: string; stage?: string }
}) {
    // P7: CEt válida = estado normal → não exibir (ruído visual)
    // Só exibe quando CEt VIOLADA — sinal com informação real para o PM
    if (cetDupla.valid) return null
    const isPre = cetDupla.stage === 'pre'
    return (
        <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                isPre
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
            title={`Condição de Existência violada na etapa ${isPre ? 'pré' : 'pós'}-normalização — Lado ${cetDupla.violatedSide}`}
        >
            CEt ✗ {isPre ? 'PRÉ' : 'PÓS'} · Lado {cetDupla.violatedSide}
        </span>
    )
}

// ─── CEt-2: Badge Área — P7/P8 Sessão 27: só mostra quando há desvio real ────
function AreaBadge({ desvioQualidade }: { desvioQualidade: number | null }) {
    // P7: sem dados ou 100% = estado normal → não exibir (ruído visual)
    if (desvioQualidade === null || desvioQualidade >= 100) return null
    const colorClass =
        desvioQualidade >= 85 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
        desvioQualidade >= 60 ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
        desvioQualidade >= 35 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                                'bg-red-500/10 text-red-400 border-red-500/30'
    return (
        <span
            className={`text-[10px] ${colorClass} border px-2 py-0.5 rounded-full font-mono font-bold`}
            title={`TA/TM = ${desvioQualidade.toFixed(1)}%. ≥85%=Ótimo, ≥60%=Seguro, ≥35%=Risco, <35%=Crise`}
        >
            Área {desvioQualidade.toFixed(0)}% TM
        </span>
    )
}

function CDTPageContent() {
    const { projetoId } = useParams()
    const { toast } = useToast()
    const { isMotorReady, orcamentoBase, prazoBase, tenantId, tarefas, custosTarefas, marcos, dataInicio, dataInicioReal, nTarefasBaseline, tap, isTapReady, isEapReady, isCpmReady, caminhoCriticoBaseline, cdtAreaBaseline } = useProject()

    const projectDuration = prazoBase || 1
    const projectCost = orcamentoBase || 1

    // Engine Math Variables
    const mapper = useMemo(() => {
        return new DimensionMapper({ totalCost: projectCost, totalDuration: projectDuration }, CANVAS_MAPPINGS)
    }, [projectCost, projectDuration])

    // Decision point sliders (real project metrics: Days, Reais)
    const [decisionDias, setDecisionDias] = useState<number>(Math.floor(projectDuration * 0.5))
    const [decisionCusto, setDecisionCusto] = useState<number>(Math.floor(projectCost * 0.5))
    // Simulador só exibe ponto de decisão quando o usuário moveu algum slider
    const [simuladorAtivo, setSimuladorAtivo] = useState<boolean>(false)

    const [savingSnapshot, setSavingSnapshot] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [history, setHistory] = useState<any[]>([])
    // P5 Sessão 27: areaBaseline vem do DB (snapshot imutável), fallback local
    const [areaBaselineLocal, setAreaBaselineLocal] = useState<number | null>(null)
    const areaBaseline = cdtAreaBaseline ?? areaBaselineLocal
    const [calibInfo, setCalibInfo] = useState<SigmaModeInfo | null>(null)
    // Story 3.0-F: histórico de zonas semanais
    const [historicoZonas, setHistoricoZonas] = useState<HistoricoZonaItem[]>([])
    // Sprint 3 Req A: painéis diagnóstico colapsáveis
    const [diagnosticoExpandido, setDiagnosticoExpandido] = useState(false)

    // Story 3.6: Carregar info de calibração (N projetos do setor)
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const setor = (tap as any)?.setor ?? 'geral'
        getModeInfo(setor, tenantId ?? null, supabase).then(setCalibInfo)
    }, [tenantId, tap])

    // Load History
    useEffect(() => {
        if (projetoId) loadHistory()
    }, [projetoId])

    // Story 3.0-F: carregar histórico de zonas
    useEffect(() => {
        if (!projetoId) return
        supabase
            .from('historico_zonas')
            .select('semana, zona, distancia_nvo')
            .eq('projeto_id', projetoId)
            .order('semana', { ascending: true })
            .limit(20)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then(({ data }: { data: any }) => {
                if (data) setHistoricoZonas(data as HistoricoZonaItem[])
            })
    }, [projetoId])

    async function loadHistory() {
        const { data } = await supabase
            .from('mated_history')
            .select('*')
            .eq('projeto_id', projetoId)
            .order('created_at', { ascending: false })
            .limit(5)
        if (data) setHistory(data)
    }

    // ═══ CDT v2: Construir curvas a partir dos dados reais do projeto ═══
    // FIX-C3: usa buildCurvaCusto() unificado (useSeed=true para TM)
    const curvaCusto = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return buildCurvaCusto(tarefas as any, custosTarefas, marcos, prazoBase || 0, projectCost, true)
    }, [tarefas, custosTarefas, marcos, prazoBase, projectCost])

    const curvaPrazo = useMemo(() => {
        if (!prazoBase || tarefas.length === 0) return []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!tarefas.some((t: any) => t.ef > 0)) return []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const totalWork = tarefas.reduce((s: number, t: any) => s + (t.duracao_estimada || 0), 0)
        if (totalWork === 0) return []
        const pontos: { x: number; y: number }[] = []
        const step = Math.max(1, Math.floor(prazoBase / 50))

        // EP-ESCALENO: usar EF real (ef + atraso) quando há execução.
        // Tarefas com duracao_realizada > duracao_estimada "empurram" o burndown para a direita,
        // criando uma curva de prazo mais lenta que a de custo → P cresce → escaleno natural.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const efReal = (t: any) => {
            const dr = t.duracao_realizada || 0
            const de = t.duracao_estimada || 0
            if (dr > 0 && de > 0) {
                // Atraso proporcional: se levou 50% mais tempo, EF desloca proporcionalmente
                return (t.es || 0) + dr
            }
            return t.ef || 0
        }

        for (let dia = 0; dia <= prazoBase * 1.3; dia += step) {
            const done = tarefas
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((t: any) => efReal(t) > 0 && efReal(t) <= dia)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .reduce((s: number, t: any) => s + (t.duracao_estimada || 0), 0)
            const remaining = Math.max(0, (1 - done / totalWork) * 100)
            pontos.push({ x: dia, y: parseFloat(remaining.toFixed(1)) })
        }
        // Garantir ponto final
        if (pontos.length > 0 && pontos[pontos.length - 1].y > 0) {
            pontos.push({ x: Math.round(prazoBase * 1.3), y: 0 })
        }
        return pontos
    }, [tarefas, prazoBase])

    // CDT v2: Calcular baseline (dia 0)
    const cdtBaseline = useMemo(() => {
        if (curvaCusto.length < 2 || curvaPrazo.length < 2) return null
        // Baseline e TA DEVEM usar a MESMA normalização para que area ratio faça sentido.
        // Ambos usam orcamentoBase/prazoBase (v4.1) — garante espaço geométrico comum.
        const baseline = gerarTrianguloCDT({
            curvaCusto,
            curvaPrazo,
            diaAtual: 0,
            diaBaseline: 0,
            orcamentoBase: orcamentoBase ?? undefined,
            prazoBase: (tap?.prazo_total && tap.prazo_total > 0 ? tap.prazo_total : (caminhoCriticoBaseline ?? prazoBase)) ?? undefined,
        })
        return baseline
    }, [curvaCusto, curvaPrazo, orcamentoBase, caminhoCriticoBaseline, prazoBase, tap?.prazo_total])

    // P5: Registrar area baseline — DB é fonte primária (snapshot imutável)
    // Se DB tem valor → usa. Se não, computa localmente e persiste no DB.
    useEffect(() => {
        if (cdtBaseline && !areaBaseline) {
            setAreaBaselineLocal(cdtBaseline.cdt_area)
            // Persistir no DB para imutabilidade entre sessões
            if (!cdtAreaBaseline && projetoId) {
                supabase.from('orcamentos')
                    .update({ cdt_area_baseline: cdtBaseline.cdt_area })
                    .eq('projeto_id', projetoId)
                    .then(() => { /* fire-and-forget */ })
            }
        }
    }, [cdtBaseline, areaBaseline, cdtAreaBaseline, projetoId])

    // Dia atual do projeto — FIX-A3: nunca retorna 0 | FIX-C2: usa dataInicioReal com precedência
    const diaAtualProjeto = useMemo(() => {
        // FIX-C2: preferir data_inicio_real (D7b Story 3.0), fallback para data_inicio planejada
        const dataParaCalculo = dataInicioReal || dataInicio
        if (!dataParaCalculo) {
            // Projeto não iniciado → mostrar baseline (dia 1), não meio do prazo
            return 1
        }
        const inicio = new Date(dataParaCalculo)
        const hoje = new Date()
        const diffMs = hoje.getTime() - inicio.getTime()
        const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const maxEf = Math.max(...tarefas.map((t: any) => t.ef || 0), 0)
        return Math.max(Math.min(diffDias, maxEf || prazoBase || projectDuration || Infinity), 1)
    }, [dataInicio, dataInicioReal, prazoBase, projectDuration, tarefas])

    // Sem execução REAL: nenhuma tarefa tem progresso físico registrado.
    // ef > 0 é dado CPM de planejamento — não indica execução iniciada.
    // Só considera "em execução" quando duracao_realizada > 0 ou status operacional.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const semExecucaoReal = useMemo(
        () => !tarefas.some((t: any) =>
            (t.duracao_realizada || 0) > 0 ||
            t.status === 'em_andamento' ||
            t.status === 'concluida'
        ),
        [tarefas]
    )

    // CDT v2: Calcular estado atual do projeto
    // P0-2 @fermat: SEMPRE calcular TA real — o motor deve refletir
    // a geometria das curvas planejadas. Sem lock de baseline.
    const cdtAtual = useMemo<CDTResult | null>(() => {
        if (curvaCusto.length < 2 || curvaPrazo.length < 2) return null
        return gerarTrianguloCDT({
            curvaCusto,
            curvaPrazo,
            diaAtual: diaAtualProjeto,
            diaBaseline: 0,
            areaBaseline: areaBaseline ?? undefined,
            // M1 — Lado E Dinâmico: scope creep geométrico
            nTarefasAtual: tarefas.length,
            nTarefasBaseline: nTarefasBaseline ?? undefined,
            // MetodoAura §2.2.3: prazoBase = prazo contratado (TAP) quando disponível
            // Isso garante que buffer de prazo (prazo_total > CP) afete o denominador temporal
            orcamentoBase: orcamentoBase ?? undefined,
            prazoBase: (tap?.prazo_total && tap.prazo_total > 0 ? tap.prazo_total : (caminhoCriticoBaseline ?? prazoBase)) ?? undefined,
        })
    }, [curvaCusto, curvaPrazo, diaAtualProjeto, areaBaseline, semExecucaoReal, cdtBaseline, orcamentoBase, caminhoCriticoBaseline, prazoBase, tarefas.length, nTarefasBaseline, tap?.prazo_total])

    // Dados normalizados para o gráfico A_mancha — f_p (burndown) × f_c (custo)
    const manchaChartData = useMemo(() => {
        if (curvaCusto.length < 2 || curvaPrazo.length < 2) return []
        const maxC = Math.max(...curvaCusto.map(p => p.y), 1e-9)
        const maxP = Math.max(...curvaPrazo.map(p => p.y), 1e-9)
        const xMin = Math.min(curvaCusto[0].x, curvaPrazo[0].x)
        const xMax = Math.max(curvaCusto[curvaCusto.length - 1].x, curvaPrazo[curvaPrazo.length - 1].x)
        if (xMax <= xMin) return []
        const N = 60
        const step = (xMax - xMin) / N
        const interp = (curva: { x: number; y: number }[], x: number, maxVal: number) => {
            if (x <= curva[0].x) return curva[0].y / maxVal
            if (x >= curva[curva.length - 1].x) return curva[curva.length - 1].y / maxVal
            for (let i = 0; i < curva.length - 1; i++) {
                if (curva[i].x <= x && x <= curva[i + 1].x) {
                    const t = (x - curva[i].x) / (curva[i + 1].x - curva[i].x || 1)
                    return (curva[i].y + t * (curva[i + 1].y - curva[i].y)) / maxVal
                }
            }
            return curva[curva.length - 1].y / maxVal
        }
        return Array.from({ length: N + 1 }, (_, i) => {
            const x = xMin + i * step
            const tNorm = parseFloat(((x - xMin) / (xMax - xMin)).toFixed(3))
            const fp = parseFloat(interp(curvaPrazo, x, maxP).toFixed(3))
            const fc = parseFloat(interp(curvaCusto, x, maxC).toFixed(3))
            return { t: tNorm, fp, fc, intersecao: parseFloat(Math.min(fp, fc).toFixed(3)) }
        })
    }, [curvaCusto, curvaPrazo])

    // Sessão 29: Ancoragem GUIA — sombras transformadas conforme protocolo
    // A reta GUIA (que não se move) mantém sombra inalterada.
    // A reta invertida tem sombra rotacionada 180° (reverse dos valores).
    const ancoragem = useMemo(() => {
        return calcularAncoragem(cdtAtual?.protocolo ?? 'agudo')
    }, [cdtAtual?.protocolo])

    const manchaTransformada = useMemo(() => {
        return transformarSombras(manchaChartData, cdtAtual?.protocolo ?? 'agudo')
    }, [manchaChartData, cdtAtual?.protocolo])

    // Traduzir CDT para linguagem PM/PO
    const metrics = useMemo(() => {
        if (!cdtAtual) return null
        return translateCDT(cdtAtual, orcamentoBase ?? undefined, prazoBase ?? undefined)
    }, [cdtAtual, orcamentoBase, prazoBase])

    // Story 2.6 — Síntese de Clairaut para Modo Invertido
    const { resultado: resultadoSC } = useSinteseClairaut(
        cdtAtual?.lados.escopo ?? null,
        cdtAtual?.lados.prazo ?? null,
        cdtAtual?.lados.orcamento ?? null
    )
    const modoInvertidoAtivo = resultadoSC?.tipo === 'obtuso_beta' || resultadoSC?.tipo === 'obtuso_gamma'

    // ═══ Sessão 29: Transição de protocolo como evento + Compensação bidirecional ═══
    const protocoloAnteriorRef = useRef<string | null>(null)
    const protocoloAtual = cdtAtual?.protocolo ?? 'agudo'

    // Detectar transição entre recálculos
    const transicaoEvento = useMemo(() => {
        if (!protocoloAnteriorRef.current) {
            protocoloAnteriorRef.current = protocoloAtual
            return null
        }
        const evento = detectarTransicao(
            protocoloAnteriorRef.current as Parameters<typeof detectarTransicao>[0],
            protocoloAtual as Parameters<typeof detectarTransicao>[1],
            resultadoSC?.omega ?? resultadoSC?.alpha,
        )
        protocoloAnteriorRef.current = protocoloAtual
        return evento
    }, [protocoloAtual, resultadoSC])

    // Compensação bidirecional TM↔TA
    const compensacao = useMemo(() => {
        if (!cdtAtual || !cdtBaseline) return null
        return calcularCompensacaoBidirecional(cdtBaseline, cdtAtual)
    }, [cdtAtual, cdtBaseline])

    const recomendacaoCompensacao = useMemo(() => {
        if (!compensacao) return null
        return gerarRecomendacao(compensacao)
    }, [compensacao])

    // Divergência TM vs TA
    const divergencia = useMemo(() => {
        if (!cdtAtual || !cdtBaseline) return null
        return analisarDivergencia(cdtBaseline, cdtAtual)
    }, [cdtAtual, cdtBaseline])

    // ═══ Sessão 29: Modal Singular (bloqueante) ═══
    const [singularModalOpen, setSingularModalOpen] = useState(false)
    const [singularDismissed, setSingularDismissed] = useState(false)

    // Abrir modal quando protocolo = singular (e não foi dispensado nesta sessão)
    useEffect(() => {
        if (protocoloAtual === 'singular' && !singularDismissed) {
            setSingularModalOpen(true)
        } else {
            setSingularModalOpen(false)
        }
    }, [protocoloAtual, singularDismissed])

    // Determinar sub-tipo: custo (ω≈90) ou prazo (α≈90)
    const singularTipo: SingularTipo = useMemo(() => {
        if (!resultadoSC) return 'custo'
        const diffOmega = Math.abs((resultadoSC.omega ?? 0) - 90)
        const diffAlpha = Math.abs((resultadoSC.alpha ?? 0) - 90)
        return diffOmega < diffAlpha ? 'custo' : 'prazo'
    }, [resultadoSC])

    // ═══ TM-SHADOW: helper para mapear vértices CDT → canvas com escala compartilhada ═══
    const mapCDTToCanvas = useCallback((
        cdt: CDTResult,
        sharedMaxX: number,
        sharedMaxY: number
    ): Triangle => {
        const scaleX = CANVAS_MAPPINGS.width * 0.8
        const scaleY = CANVAS_MAPPINGS.height * 0.8
        const offsetX = CANVAS_MAPPINGS.width * 0.1
        const offsetY = CANVAS_MAPPINGS.height * 0.1
        // NOTA: NÃO inverter Y aqui — TrianglePlotter.transformY() já faz a inversão SVG.
        // Passar coordenadas em "math space" (y > 0 = acima) para que transformY funcione corretamente.
        // Antes havia `offsetY + scaleY - y` que causava double-flip (triângulo de cabeça para baixo).
        return {
            A: { x: offsetX + (cdt.A[0] / sharedMaxX) * scaleX, y: offsetY + (cdt.A[1] / sharedMaxY) * scaleY },
            B: { x: offsetX + (cdt.B[0] / sharedMaxX) * scaleX, y: offsetY + (cdt.B[1] / sharedMaxY) * scaleY },
            C: { x: offsetX + (cdt.C[0] / sharedMaxX) * scaleX, y: offsetY + (cdt.C[1] / sharedMaxY) * scaleY },
        }
    }, [])

    // ═══ Triangulos para o TrianglePlotter (escala compartilhada TM + TA) ═══
    const { currentTriangle, baselineTriangleMapped, nvoCanvasPoint } = useMemo(() => {
        // Fallback: protocolo agudo — AB (Escopo) é a base horizontal, C (Prazo) no topo
        const fallback: Triangle = {
            A: { x: 60, y: 60 },    // Custo — bottom-left (base esquerda)
            B: { x: 540, y: 60 },   // Escopo — bottom-right (base direita)
            C: { x: 300, y: 380 },  // Prazo — top-center (vértice superior)
        }
        // CEt inválida → vértices são [0,0,0] → triângulo degenerado → usar fallback
        if (!cdtAtual || !cdtAtual.cet_dupla.valid) return { currentTriangle: fallback, baselineTriangleMapped: undefined, nvoCanvasPoint: null }

        // Escala compartilhada: max de TA e TM combinados
        const allCdts = cdtBaseline ? [cdtAtual, cdtBaseline] : [cdtAtual]
        const sharedMaxX = Math.max(...allCdts.flatMap(c => [c.A[0], c.B[0], c.C[0]]), 0.001)
        const sharedMaxY = Math.max(...allCdts.flatMap(c => [c.A[1], c.B[1], c.C[1]]), 0.001)
        const scaleX = CANVAS_MAPPINGS.width * 0.8
        const scaleY = CANVAS_MAPPINGS.height * 0.8
        const offsetX = CANVAS_MAPPINGS.width * 0.1
        const offsetY = CANVAS_MAPPINGS.height * 0.1

        // Guard: se o triângulo ainda for degenerado após mapeamento, usar fallback
        const ta_test = mapCDTToCanvas(cdtAtual, sharedMaxX, sharedMaxY)
        const spanX = Math.max(ta_test.A.x, ta_test.B.x, ta_test.C.x) - Math.min(ta_test.A.x, ta_test.B.x, ta_test.C.x)
        const spanY = Math.max(ta_test.A.y, ta_test.B.y, ta_test.C.y) - Math.min(ta_test.A.y, ta_test.B.y, ta_test.C.y)
        if (spanX < 5 && spanY < 5) return { currentTriangle: fallback, baselineTriangleMapped: undefined, nvoCanvasPoint: null }

        const ta = mapCDTToCanvas(cdtAtual, sharedMaxX, sharedMaxY)
        const tm = cdtBaseline ? mapCDTToCanvas(cdtBaseline, sharedMaxX, sharedMaxY) : undefined

        // Story 2.6: em modo invertido, mostrar triângulo invertido como alvo (cinza)
        // A Triangle {A,B,C} mapeia E→A, P→B, O→C no TrianglePlotter
        let baselineForPlotter = tm
        if (modoInvertidoAtivo && resultadoSC) {
            const taForInversion = { E: ta.A, P: ta.B, O: ta.C }
            const inv = inverterCoordenadas(taForInversion, resultadoSC)
            baselineForPlotter = { A: inv.E, B: inv.P, C: inv.O }
        }

        // NVO canvas: mapear cdtAtual.nvo (coord. normalizada) para canvas
        // Protocolo β/γ (obtuso): NVO = baricentro do TM (cdtAtual.nvo nível 2)
        // Protocolo α (agudo): NVO = baricentro do triângulo órtico (orthicBarycenter)
        const nvo_canvas = {
            x: offsetX + (cdtAtual.nvo[0] / sharedMaxX) * scaleX,
            y: offsetY + (cdtAtual.nvo[1] / sharedMaxY) * scaleY,
        }

        return {
            currentTriangle: ta,
            baselineTriangleMapped: baselineForPlotter,
            nvoCanvasPoint: nvo_canvas,
        }
    }, [cdtAtual, cdtBaseline, mapCDTToCanvas, modoInvertidoAtivo, resultadoSC])

    // Engine math for decision simulation (keeps MATED slider functional)
    const mathResults = useMemo(() => {
        const decisionProps = mapper.toCoordinate(decisionDias, decisionCusto)
        const orthic = calculateOrthicTriangle(currentTriangle)
        const orthicBarycenter = calculateBarycenter(orthic)
        const evaluation = evaluateDecision(currentTriangle, decisionProps)
        const barycenterData = mapper.toProjectValues(orthicBarycenter)

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return { orthic, orthicBarycenter, evaluation, decisionProps, barycenterData }
    }, [decisionDias, decisionCusto, mapper, currentTriangle])

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { orthic, orthicBarycenter, evaluation, decisionProps, barycenterData } = mathResults

    // Assertiveness Score (now enhanced with CDT v2 data)
    const maxViewableDistance = Math.sqrt(Math.pow(CANVAS_MAPPINGS.width, 2) + Math.pow(CANVAS_MAPPINGS.height, 2)) / 2
    const assertivenessScore = Math.max(0, 100 - (evaluation.distanceToOrthicBarycenter / maxViewableDistance) * 100)

    // C6 (M4): Alerta MATED Subclinico — distancia proxima ao NVO mas dimensao varia >5% do baseline
    const subclinicalMATED = useMemo(() => {
        if (!cdtAtual) return null
        const EPSILON = 0.05
        const { lados } = cdtAtual
        const escopoDesvio = Math.abs(lados.escopo - 1.0)
        const orcamentoDesvio = Math.abs(lados.orcamento - 1.0)
        const prazoDesvio = Math.abs(lados.prazo - 1.0)
        const anyDimensionVaried = escopoDesvio > EPSILON || orcamentoDesvio > EPSILON || prazoDesvio > EPSILON
        // Subclinico: triangulo parece saudavel (distancia pequena) mas alguma dimensao ja se deformou
        if (cdtAtual.mated_distancia < EPSILON && anyDimensionVaried) {
            return { escopoDesvio, orcamentoDesvio, prazoDesvio }
        }
        return null
    }, [cdtAtual])

    // C8 (P3): Decomposicao causal do vetor MATED — qual dimensao contribui mais ao desvio
    const matefDecomposition = useMemo(() => {
        if (!cdtAtual) return null
        const { lados } = cdtAtual
        const dims = [
            { nome: 'Escopo (E)', valor: lados.escopo, desvio: Math.abs(lados.escopo - 1.0), direcao: lados.escopo < 1.0 ? '↓ abaixo' : '↑ acima', cor: 'blue' as const },
            { nome: 'Orçamento (C)', valor: lados.orcamento, desvio: Math.abs(lados.orcamento - 1.0), direcao: lados.orcamento < 1.0 ? '↓ abaixo' : '↑ acima', cor: 'emerald' as const },
            { nome: 'Prazo (P)', valor: lados.prazo, desvio: Math.abs(lados.prazo - 1.0), direcao: lados.prazo < 1.0 ? '↓ abaixo' : '↑ acima', cor: 'amber' as const },
        ].sort((a, b) => b.desvio - a.desvio)
        const totalDesvio = dims.reduce((s, d) => s + d.desvio, 0) || 0.001
        const dimsComPct = dims.map(d => ({ ...d, pct: totalDesvio > 0 ? Math.round((d.desvio / totalDesvio) * 100) : 0 }))
        // Tarefas mais expostas: criticas com folga zero
        const tarefasExpostas = tarefas.filter(t => t.critica && t.folga === 0).slice(0, 3)
        return { dims: dimsComPct, tarefasExpostas, totalDesvio }
    }, [cdtAtual, tarefas])

    // G10: Decomposição direcional geométrica do MATED (centroide → NVO)
    // Indica qual eixo (custo=Y vs prazo=X) domina o desvio — MetodoAura §3.3
    const matedDirecional = useMemo(() => {
        if (!cdtAtual) return null
        return decomporMATED(
            { x: cdtAtual.centroide[0], y: cdtAtual.centroide[1] },
            cdtAtual.nvo,
            cdtAtual.lados
        )
    }, [cdtAtual])

    // Story 3.0-D: Classificação de zona operacional para ZonaSemaforo + TrianglePlotter
    const zonaOperacional = useMemo<ZonaOperacional | null>(() => {
        if (!cdtAtual || !prazoBase || !orcamentoBase) return null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const setor = (tap as any)?.setor ?? 'geral'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pct: number = (tap as any)?.percentual_contingencia ?? getDefaultContingencia(setor)
        const orcamentoOperacional = orcamentoBase * (1 - pct / 100)
        const result = classificarCandidatoCEt(
            { P: cdtAtual.lados.prazo, O: cdtAtual.lados.orcamento },
            {
                caminho_critico_baseline_dias: prazoBase,
                prazo_total_dias: prazoBase,
                percentual_contingencia: pct,
                orcamento_operacional: orcamentoOperacional,
            }
        )
        return result.zona
    }, [cdtAtual, prazoBase, orcamentoBase, tap])

    // Story 3.0-F: velocidade de degradação para alerta preditivo
    const velocidadeDegradacao = useMemo<VelocidadeDegradacao | null>(() => {
        if (historicoZonas.length < 3) return null
        return calcularVelocidadeDegradacao(historicoZonas as HistoricoZona[])
    }, [historicoZonas])

    // Story 1.7: Projeção CDT (+5 dias) validada pela CEt Dupla
    const projecaoCEt = useMemo(() => {
        if (!cdtAtual) return null
        return validarProjecaoCEt(cdtAtual.lados_brutos, diaAtualProjeto, 5)
    }, [cdtAtual, diaAtualProjeto])

    // Canvas click: converte ponto canvas-space → dias/custo e atualiza sliders
    const handleCanvasClick = useCallback((canvasPoint: { x: number; y: number }) => {
        const { dias, custo } = mapper.toProjectValues(canvasPoint)
        setDecisionDias(Math.max(0, Math.min(projectDuration, dias)))
        setDecisionCusto(Math.max(0, Math.min(projectCost, custo)))
        setSimuladorAtivo(true)
    }, [mapper, projectDuration, projectCost])

    const handleSaveSnapshot = async () => {
        if (savingSnapshot) return
        setSavingSnapshot(true)
        try {
            const { error } = await supabase.from('mated_history').insert({
                projeto_id: projetoId,
                tenant_id: tenantId,
                custo: decisionCusto,
                prazo: decisionDias,
                assertividade: Math.round(assertivenessScore * 10) / 10,
                config_simulada: {
                    inside: evaluation.isInsideOrthicTriangle,
                    zona_mated: cdtAtual?.zona_mated ?? null,
                    desvio_qualidade: cdtAtual?.desvio_qualidade ?? null,
                    mated_distancia: cdtAtual?.mated_distancia ?? null,
                }
            })
            if (error) throw error
            loadHistory()
            toast({ variant: 'success', message: 'Snapshot maturado e registrado no histórico!' })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            toast({ variant: 'error', message: 'Erro ao registrar snapshot: ' + err.message })
        } finally {
            setSavingSnapshot(false)
        }
    }

    // Locked State se o Setup nao terminou
    if (!isMotorReady) {
        const checklistItems = [
            {
                label: 'Projeto com nome e orçamento definidos',
                done: isTapReady && !!tap?.nome_projeto && tap.nome_projeto.length >= 3,
                href: `/${projetoId}/setup/tap`,
            },
            {
                label: 'Tarefas adicionadas ao projeto',
                done: tarefas.length > 0,
                href: `/${projetoId}/setup/tarefas-diagramas`,
            },
            {
                label: 'EAP com ao menos um pacote',
                done: isEapReady,
                href: `/${projetoId}/setup/wbs`,
            },
            {
                label: 'Datas de início e fim definidas',
                done: isCpmReady,
                href: `/${projetoId}/setup/tarefas-diagramas`,
            },
        ]
        return (
            <div className="flex flex-col items-center justify-center p-8 sm:p-20 text-center animate-in fade-in duration-500">
                <div className="max-w-md w-full">
                    <EmptyState
                        icon={<DashboardEmptyIllustration className="h-8 w-8" />}
                        title="Dados insuficientes para calcular o Triângulo Matriz"
                        description="O Motor TM requer que o Setup esteja completo. Verifique os itens abaixo:"
                        zona="risco"
                    >
                        <ul className="text-left space-y-2 mt-2">
                            {checklistItems.map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm">
                                    {item.done ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                    ) : (
                                        <Circle className="h-4 w-4 text-amber-400 shrink-0" />
                                    )}
                                    <span className={item.done ? 'text-slate-400 line-through' : 'text-slate-200'}>
                                        {item.label}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </EmptyState>
                </div>
            </div>
        )
    }

    return (
        <PlanGate minPlan="PRO" featureName="Dashboard CDT">
            <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500">
                <header className="mb-4 sm:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
                    <div>
                        <div className="flex items-center gap-3 text-blue-500 mb-2">
                            <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
                            <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider">Motor TM v3.0</h2>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-50">Dashboard — Triângulo Matriz</h1>
                        <p className="text-slate-400 mt-1 sm:mt-2 text-sm sm:text-base">
                            Triangulo de Qualidade em tempo real — Zona de Resiliencia Executiva (ZRE) baseada nas curvas reais do projeto.
                        </p>
                        {metrics && <div className="mt-3"><HealthBadge metrics={metrics} /></div>}
                        {cdtAtual && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <CetDuplaBadge cetDupla={cdtAtual.cet_dupla} />
                                <AreaBadge desvioQualidade={cdtAtual.desvio_qualidade} />
                                <ZonaSemaforo zona={zonaOperacional} />
                            </div>
                        )}
                        {/* AC-4 Story 3.0-F: alerta preditivo de degradação */}
                        {velocidadeDegradacao?.tendencia === 'piora' && zonaOperacional === 'verde' && (
                            <div className="mt-2 flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 w-fit">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                {velocidadeDegradacao.confianca >= 0.6 && velocidadeDegradacao.dias_ate_zona_amarela !== null
                                    ? `⚠️ Ritmo atual leva à Zona Amarela em ~${velocidadeDegradacao.dias_ate_zona_amarela} dias`
                                    : '⚠️ Projeto em degradação (dados insuficientes para precisão)'}
                            </div>
                        )}
                        {/* P8: ANGLE-ALERT traduz o diagrama corretamente para o PM */}
                        {cdtAtual?.forma_triangulo === 'retangulo' && (() => {
                            // Detectar qual ângulo é 90° para mensagem específica
                            const sE = cdtAtual.lados.escopo, sC = cdtAtual.lados.orcamento, sP = cdtAtual.lados.prazo
                            const cosOmega = (sE*sE + sP*sP - sC*sC) / (2*sE*sP || 1)
                            const cosAlpha = (sE*sE + sC*sC - sP*sP) / (2*sE*sC || 1)
                            const isRetoPrazo = Math.abs(cosAlpha) < 0.035 // α ≈ 90° → prazo sob pressão
                            const isRetoCusto = Math.abs(cosOmega) < 0.035 // ω ≈ 90° → custo sob pressão
                            return (
                                <div className="mt-3 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300">
                                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold">Estado Singular — Ângulo Reto Detectado</p>
                                        <p className="text-[11px] opacity-80 mt-0.5">
                                            {isRetoPrazo
                                                ? 'Ângulo α = 90° — Pressão intensa sobre o PRAZO. O cronograma não tem folga para absorver desvios. Qualquer atraso comprometerá o triângulo.'
                                                : isRetoCusto
                                                    ? 'Ângulo ω = 90° — Pressão intensa sobre o CUSTO. O orçamento está no limite — sem margem para absorver aumentos.'
                                                    : 'Um ângulo atingiu 90° — o projeto está no limiar entre estável e instável.'}
                                        </p>
                                        <p className="text-[11px] mt-2 font-semibold text-amber-400">
                                            Deseja prosseguir com este modelo ou rever a TAP e WBS?
                                        </p>
                                    </div>
                                </div>
                            )
                        })()}
                        {/* P7: CalibrationBadge removido do header — ruído visual para PM */}
                    </div>
                    <button
                        onClick={handleSaveSnapshot}
                        disabled={savingSnapshot}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        {savingSnapshot ? 'Registrando...' : 'Registrar Snapshot'}
                    </button>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">

                    {/* Sprint 3 Req A: Painel diagnóstico colapsável */}
                    <div className="lg:col-span-1 space-y-4 order-2 lg:order-1">
                        <button
                            onClick={() => setDiagnosticoExpandido(v => !v)}
                            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 transition-colors"
                        >
                            <span className="text-sm font-semibold">Painel de Diagnóstico</span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${diagnosticoExpandido ? 'rotate-180' : ''}`} />
                        </button>

                        {diagnosticoExpandido && <>
                        {/* CDT Narrative — Saude do Projeto */}
                        {metrics && <CDTNarrative metrics={metrics} />}

                        {/* MATED Simulator */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[80px] rounded-full" />
                            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2 mb-6 relative z-10">
                                <Beaker className="h-5 w-5 text-emerald-500" />
                                Simulador MATED
                            </h3>

                            <div className="space-y-6 relative z-10">
                                <div>
                                    <label className="flex justify-between text-sm font-medium text-slate-400 mb-2">
                                        <span>Decisao de Prazo</span>
                                        <span className="text-slate-50">{DimensionMapper.formatDias(decisionDias)}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0" max={projectDuration}
                                        step="1"
                                        value={decisionDias}
                                        onChange={(e) => { setDecisionDias(parseInt(e.target.value)); setSimuladorAtivo(true) }}
                                        className="w-full accent-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="flex justify-between text-sm font-medium text-slate-400 mb-2">
                                        <span>Decisao de Custo</span>
                                        <span className="text-slate-50">{DimensionMapper.formatCusto(decisionCusto)}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0" max={projectCost}
                                        step={Math.max(1000, Math.floor(projectCost / 100))}
                                        value={decisionCusto}
                                        onChange={(e) => { setDecisionCusto(parseInt(e.target.value)); setSimuladorAtivo(true) }}
                                        className="w-full accent-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-800 space-y-4 relative z-10">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-sm">Distancia Euclidiana</span>
                                    <span className="text-slate-50 font-mono">{evaluation.distanceToOrthicBarycenter.toFixed(1)} u</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-sm">Assertividade</span>
                                    <span className={`font-bold ${assertivenessScore > 80 ? 'text-emerald-500' : assertivenessScore > 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                                        {assertivenessScore.toFixed(1)}%
                                    </span>
                                </div>

                                {cdtAtual && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 text-sm">Zona TM</span>
                                        <MATEDBadge zona={cdtAtual.zona_mated} size="xs" />
                                    </div>
                                )}

                                {evaluation.isInsideOrthicTriangle ? (
                                    <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm flex items-start gap-2">
                                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                                        <p>Decisao resistente. Dentro da Zona de Resiliencia Executiva (ZRE).</p>
                                    </div>
                                ) : (
                                    <div className="mt-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-lg text-sm flex items-start gap-2">
                                        <AlertTriangle className="h-5 w-5 shrink-0" />
                                        <p>Decisao de alto atrito. Fora da Zona de Tolerancia Otima.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* C6 (M4): Alerta MATED Subclinico */}
                        {subclinicalMATED && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
                                <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2 mb-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Desvio Subclinico
                                </h3>
                                <p className="text-xs text-yellow-300/70 mb-3">
                                    Distância MATED proxima ao NVO, mas dimensões já se afastaram do baseline (&gt;5%).
                                </p>
                                <div className="space-y-1 text-xs">
                                    {subclinicalMATED.escopoDesvio > 0.05 && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Escopo (E)</span>
                                            <span className="text-yellow-400 font-mono">+{(subclinicalMATED.escopoDesvio * 100).toFixed(1)}%</span>
                                        </div>
                                    )}
                                    {subclinicalMATED.orcamentoDesvio > 0.05 && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Orçamento (C)</span>
                                            <span className="text-yellow-400 font-mono">+{(subclinicalMATED.orcamentoDesvio * 100).toFixed(1)}%</span>
                                        </div>
                                    )}
                                    {subclinicalMATED.prazoDesvio > 0.05 && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Prazo (P)</span>
                                            <span className="text-yellow-400 font-mono">+{(subclinicalMATED.prazoDesvio * 100).toFixed(1)}%</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* C8 (P3): Decomposicao causal MATED */}
                        {matefDecomposition && cdtAtual && (
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Decomposição MATED</h3>
                                <div className="space-y-2 mb-4">
                                    {matefDecomposition.dims.map((d, i) => (
                                        <div key={d.nome}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-400">{d.nome}</span>
                                                <span className={`font-mono font-bold ${i === 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                                    {d.valor.toFixed(3)} {d.direcao} ({d.pct}%)
                                                </span>
                                            </div>
                                            <div className="h-1 bg-slate-800 rounded-full">
                                                <div
                                                    className={`h-full rounded-full ${i === 0 ? 'bg-rose-500' : i === 1 ? 'bg-amber-500' : 'bg-slate-600'}`}
                                                    style={{ width: `${d.pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {matefDecomposition.tarefasExpostas.length > 0 && (
                                    <>
                                        <div className="text-[10px] text-slate-600 font-bold uppercase mb-2">Tarefas Expostas (folga=0)</div>
                                        <div className="space-y-1">
                                            {matefDecomposition.tarefasExpostas.map(t => (
                                                <div key={t.id} className="text-xs flex justify-between text-slate-500">
                                                    <span className="truncate max-w-[140px]">{t.nome}</span>
                                                    <span className="font-mono text-rose-400 shrink-0 ml-1">EF:{t.ef}d</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* G10: Diagnóstico direcional MATED — decomporMATED(centroide → NVO) */}
                        {matedDirecional && cdtAtual && cdtAtual.mated_distancia > 0.01 && (
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Diagnóstico Direcional</h3>
                                <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg border ${
                                    matedDirecional.direcao_principal === 'custo'
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                        : matedDirecional.direcao_principal === 'prazo'
                                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                            : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                                }`}>
                                    <Circle className="h-3 w-3 shrink-0" />
                                    <span className="text-xs font-bold uppercase tracking-wide">
                                        Desvio primário:{' '}
                                        {matedDirecional.direcao_principal === 'custo' ? 'CUSTO (eixo Y)' :
                                         matedDirecional.direcao_principal === 'prazo' ? 'PRAZO (eixo X)' :
                                         'EQUILIBRADO'}
                                    </span>
                                </div>
                                <div className="space-y-2 text-xs">
                                    {(() => {
                                        const total = (matedDirecional.desvio_custo + matedDirecional.desvio_prazo) || 0.0001
                                        const pctCusto = Math.round((matedDirecional.desvio_custo / total) * 100)
                                        const pctPrazo = Math.round((matedDirecional.desvio_prazo / total) * 100)
                                        return (
                                            <>
                                                <div>
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-slate-400">d_custo (|Δy|)</span>
                                                        <span className="font-mono text-emerald-400">{matedDirecional.desvio_custo.toFixed(4)} — {pctCusto}%</span>
                                                    </div>
                                                    <div className="h-1 bg-slate-800 rounded-full">
                                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pctCusto}%` }} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-slate-400">d_prazo (|Δx|)</span>
                                                        <span className="font-mono text-amber-400">{matedDirecional.desvio_prazo.toFixed(4)} — {pctPrazo}%</span>
                                                    </div>
                                                    <div className="h-1 bg-slate-800 rounded-full">
                                                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pctPrazo}%` }} />
                                                    </div>
                                                </div>
                                            </>
                                        )
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* Integrais de Desvio: A_mancha e A_rebarba + gráfico de interseção */}
                        {cdtAtual?.a_mancha !== undefined && (
                          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                              Integrais de Desvio
                            </h4>
                            <div className="space-y-2 mb-4">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">A_mancha</span>
                                <span className={`font-mono font-bold text-sm ${(cdtAtual.a_mancha ?? 0) > 0.1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                  {cdtAtual.a_mancha?.toFixed(4) ?? '—'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">A_rebarba</span>
                                <span className={`font-mono font-bold text-sm ${(cdtAtual.a_rebarba ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  {cdtAtual.a_rebarba?.toFixed(4) ?? '—'}
                                </span>
                              </div>
                              {manchaChartData.length > 0 && (() => {
                                const { aMancha, aIntersecao } = calcularAMancha(curvaCusto, curvaPrazo)
                                return (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">A_intersecao</span>
                                    <span className="font-mono font-bold text-sm text-violet-400">
                                      {aIntersecao.toFixed(4)}
                                    </span>
                                  </div>
                                )
                              })()}
                            </div>

                            {/* Gráfico de sobreposição f_p × f_c — A_mancha visual */}
                            {manchaChartData.length > 0 && (
                              <>
                                <ResponsiveContainer width="100%" height={130}>
                                  <ComposedChart data={manchaTransformada} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                                    <defs>
                                      <linearGradient id="fpGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0.05} />
                                      </linearGradient>
                                      <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                                      </linearGradient>
                                      <linearGradient id="intersecaoGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.6} />
                                        <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.15} />
                                      </linearGradient>
                                    </defs>
                                    <XAxis dataKey="t" hide />
                                    <YAxis domain={[0, 1]} hide />
                                    <Tooltip
                                      contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 10 }}
                                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                      formatter={(value: any, name: any) => [typeof value === 'number' ? value.toFixed(3) : value, name]}
                                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                      labelFormatter={(t: any) => `t = ${(Number(t) * 100).toFixed(0)}%`}
                                    />
                                    {/* f_p: burndown normalizado (1→0) */}
                                    <Area type="monotone" dataKey="fp" stroke="#818cf8" strokeWidth={1.5}
                                      fill="url(#fpGrad)" name="f_p (prazo)" dot={false} />
                                    {/* f_c: custo ou liquidez (protocolo β) */}
                                    <Area type="monotone" dataKey="fc" stroke="#f59e0b" strokeWidth={1.5}
                                      fill="url(#fcGrad)" name={modoInvertidoAtivo ? "f_L (liquidez)" : "f_c (custo)"} dot={false} />
                                    {/* A_intersecao: sobreposição das duas áreas */}
                                    <Area type="monotone" dataKey="intersecao" stroke="none" strokeWidth={0}
                                      fill="url(#intersecaoGrad)" name="A_intersecao" dot={false} />
                                    <ReferenceLine y={0.5} stroke="#475569" strokeDasharray="3 3" strokeWidth={0.8} />
                                  </ComposedChart>
                                </ResponsiveContainer>
                                <div className="flex gap-3 mt-2 justify-center">
                                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                    <span className="inline-block w-3 h-0.5 bg-indigo-400 rounded" />
                                    f_p burndown
                                  </span>
                                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                    <span className="inline-block w-3 h-0.5 bg-amber-400 rounded" />
                                    f_c custo
                                  </span>
                                  <span className="flex items-center gap-1 text-[10px] text-violet-500 font-semibold">
                                    <span className="inline-block w-3 h-2 bg-violet-400/50 rounded" />
                                    A_intersecao
                                  </span>
                                </div>
                              </>
                            )}

                            <p className="text-[10px] text-slate-600 mt-2">
                              A_mancha = ∫max(f_p, f_c)dt · A_intersecao = ∫min(f_p, f_c)dt · A_rebarba = zona plástica
                            </p>
                          </div>
                        )}

                        {/* Story 1.7: Projeção CDT +5 dias — bloqueada se CEt inválida */}
                        {projecaoCEt && (
                            <div className={`rounded-2xl p-4 border ${
                                projecaoCEt.cetValida
                                    ? 'bg-blue-500/10 border-blue-500/30'
                                    : 'bg-rose-500/10 border-rose-500/30'
                            }`}>
                                <h3 className={`text-sm font-semibold flex items-center gap-2 mb-2 ${
                                    projecaoCEt.cetValida ? 'text-blue-400' : 'text-rose-400'
                                }`}>
                                    <Activity className="h-4 w-4" />
                                    Projeção +{projecaoCEt.diasProjetados} dias
                                </h3>
                                {projecaoCEt.cetValida ? (
                                    <>
                                        <p className="text-xs text-blue-300/70 mb-3">
                                            Tendência válida — triângulo projetado passa na CEt Dupla.
                                        </p>
                                        <div className="space-y-1 text-xs font-mono">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">E (Escopo)</span>
                                                <span className="text-blue-300">{projecaoCEt.E.toFixed(3)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">C (Custo)</span>
                                                <span className="text-blue-300">{projecaoCEt.C.toFixed(3)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">P (Prazo)</span>
                                                <span className="text-blue-300">{projecaoCEt.P.toFixed(3)}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-xs text-rose-300/80">
                                            Projeção indisponível — triângulo projetado inválido
                                        </p>
                                        {projecaoCEt.cetViolacao && (
                                            <p className="text-[10px] text-rose-400/60 mt-1">
                                                Violação: lado {projecaoCEt.cetViolacao.violatedSide} — etapa {projecaoCEt.cetViolacao.stage}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Snapshot History */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Ultimas Simulacoes</h3>
                            {history.length === 0 ? (
                                <p className="text-xs text-slate-600 italic">Nenhum snapshot registrado ainda.</p>
                            ) : (
                                <div className="space-y-3">
                                    {history.map((h) => (
                                        <div key={h.id} className="flex justify-between items-center text-xs border-b border-slate-800 pb-2 last:border-none">
                                            <div>
                                                <p className="font-bold text-slate-200">{DimensionMapper.formatCusto(h.custo)} / {h.prazo}d</p>
                                                <p className="text-[10px] text-slate-500">{new Date(h.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <span className={`font-mono font-bold ${h.assertividade > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                {h.assertividade}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        </>}
                    </div>

                    {/* Plotter View + ZonaTimeline */}
                    <div className="lg:col-span-2 flex flex-col gap-4 order-1 lg:order-2">
                        {/* Story 2.6 — Disclaimer Modo Invertido */}
                        <DisclaimerModoInvertido resultado={resultadoSC ?? null} />

                        {/* ── CEt Diagnóstico: quando triângulo é inválido ── */}
                        {cdtAtual && !cdtAtual.cet_dupla.valid && (() => {
                            const E = cdtAtual.lados.escopo
                            const C = cdtAtual.lados.orcamento
                            const P = cdtAtual.lados.prazo
                            // Limites CEt: para cada lado, dado os outros dois
                            // Limite inferior = |a - b|, Limite superior = a + b
                            const limites = {
                                E: { min: Math.abs(C - P), max: C + P, atual: E },
                                C: { min: Math.abs(E - P), max: E + P, atual: C },
                                P: { min: Math.abs(E - C), max: E + C, atual: P },
                            }
                            const violado = cdtAtual.cet_dupla.violatedSide as 'E' | 'C' | 'P' | undefined
                            return (
                                <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4">
                                    <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2 mb-3">
                                        <AlertTriangle className="h-4 w-4" />
                                        CEt Inválida — TM Degenerado
                                    </h3>
                                    <p className="text-xs text-rose-300/70 mb-3">
                                        A Condição de Existência do Triângulo <span className="font-mono text-rose-300">|P−C| &lt; E &lt; P+C</span> foi violada.
                                        O Aura não consegue calcular ângulos, baricentro ou Síntese de Clairaut com dados inválidos.
                                    </p>
                                    {/* Limites CEt: intervalo válido para cada lado */}
                                    <div className="space-y-1.5 text-xs font-mono mb-3">
                                        {(['E', 'C', 'P'] as const).map(lado => {
                                            const lim = limites[lado]
                                            const isViolado = violado === lado
                                            const dentroIntervalo = lim.atual > lim.min && lim.atual < lim.max
                                            return (
                                                <div key={lado} className={`rounded-lg px-2 py-1.5 border ${isViolado ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-900 border-slate-800'}`}>
                                                    <div className="flex justify-between items-center">
                                                        <span className={isViolado ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                                                            {lado === 'E' ? 'E — Escopo' : lado === 'C' ? 'C — Custo' : 'P — Prazo'}
                                                        </span>
                                                        <span className={dentroIntervalo ? 'text-emerald-400' : 'text-rose-300 font-bold'}>
                                                            {lim.atual.toFixed(4)} {!dentroIntervalo && '✗'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                                        intervalo válido: ({lim.min.toFixed(4)}, {lim.max.toFixed(4)})
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <p className="text-[11px] text-rose-400/60">
                                        Causa provável: CPM sem predecessoras (todas as tarefas em paralelo) → prazo mínimo irreal → lado P colapsa.
                                        Configure predecessoras em <strong className="text-rose-300">Setup → CPM</strong>.
                                    </p>
                                </div>
                            )
                        })()}

                        {/* ═══ TrianglePlotter — oculto quando CRISE (CEt violada) ═══ */}
                        {cdtAtual?.cet_dupla.valid !== false && (
                        <div className="h-[400px] sm:h-[550px] lg:h-[700px]">
                            <TrianglePlotter
                                original={currentTriangle}
                                orthic={orthic}
                                barycenter={modoInvertidoAtivo ? {
                                    x: (currentTriangle.A.x + currentTriangle.B.x + currentTriangle.C.x) / 3,
                                    y: (currentTriangle.A.y + currentTriangle.B.y + currentTriangle.C.y) / 3,
                                } : orthicBarycenter}
                                decision={simuladorAtivo ? decisionProps : undefined}
                                onCanvasClick={cdtAtual?.cet_dupla.valid ? handleCanvasClick : undefined}
                                baselineTriangle={baselineTriangleMapped}
                                zonaOperacional={zonaOperacional ?? undefined}
                                modoExemplo={!cdtAtual?.cet_dupla.valid}
                                prazoBase={(caminhoCriticoBaseline ?? prazoBase) ?? undefined}
                                orcamentoBase={orcamentoBase ?? undefined}
                                pctContingencia={
                                    tap?.percentual_contingencia ?? getDefaultContingencia(tap?.setor ?? 'geral')
                                }
                                protocolo={cdtAtual?.protocolo ?? 'agudo'}
                                manchaData={manchaTransformada}
                                aRebarba={cdtAtual?.a_rebarba ?? 0}
                                angulos={cdtAtual ? (() => {
                                    const sE = cdtAtual.lados.escopo, sC = cdtAtual.lados.orcamento, sP = cdtAtual.lados.prazo
                                    const toDeg = (r: number) => r * 180 / Math.PI
                                    return {
                                        alpha: toDeg(Math.acos(clampCos((sE*sE + sP*sP - sC*sC) / (2*sE*sP || 1)))),
                                        beta:  toDeg(Math.acos(clampCos((sE*sE + sC*sC - sP*sP) / (2*sE*sC || 1)))),
                                        gamma: toDeg(Math.acos(clampCos((sC*sC + sP*sP - sE*sE) / (2*sC*sP || 1)))),
                                    }
                                })() : undefined}
                                ladosNorm={cdtAtual ? {
                                    E: cdtAtual.lados.escopo,
                                    C: cdtAtual.lados.orcamento,
                                    P: cdtAtual.lados.prazo,
                                } : undefined}
                                labelCusto={ancoragem.labelCusto}
                                labelPrazo={ancoragem.labelPrazo}
                                subLabelCusto={ancoragem.subLabelCusto}
                                subLabelPrazo={ancoragem.subLabelPrazo}
                            />
                        </div>
                        )}

                        {/* ═══ Sessão 29: Painel de Compensação TM↔TA + Transição ═══ */}
                        {compensacao && divergencia && cdtAtual?.cet_dupla.valid && (
                            <div className="bg-slate-900/50 border border-slate-700/60 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        Compensação TM ↔ TA
                                    </span>
                                    {compensacao.divergencia_protocolo && (
                                        <span className="text-[9px] font-bold text-amber-400 bg-amber-950/50 border border-amber-500/30 rounded-full px-2 py-0.5">
                                            Protocolo divergente
                                        </span>
                                    )}
                                </div>
                                {/* Deltas por lado */}
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { label: 'Escopo', delta: compensacao.delta_E_norm, color: '#34d399' },
                                        { label: 'Custo', delta: compensacao.delta_C_norm, color: '#60a5fa' },
                                        { label: 'Prazo', delta: compensacao.delta_P_norm, color: '#f59e0b' },
                                    ].map(({ label, delta, color }) => (
                                        <div key={label} className="text-center">
                                            <div className="text-[9px] text-slate-500">{label}</div>
                                            <div className="text-sm font-bold" style={{ color: Math.abs(delta) > 0.1 ? color : '#64748b' }}>
                                                {delta > 0 ? '+' : ''}{(delta * 100).toFixed(1)}%
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Recomendação */}
                                {recomendacaoCompensacao && (
                                    <p className="text-[10px] text-slate-400 border-t border-slate-800 pt-2">
                                        {recomendacaoCompensacao}
                                    </p>
                                )}
                                {/* Transição detectada */}
                                {transicaoEvento && (
                                    <div className={`text-[10px] border-t border-slate-800 pt-2 ${
                                        classificarSeveridade(transicaoEvento) === 'critica' ? 'text-rose-400' :
                                        classificarSeveridade(transicaoEvento) === 'positiva' ? 'text-emerald-400' :
                                        'text-amber-400'
                                    }`}>
                                        Transição: {transicaoEvento.trigger}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Síntese de Clairaut — Manômetros Angulares ── */}
                        {resultadoSC && cdtAtual?.cet_dupla.valid && (() => {
                            const tipo = resultadoSC.tipo
                            const isOk = tipo === 'agudo'
                            const isSingular = tipo === 'singular'
                            const borderColor = isOk ? 'border-emerald-500/30' : isSingular ? 'border-blue-500/30' : 'border-amber-500/30'
                            const bgColor = isOk ? 'bg-emerald-950/30' : isSingular ? 'bg-blue-950/30' : 'bg-amber-950/30'
                            const titleColor = isOk ? 'text-emerald-400' : isSingular ? 'text-blue-400' : 'text-amber-400'

                            // Diagnóstico em linguagem natural
                            const diagnostico: string = isOk
                                ? 'O projeto está equilibrado — prazo, custo e escopo formam um triângulo saudável. Sem riscos geométricos detectados.'
                                : isSingular
                                ? 'Estado limiar detectado: um ângulo está exatamente em 90°. Qualquer desvio pode desencadear colapso β ou γ. Monitore de perto.'
                                : tipo === 'obtuso_beta'
                                ? 'Alerta de custo: o orçamento ultrapassou o limite geométrico (ω > 90°). Protocolo β ativo — ação corretiva recomendada para evitar colapso financeiro.'
                                : 'Alerta de prazo: o cronograma está em colapso geométrico (α > 90°). Protocolo γ ativo — o triângulo precisa de compressão urgente.'

                            // Manômetro semicircular SVG — tamanho aumentado para legibilidade
                            const Gauge = ({ value, label, sublabel, tooltip }: { value: number; label: string; sublabel: string; tooltip: string }) => {
                                const frac = Math.min(1, value / 180)
                                const r = 38, cx = 50, cy = 50
                                const startRad = Math.PI
                                const endRad = Math.PI + frac * Math.PI
                                const x1 = cx + r * Math.cos(startRad), y1 = cy + r * Math.sin(startRad)
                                const x2 = cx + r * Math.cos(endRad),   y2 = cy + r * Math.sin(endRad)
                                const large = frac > 0.5 ? 1 : 0
                                const strokeColor = value > 90 ? '#f87171' : value >= 75 ? '#fbbf24' : '#34d399'
                                return (
                                    <div className="flex flex-col items-center gap-1" title={tooltip}>
                                        <svg width="100" height="65" viewBox="0 0 100 65">
                                            {/* trilha base */}
                                            <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                                                fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
                                            {/* arco de valor */}
                                            {frac > 0.01 && (
                                                <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
                                                    fill="none" stroke={strokeColor} strokeWidth="8" strokeLinecap="round" />
                                            )}
                                            {/* marcação 90° no topo */}
                                            <line x1={cx} y1={cy - r + 6} x2={cx} y2={cy - r - 3}
                                                stroke="#475569" strokeWidth="1.5" />
                                            {/* valor DENTRO do semicírculo */}
                                            <text x={cx} y={cy - 4} textAnchor="middle"
                                                fontSize="16" fontWeight="800" fontFamily="monospace" fill={strokeColor}>
                                                {value.toFixed(1)}°
                                            </text>
                                        </svg>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-slate-200 leading-tight">{label}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">{sublabel}</p>
                                        </div>
                                    </div>
                                )
                            }

                            return (
                                <div className={`rounded-2xl p-6 border-2 ${bgColor} ${borderColor} shadow-lg`}>
                                    <h3 className={`text-lg font-black flex items-center gap-2 mb-4 ${titleColor}`}>
                                        <Activity className="h-5 w-5" />
                                        Painel Clairaut — {
                                            isOk ? 'Projeto Equilibrado' :
                                            isSingular ? 'Estado Singular (ε = 90°)' :
                                            tipo === 'obtuso_beta' ? 'Colapso de Custo (ω > 90°)' :
                                            'Colapso de Prazo (α > 90°)'
                                        }
                                    </h3>

                                    {/* Diagnóstico natural */}
                                    <p className="text-sm text-slate-300 mb-6 leading-relaxed">{diagnostico}</p>

                                    {/* Manômetros — grid com mais espaçamento */}
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <Gauge
                                            value={resultadoSC.alpha}
                                            label="α — Pressão de Prazo"
                                            sublabel="ângulo oposto ao Prazo"
                                            tooltip="α (alfa): ângulo no vértice E-O (entre Escopo e Orçamento), oposto ao lado Prazo. α > 90° = Protocolo γ — prazo em colapso"
                                        />
                                        <Gauge
                                            value={resultadoSC.omega}
                                            label="ω — Pressão de Custo"
                                            sublabel="ângulo oposto ao Custo"
                                            tooltip="ω (ômega): ângulo no vértice E-P (entre Escopo e Prazo), oposto ao lado Custo. ω > 90° = Protocolo β — orçamento em colapso"
                                        />
                                        <Gauge
                                            value={resultadoSC.epsilon}
                                            label="ε — Equilíbrio do Escopo"
                                            sublabel="ângulo oposto ao Escopo"
                                            tooltip="ε (épsilon): ângulo no vértice Escopo. ε = 90° = Estado Singular (limiar entre protocolos)"
                                        />
                                    </div>

                                    {/* IR */}
                                    <div className="border-t border-slate-700/50 pt-3 flex items-center justify-between">
                                        <span className="text-xs text-slate-500">Risco Intrínseco (IR)</span>
                                        <span className={`text-lg font-bold font-mono ${resultadoSC.IR > 0.6 ? 'text-rose-400' : resultadoSC.IR > 0.3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                            {(resultadoSC.IR * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            )
                        })()}
                        {/* AC-2 Story 3.0-F: linha do tempo de zonas semanais */}
                        {historicoZonas.length >= 4 && (
                            <ZonaTimeline historico={historicoZonas} />
                        )}
                    </div>

                </div>
            </div>

            {/* ═══ Sessão 29: Modal Singular (bloqueante) ═══ */}
            {singularModalOpen && (
                <SingularModal
                    tipo={singularTipo}
                    anguloCritico={
                        singularTipo === 'custo'
                            ? (resultadoSC?.omega ?? 90)
                            : (resultadoSC?.alpha ?? 90)
                    }
                    onProsseguir={(justificativa) => {
                        setSingularDismissed(true)
                        setSingularModalOpen(false)
                        toast({
                            message: `Singular aceito pelo PM. Justificativa registrada.`,
                            variant: 'warning',
                        })
                    }}
                    onRever={() => {
                        setSingularModalOpen(false)
                        toast({
                            message: 'Redirecionando para revisão do TAP/WBS...',
                            variant: 'info',
                        })
                    }}
                    onClose={() => {
                        setSingularDismissed(true)
                        setSingularModalOpen(false)
                    }}
                />
            )}
        </PlanGate>
    )
}

export default function CDTPage() {
    return (
        <ErrorBoundary>
            <CDTPageContent />
        </ErrorBoundary>
    )
}
