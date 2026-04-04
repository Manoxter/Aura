'use client'

/**
 * PainelIntegridadeTriangulo — Painel Clairaut (Story 2.0-ui)
 *
 * Visualiza os ângulos α, ω, ε da Síntese de Clairaut em 3 modos configuráveis.
 * Consome `useSinteseClairaut()` do motor (Story 2.0-engine).
 *
 * Modos:
 *   triangle-live — arcos SVG sobre o triângulo TM com cores por ângulo
 *   gauge-panel   — três semicírculos estilo velocímetro
 *   radar         — spider chart triangular (recharts RadarChart)
 */

import { useMemo, useEffect, useState } from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSinteseClairaut } from '@/lib/engine/hooks/useSinteseClairaut'
import type { ResultadoSC, TipoProtocolo } from '@/lib/engine/clairaut'

// ─── Tipos Exportados ──────────────────────────────────────────────────────────

export type ClairautDisplayMode = 'triangle-live' | 'gauge-panel' | 'radar'

export interface PainelIntegridadeTrianguloProps {
  /** Lado Esforço/Escopo normalizado */
  E: number | null | undefined
  /** Lado Prazo normalizado */
  P: number | null | undefined
  /** Lado Orçamento/Origem normalizado */
  O: number | null | undefined
  mode?: ClairautDisplayMode
  className?: string
  /** Exibe seção "Saúde Estrutural" com IR, Rα, Rω */
  showSaudeEstrutural?: boolean
}

// ─── Helpers de Cor ───────────────────────────────────────────────────────────

/**
 * Cor para α e ω (escala INVERSA): longe de 90° = verde, próximo = vermelho.
 * Distância de 90° determina cor.
 */
function corAnguloInverso(angulo: number): string {
  const dist = Math.abs(angulo - 90)
  if (dist >= 40) return '#10b981' // verde — longe de 90°
  if (dist >= 20) return '#f59e0b' // amarelo — zona atenção
  return '#f43f5e'                 // vermelho — próximo de 90°
}

/**
 * Cor para ε (escala DIRETA): próximo de 90° = verde, afastado = vermelho.
 */
function corAnguloEpsilon(angulo: number): string {
  const dist = Math.abs(angulo - 90)
  if (dist <= 20) return '#10b981'
  if (dist <= 40) return '#f59e0b'
  return '#f43f5e'
}

const PROTOCOLO_LABEL: Record<TipoProtocolo, string> = {
  agudo:        'Protocolo Agudo',
  obtuso_beta:  'Protocolo β — Orçamento em colapso',
  obtuso_gamma: 'Protocolo γ — Prazo em colapso',
  singular:     'Estado Singular — Análise bloqueada',
}

function labelIR(IR: number): { texto: string; cor: string } {
  if (IR < 0.3) return { texto: 'Risco Mínimo', cor: 'text-emerald-400' }
  if (IR < 0.7) return { texto: 'Atenção',      cor: 'text-amber-400'   }
  return              { texto: 'Crítico',        cor: 'text-rose-400'    }
}

// ─── SVG arc helper ───────────────────────────────────────────────────────────

