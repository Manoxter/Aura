'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Rota legada — Gabinete de Crise migrado para /governanca/gabinete (Story 6.4 — renomeação de rotas)
// Mantido para compatibilidade reversa com bookmarks e links externos. NÃO REMOVER.
export default function WarroomRedirect() {
    const { projetoId } = useParams<{ projetoId: string }>()
    const router = useRouter()

    useEffect(() => {
        router.replace(`/${projetoId}/governanca/gabinete`)
    }, [projetoId, router])

    return null
}
