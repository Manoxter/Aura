'use client'

// Story 5.9 — Dashboard Histórico MATED em Série Temporal
// @dataviz @daniela: visualização aprovada

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  
  
  
} from 'recharts'
import type { MATEDHistoricoPoint } from '@/lib/api/historico'

// Limiares das zonas MATED
const ZONAS = [
  { valor: 0.05, label: 'ÓTIMO', cor: '#10b981' },
  { valor: 0.15, label: 'SEGURO', cor: '#3b82f6' },
  { valor: 0.30, label: 'RISCO', cor: '#f59e0b' },
]

function corZona(zona: MATEDHistoricoPoint['zona']): string {
  switch (zona) {
    case 'OTIMO': return '#10b981'
    case 'SEGURO': return '#3b82f6'
    case 'RISCO': return '#f59e0b'
    case 'CRISE': return '#ef4444'
  }
}

// ─── Tooltip customizado ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d: MATEDHistoricoPoint = payload[0]?.payload
  if (!d) return null

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs shadow-2xl min-w-[160px]">
      <p className="text-gray-400 mb-1">{d.data}</p>
      <p className="font-mono font-bold text-white text-sm">
        MATED: <span style={{ color: corZona(d.zona) }}>{d.mated.toFixed(4)}</span>
      </p>
      <p className="text-gray-400">Zona: <span style={{ color: corZona(d.zona) }}>{d.zona}</span></p>
      {d.iq !== null && (
        <p className="text-gray-400">IQ: <span className="text-white">{d.iq.toFixed(1)}%</span></p>
      )}
      {d.is_aditivo && (
        <p className="mt-1 text-rose-400 font-semibold">⚠ Aditivo registrado</p>
      )}
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export interface MATEDTimelineProps {
  historico: MATEDHistoricoPoint[]
  /** Modo compacto para mobile — sem tooltips detalhados */
  compact?: boolean
}

export function MATEDTimeline({ historico, compact = false }: MATEDTimelineProps) {
  if (historico.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2 text-center px-4">
        <p className="text-sm font-medium">Sem histórico suficiente</p>
        <p className="text-xs text-slate-600">
          Registre pelo menos 2 snapshots para ver a evolução do MATED
        </p>
      </div>
    )
  }

  // Separar pontos normais e pontos de aditivo para overlay
  const pontos = historico.map(p => ({ ...p, label: p.data }))
  const aditivos = historico.filter(p => p.is_aditivo)

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={compact ? 180 : 280}>
        <LineChart data={pontos} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

          <XAxis
            dataKey="data"
            tick={{ fill: '#64748b', fontSize: compact ? 9 : 11 }}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
            interval="preserveStartEnd"
          />

          <YAxis
            domain={[0, 0.5]}
            tick={{ fill: '#64748b', fontSize: compact ? 9 : 11 }}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
            tickFormatter={v => v.toFixed(2)}
            width={40}
          />

          {!compact && <Tooltip content={<CustomTooltip />} />}

          {/* Linhas de zona de referência */}
          {ZONAS.map(z => (
            <ReferenceLine
              key={z.label}
              y={z.valor}
              stroke={z.cor}
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={
                compact
                  ? undefined
                  : {
                      value: z.label,
                      position: 'insideTopRight',
                      fill: z.cor,
                      fontSize: 10,
                      fontWeight: 600,
                    }
              }
            />
          ))}

          {/* Linha principal MATED */}
          <Line
            type="monotone"
            dataKey="mated"
            stroke="#60a5fa"
            strokeWidth={2}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            dot={(props: any) => {
              const d: MATEDHistoricoPoint = props.payload
              const r = d.is_aditivo ? 8 : 4
              return (
                <circle
                  key={`dot-${props.cx}-${props.cy}`}
                  cx={props.cx}
                  cy={props.cy}
                  r={r}
                  fill={d.is_aditivo ? '#ef4444' : corZona(d.zona)}
                  stroke={d.is_aditivo ? '#fca5a5' : 'none'}
                  strokeWidth={d.is_aditivo ? 2 : 0}
                />
              )
            }}
            activeDot={{ r: 6, fill: '#93c5fd' }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legenda zonas */}
      {!compact && (
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          {ZONAS.map(z => (
            <span key={z.label} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span
                className="w-6 h-0.5 inline-block"
                style={{ background: z.cor, opacity: 0.7 }}
              />
              {z.label} ≤ {z.valor}
            </span>
          ))}
          {aditivos.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Aditivo
            </span>
          )}
        </div>
      )}
    </div>
  )
}