function arcPath(
  cx: number, cy: number,
  r: number,
  startAngle: number, endAngle: number
): string {
  const toRad = (d: number) => (d * Math.PI) / 180
  const x1 = cx + r * Math.cos(toRad(startAngle))
  const y1 = cy + r * Math.sin(toRad(startAngle))
  const x2 = cx + r * Math.cos(toRad(endAngle))
  const y2 = cy + r * Math.sin(toRad(endAngle))
  const large = Math.abs(endAngle - startAngle) > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

// ─── Modo: Triangle Live ──────────────────────────────────────────────────────

interface TriangleLiveProps {
  resultado: ResultadoSC
  isSingular: boolean
}

function TriangleLiveMode({ resultado, isSingular }: TriangleLiveProps) {
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (isSingular) {
      const interval = setInterval(() => setPulse(p => !p), 600)
      return () => clearInterval(interval)
    }
  }, [isSingular])

  // Triângulo equilátero normalizado para visualização
  // Vértices: A (topo-centro), B (inferior-esquerdo), C (inferior-direito)
  const SIZE = 200
  const cx = SIZE / 2
  const cy = SIZE / 2
  const R = SIZE * 0.38

  // Vértices do triângulo
  const vA: [number, number] = [cx, cy - R]                           // Vértice E-O (alpha)
  const vB: [number, number] = [cx - R * Math.sin(Math.PI / 3),
                                 cy + R * Math.cos(Math.PI / 3)]      // Vértice E-P (omega)
  const vC: [number, number] = [cx + R * Math.sin(Math.PI / 3),
                                 cy + R * Math.cos(Math.PI / 3)]      // Vértice P-O (epsilon)

  const cAlpha   = corAnguloInverso(resultado.alpha)
  const cOmega   = corAnguloInverso(resultado.omega)
  const cEpsilon = corAnguloEpsilon(resultado.epsilon)

  const arcR = 22

  // Direção dos arcos (ângulo da bissetriz no vértice)
  // vA: bissetriz aponta para baixo (90°), vB: 30°, vC: 150°
  const arcAngleA = 90
  const arcAngleB = 330
  const arcAngleC = 210

  const halfA = resultado.alpha / 2
  const halfO = resultado.omega / 2
  const halfE = resultado.epsilon / 2

  const singularStyle = isSingular ? (pulse ? 'opacity-100' : 'opacity-30') : 'opacity-100'

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full max-w-[200px] mx-auto"
      aria-label="Painel Integridade do Triângulo — modo triângulo vivo"
    >
      {/* Triângulo */}
      <polygon
        points={`${vA[0]},${vA[1]} ${vB[0]},${vB[1]} ${vC[0]},${vC[1]}`}
        fill="none"
        stroke="#334155"
        strokeWidth={1.5}
      />

      {/* Arco α (vértice A — E-O) — escala inversa */}
      <path
        d={arcPath(vA[0], vA[1], arcR, arcAngleA - halfA, arcAngleA + halfA)}
        fill="none"
        stroke={cAlpha}
        strokeWidth={3}
        strokeLinecap="round"
        className={cn('transition-colors duration-300', singularStyle, {
          'animate-pulse': resultado.tipo === 'obtuso_beta',
        })}
        style={{ pointerEvents: 'none' }}
      />

      {/* Arco ω (vértice B — E-P) — escala inversa */}
      <path
        d={arcPath(vB[0], vB[1], arcR, arcAngleB - halfO, arcAngleB + halfO)}
        fill="none"
        stroke={cOmega}
        strokeWidth={3}
        strokeLinecap="round"
        className={cn('transition-colors duration-300', singularStyle, {
          'animate-pulse': resultado.tipo === 'obtuso_gamma',
        })}
        style={{ pointerEvents: 'none' }}
      />

      {/* Arco ε (vértice C — P-O) — escala direta */}
      <path
        d={arcPath(vC[0], vC[1], arcR, arcAngleC - halfE, arcAngleC + halfE)}
        fill="none"
        stroke={cEpsilon}
        strokeWidth={3}
        strokeLinecap="round"
        className={cn('transition-colors duration-300', singularStyle)}
        style={{ pointerEvents: 'none' }}
      />

      {/* Labels dos ângulos */}
      <text x={vA[0]} y={vA[1] - 28} textAnchor="middle" className="text-xs fill-slate-300" fontSize={10}>
        α {resultado.alpha.toFixed(1)}°
      </text>
      <text x={vB[0] - 18} y={vB[1] + 5} textAnchor="end" className="text-xs fill-slate-300" fontSize={10}>
        ω {resultado.omega.toFixed(1)}°
      </text>
      <text x={vC[0] + 18} y={vC[1] + 5} textAnchor="start" className="text-xs fill-slate-300" fontSize={10}>
        ε {resultado.epsilon.toFixed(1)}°
      </text>
    </svg>
  )
}

