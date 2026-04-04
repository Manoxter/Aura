'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useProject } from '@/context/ProjectContext'
import { verificarAlertas, AlertaResult } from '@/lib/engine/alertas'
import { supabase } from '@/lib/supabase'

// ═══════════════════════════════════════════════════════════════════════════
// useAlertas — Hook Story 5.5
// Monitora taAtual do ProjectContext e detecta desvios TA/TM clinicamente
// relevantes. Persiste em decisoes_mated e gerencia silêncio 24h.
// ═══════════════════════════════════════════════════════════════════════════

/** Chave localStorage para silêncio por projeto */
const SILENCE_KEY = (projetoId: string) => `aura-alerta-${projetoId}`

/** Duração do silêncio: 24 horas em milissegundos */
const SILENCE_DURATION_MS = 24 * 60 * 60 * 1000

/**
 * Triângulo Meta padrão (equilátero unitário — estado ideal do projeto).
 * Pode ser sobrescrito via parâmetro futuro quando Story 5.6 implementar TM dinâmico.
 */
const TM_DEFAULT = { E: 1.0, P: 1.0, O: 1.0 }

/** Verifica se o período de silêncio ainda está ativo para um projeto */
function isSilenced(projetoId: string): boolean {
    if (typeof window === 'undefined') return false
    try {
        const raw = localStorage.getItem(SILENCE_KEY(projetoId))
        if (!raw) return false
        const silenceUntil = parseInt(raw, 10)
        return Date.now() < silenceUntil
    } catch {
        return false
    }
}

/** Persiste o alerta em decisoes_mated via Supabase (fire-and-forget) */
async function persistirAlerta(
    alerta: AlertaResult,
    projetoId: string,
    tenantId: string | null
): Promise<void> {
    try {
        await supabase.from('decisoes_mated').insert({
            projeto_id: projetoId,
            tenant_id: tenantId,
            descricao: `Desvio clínico TA/TM detectado — zona ${alerta.zona}`,
            parametros_numericos: {
                mated: alerta.mated,
                limiar: alerta.limiar,
                zona: alerta.zona,
                zonaAnterior: alerta.zonaAnterior,
            },
            distancia_nvo: alerta.mated,
            zona_resultado: alerta.zona,
            impacto_area_percent: alerta.mated * 100,
        })
    } catch (err) {
        console.warn('[useAlertas] Falha ao persistir alerta em decisoes_mated:', err)
    }
}

export interface UseAlertasReturn {
    alertas: AlertaResult[]
    silenciar: () => void
}

/**
 * Hook que monitora taAtual do ProjectContext e emite alertas de desvio TA/TM.
 *
 * Comportamento:
 * - Recalcula alertas sempre que taAtual muda
 * - Throttle por zona: não emite alerta se a zona não mudou
 * - Silêncio: PM pode suprimir notificações por 24h (persiste no localStorage)
 * - Persistência: insere em decisoes_mated quando alerta é gerado
 *   (mesmo durante silêncio — auditoria sempre funciona)
 *
 * @param projetoId - UUID do projeto
 */
export function useAlertas(projetoId: string): UseAlertasReturn {
    const { taAtual, tenantId } = useProject()
    const [alertas, setAlertas] = useState<AlertaResult[]>([])

    // Memoiza a última zona detectada para throttle sem query ao DB
    const zonaDetectadaRef = useRef<string>('')
    const isFirstRenderRef = useRef(true)

    const silenciar = useCallback(() => {
        if (!projetoId || typeof window === 'undefined') return
        try {
            const silenceUntil = Date.now() + SILENCE_DURATION_MS
            localStorage.setItem(SILENCE_KEY(projetoId), String(silenceUntil))
            // Notifica o layout via evento customizado (badge amarelo na sidebar)
            window.dispatchEvent(
                new CustomEvent('aura:alerta-silenciado', { detail: { projetoId } })
            )
            // Limpa alertas visíveis na UI
            setAlertas([])
        } catch (err) {
            console.warn('[useAlertas] Falha ao salvar silêncio no localStorage:', err)
        }
    }, [projetoId])

    useEffect(() => {
        // Skip primeira renderização para evitar alerta no mount
        if (isFirstRenderRef.current) {
            isFirstRenderRef.current = false
            return
        }

        if (!taAtual || !projetoId) return

        const novosAlertas = verificarAlertas(taAtual, TM_DEFAULT, {
            limiar: 0.05, // default hardcoded como fallback (AC-2: campo DB pode não existir)
            zonaAtual: zonaDetectadaRef.current,
        })

        if (novosAlertas.length === 0) return

        // Enriquece com projetoId
        const alertasComProjeto = novosAlertas.map(a => ({ ...a, projetoId }))

        // Atualiza zona detectada para throttle nas próximas execuções
        zonaDetectadaRef.current = alertasComProjeto[0].zona

        // Persiste em DB (sempre — mesmo se silenciado, para auditoria)
        alertasComProjeto.forEach(alerta => {
            persistirAlerta(alerta, projetoId, tenantId)
        })

        // Só mostra na UI se não estiver silenciado
        if (!isSilenced(projetoId)) {
            setAlertas(alertasComProjeto)
        }
    }, [taAtual, projetoId, tenantId])

    // Reset alertas quando projetoId muda (evita Ghost Data)
    useEffect(() => {
        setAlertas([])
        zonaDetectadaRef.current = ''
        isFirstRenderRef.current = true
    }, [projetoId])

    return { alertas, silenciar }
}
