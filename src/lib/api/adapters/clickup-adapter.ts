import { createHmac } from 'crypto'

/** Representação simplificada do Payload do ClickUp (TaskStatusUpdated) */
export interface ClickUpWebhookPayload {
    event: string
    history_items: Array<{
        field: string
        after: { status: string }
    }>
    task_id: string
}

export class ClickUpAdapter {
    private secret: string

    constructor(secret: string) {
        this.secret = secret
    }

    /** Verifica a assinatura (x-signature) */
    verifySignature(payloadBody: string, signature: string): boolean {
        if (!this.secret || !signature) return false
        
        const hash = createHmac('sha256', this.secret).update(payloadBody).digest('hex')
        return hash === signature
    }

    /** Interpreta se a ação significa 'Trabalho Concluído' */
    isTaskCompleted(payload: ClickUpWebhookPayload): boolean {
        if (payload.event !== 'taskStatusUpdated') return false
        
        const history = payload.history_items?.find(i => i.field === 'status')
        if (!history) return false

        const newStatus = history.after.status?.toLowerCase() || ''
        const completedKeywords = ['done', 'concluído', 'concluido', 'closed', 'complete']
        
        return completedKeywords.some(k => newStatus.includes(k))
    }

    /** Extrai dados acionáveis */
    extractTaskData(payload: ClickUpWebhookPayload) {
        return {
            sourceId: payload.task_id,
            completed: this.isTaskCompleted(payload),
        }
    }
}