// ─── Modo: Gauge Panel ────────────────────────────────────────────────────────

interface SemiGaugeProps {
  angulo: number
  label: string
  subtitulo: string
  cor: string
  size?: number
  pulsing?: boolean
}

function SemiGauge({ angulo, label, subtitulo, cor, size = 90, pulsing = false }: SemiGaugeProps) {
  // Semicírculo: 180° span, 0° esquerda → 180° direita
  // angulo 0-180 mapeado para 0-180° no arco
  const cx = size / 2
  const cy = size * 0.75
  const r = size * 0.38
  const strokeW = size * 0.09

  const ratio = Math.min(1, angulo / 180)
  const arcDeg = ratio * 180

  return (
    <div className={cn('flex flex-col items-center', pulsing && 'animate-pulse')}>
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
        {/* Track */}
        <path
          d={arcPath(cx, cy, r, 180, 360)}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={arcPath(cx, cy, r, 180, 180 + arcDeg)}
          fill="none"
          stroke={cor}
          strokeWidth={strokeW}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
        {/* Value */}
        <text x={cx} y={cy - r * 0.1} textAnchor="middle" fill="#e2e8f0" fontSize={size * 0.16} fontWeight="bold">
          {angulo.toFixed(0)}°
        </text>
      </svg>
      <span className="text-xs font-semibold" style={{ color: cor }}>{label}</span>
      <span className="text-[10px] text-slate-500">{subtitulo}</span>
    </div>
  )
}

function GaugePanelMode({ resultado, isSingular }: TriangleLiveProps) {
  const cAlpha   = corAnguloInverso(resultado.alpha)
  const cOmega   = corAnguloInverso(resultado.omega)
  const cEpsilon = corAnguloEpsilon(resultado.epsilon)

  return (
    <div className="flex items-end justify-around gap-2 px-2 py-2">
      <SemiGauge angulo={resultado.alpha}   label="α" subtitulo="Absorção"   cor={cAlpha}   pulsing={isSingular || resultado.tipo === 'obtuso_beta'}  />
      <SemiGauge angulo={resultado.epsilon} label="ε" subtitulo="Equilíbrio" cor={cEpsilon} size={110} pulsing={isSingular} />
      <SemiGauge angulo={resultado.omega}   label="ω" subtitulo="Entrega"    cor={cOmega}   pulsing={isSingular || resultado.tipo === 'obtuso_gamma'} />
    </div>
  )
}

// ─── Modo: Radar ──────────────────────────────────────────────────────────────

