'use client'

// Story 3.6 — Interface Transparente: "Régua Baseada em N Projetos"

export interface CalibrationBadgeProps {
  n: number
  setor: string
  mode: 'literature' | 'empirical'
}

/**
 * Badge discreto que informa ao PM quantos projetos embasam os limiares MATED.
 * Cor neutra (azul info) para não confundir com alertas de risco.
 * Tooltip diferencia literatura (N < 30) vs calibração empírica (N ≥ 30).
 */
export function CalibrationBadge({ n, setor: rawSetor, mode }: CalibrationBadgeProps) {
  const setor = rawSetor === 'geral' ? 'Geral' : rawSetor.replace(/_/g, ' ')

  const label = `Régua com ${n} projeto${n !== 1 ? 's' : ''} · ${setor}`

  const tooltip =
    mode === 'empirical'
      ? `Calibração empírica: baseado em ${n} projetos reais do seu tenant`
      : `Literatura (PMI/Flyvbjerg/World Bank) — N < 30 projetos no setor ${setor}. Usando priors validados da literatura.`

  return (
    <div className="relative group inline-flex items-center">
      <span
        className={[
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium cursor-default',
          'bg-sky-50 dark:bg-sky-950/30',
          'text-sky-700 dark:text-sky-300',
          'border border-sky-200 dark:border-sky-800',
          mode === 'empirical' ? 'ring-1 ring-sky-400/40' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span
          className={[
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            mode === 'empirical'
              ? 'bg-sky-500 animate-pulse'
              : 'bg-sky-300 dark:bg-sky-600',
          ].join(' ')}
        />
        {label}
      </span>

      {/* Tooltip (CSS-only, sem dependência) */}
      <div className="pointer-events-none absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 min-w-[220px] max-w-xs">
        <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-normal leading-relaxed">
          {tooltip}
        </div>
        <div className="absolute top-full left-4 -mt-px w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900 dark:border-t-gray-700" />
      </div>
    </div>
  )
}
