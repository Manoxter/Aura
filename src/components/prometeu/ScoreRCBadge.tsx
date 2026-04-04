// Story 13.2 — ScoreRCBadge: badge colorido de score_rc
// AC-4: verde < 0.3, amarelo 0.3–0.6, vermelho > 0.6

interface ScoreRCBadgeProps {
    score: number
}

export function ScoreRCBadge({ score }: ScoreRCBadgeProps) {
    let label: string
    let className: string

    if (score < 0.3) {
        label = 'verde'
        className = 'bg-green-100 text-green-800 border border-green-200'
    } else if (score <= 0.6) {
        label = 'amarelo'
        className = 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    } else {
        label = 'vermelho'
        className = 'bg-red-100 text-red-800 border border-red-200'
    }

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${className}`}>
            {score.toFixed(2)}
            <span className="opacity-60">({label})</span>
        </span>
    )
}