function RadarMode({ resultado, isSingular }: TriangleLiveProps) {
  // Normaliza ângulos para escala [0, 1] por eixo:
  //  α, ω: escala inversa — 0 (= 90°) a 1 (= 0° ou 180°)
  //  ε: escala direta — 0 (= 0°) a 1 (= 90°)
  const normAlpha   = Math.abs(resultado.alpha - 90) / 90
  const normOmega   = Math.abs(resultado.omega - 90) / 90
  const normEpsilon = resultado.epsilon / 90

  const data = [
    { eixo: 'α Absorção',   valor: parseFloat((normAlpha   * 100).toFixed(1)), graus: resultado.alpha   },
    { eixo: 'ε Equilíbrio', valor: parseFloat((normEpsilon * 100).toFixed(1)), graus: resultado.epsilon },
    { eixo: 'ω Entrega',    valor: parseFloat((normOmega   * 100).toFixed(1)), graus: resultado.omega   },
  ]

  const radarColor = isSingular ? '#f59e0b' : '#6366f1'

  return (
    <div className={cn('w-full h-48', isSingular && 'animate-pulse')}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <PolarGrid stroke="#1e293b" />
          <PolarAngleAxis
            dataKey="eixo"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
          />
          <Radar
            dataKey="valor"
            stroke={radarColor}
            fill={radarColor}
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip
            formatter={(_val, _name, item) => {
              const graus = (item as { payload?: { graus: number } })?.payload?.graus
              return [`${graus != null ? graus.toFixed(1) : String(_val)}°`, 'Ângulo']
            }}
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Seção: Saúde Estrutural ──────────────────────────────────────────────────

function SaudeEstrutural({ resultado }: { resultado: ResultadoSC }) {
  const irInfo = labelIR(resultado.IR)

  return (
    <div className="mt-3 space-y-2 border-t border-slate-700/50 pt-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saúde Estrutural</p>
      {[
        { label: 'IR — Risco Intrínseco', value: resultado.IR,     label2: irInfo.texto, cor: irInfo.cor },
        { label: 'Rα — Risco Orçamento',  value: resultado.Ralpha, label2: `${(resultado.Ralpha * 100).toFixed(0)}%`, cor: corAnguloInverso(resultado.alpha) },
        { label: 'Rω — Risco Prazo',      value: resultado.Romega, label2: `${(resultado.Romega * 100).toFixed(0)}%`, cor: corAnguloInverso(resultado.omega) },
      ].map(({ label, value, label2, cor }) => (
        <div key={label}>
          <div className="flex justify-between text-xs text-slate-400 mb-0.5">
            <span>{label}</span>
            <span className={cn('font-medium', cor)}>{label2}</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, value * 100).toFixed(1)}%`, backgroundColor: cor }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Alerta Estado Singular ───────────────────────────────────────────────────

function AlertaSingular() {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 mt-2">
      <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-300">
        <span className="font-semibold">Triângulo em estado singular — análise bloqueada.</span>
        {' '}Reunião obrigatória necessária.
      </p>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function PainelIntegridadeTriangulo({
  E,
  P,
  O,
  mode = 'triangle-live',
  className,
  showSaudeEstrutural = true,
}: PainelIntegridadeTrianguloProps) {
  const { resultado, pronto } = useSinteseClairaut(E, P, O)

  const protocolo = useMemo(
    () => resultado ? PROTOCOLO_LABEL[resultado.tipo] : null,
    [resultado]
  )

  const isSingular = resultado?.tipo === 'singular'

  if (!pronto || !resultado) {
    return (
      <div className={cn('flex items-center justify-center h-32 text-slate-500 text-sm', className)}>
        Sem dados para o Painel Integridade
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-200">Integridade do Triângulo</h3>
        <span className={cn(
          'text-[10px] px-2 py-0.5 rounded-full font-medium',
          isSingular
            ? 'bg-amber-500/20 text-amber-300 animate-pulse'
            : resultado.tipo === 'agudo'
            ? 'bg-emerald-500/20 text-emerald-300'
            : 'bg-rose-500/20 text-rose-300'
        )}>
          {protocolo}
        </span>
      </div>

      {/* Alerta Singular */}
      {isSingular && <AlertaSingular />}

      {/* Modos de visualização */}
      {mode === 'triangle-live' && (
        <TriangleLiveMode resultado={resultado} isSingular={isSingular} />
      )}
      {mode === 'gauge-panel' && (
        <GaugePanelMode resultado={resultado} isSingular={isSingular} />
      )}
      {mode === 'radar' && (
        <RadarMode resultado={resultado} isSingular={isSingular} />
      )}

      {/* Tooltip info */}
      <div className="text-center text-[10px] text-slate-500 mt-1">
        α={resultado.alpha.toFixed(1)}° ω={resultado.omega.toFixed(1)}° ε={resultado.epsilon.toFixed(1)}°
        {' · '}IR={resultado.IR.toFixed(2)}
      </div>

      {/* Saúde Estrutural */}
      {showSaudeEstrutural && <SaudeEstrutural resultado={resultado} />}
    </div>
  )
}
