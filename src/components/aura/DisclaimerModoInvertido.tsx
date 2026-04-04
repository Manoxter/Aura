'use client'

import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { ResultadoSC } from '@/lib/engine/clairaut'

// ═══════════════════════════════════════════════════════════════════════════
// DisclaimerModoInvertido — Banner explicativo do Mundo Invertido
// Story 2.6 — Sprint TM-SHADOW
// Exibe aviso âmbar quando o triângulo entra em regime obtuso (β ou γ),
// explicando que o triângulo cinza é o ALVO DE RECUPERAÇÃO invertido.
// ═══════════════════════════════════════════════════════════════════════════

export interface DisclaimerModoInvertidoProps {
    /** Resultado da Síntese de Clairaut */
    resultado: ResultadoSC | null
    /** Classe CSS adicional */
    className?: string
}

const TEXTOS = {
    obtuso_beta: {
        titulo: 'Mundo Invertido — Regime β (Pressão de Custo)',
        descricao:
            'O orçamento entrou em colapso geométrico (α > 90°). O triângulo cinza mostra o alvo de recuperação: reflita o vértice de prazo através do lado orçamento-escopo para restaurar a acutitude.',
    },
    obtuso_gamma: {
        titulo: 'Mundo Invertido — Regime γ (Pressão de Prazo)',
        descricao:
            'O prazo entrou em colapso geométrico (ω > 90°). O triângulo cinza mostra o alvo de recuperação: reflita o vértice de escopo através do lado prazo-orçamento para restaurar a acutitude.',
    },
}

/**
 * Banner âmbar exibido quando o projeto entra no Modo Invertido (regime obtuso β ou γ).
 * Null quando tipo = agudo, singular ou resultado = null.
 */
export function DisclaimerModoInvertido({ resultado, className }: DisclaimerModoInvertidoProps) {
    if (!resultado) return null
    if (resultado.tipo !== 'obtuso_beta' && resultado.tipo !== 'obtuso_gamma') return null

    const texto = TEXTOS[resultado.tipo]

    return (
        <div
            className={[
                'flex items-start gap-3 px-4 py-3 rounded-lg border',
                'bg-amber-500/10 border-amber-500/40 text-amber-300',
                className ?? '',
            ].join(' ')}
        >
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
            <div className="text-xs">
                <p className="font-semibold mb-0.5">{texto.titulo}</p>
                <p className="text-amber-400/80 leading-relaxed">{texto.descricao}</p>
            </div>
        </div>
    )
}
