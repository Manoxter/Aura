'use client'

// Story 13.4 — useRiscosCriticos: busca riscos com score_rc > 0.6
// AC-2: detecta risco crítico para o alerta do Klauss

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useRiscosCriticos(projetoId: string | null) {
    const [temRiscoCritico, setTemRiscoCritico] = useState(false)

    useEffect(() => {
        if (!projetoId) return

        supabase
            .from('riscos_projeto')
            .select('id')
            .eq('projeto_id', projetoId)
            .gt('score_rc', 0.6)
            .limit(1)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then(({ data }: { data: any }) => {
                setTemRiscoCritico((data?.length ?? 0) > 0)
            })
    }, [projetoId])

    return { temRiscoCritico }
}
