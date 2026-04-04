'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Legacy route — CPM renamed to tarefas-diagramas (Story 6.1 / Story 6.8)
export default function CpmRedirect() {
    const { projetoId } = useParams<{ projetoId: string }>()
    const router = useRouter()

    useEffect(() => {
        router.replace(`/${projetoId}/setup/tarefas-diagramas`)
    }, [projetoId, router])

    return null
}
