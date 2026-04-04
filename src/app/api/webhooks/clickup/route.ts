import { NextResponse } from 'next/server'
import { ClickUpAdapter, ClickUpWebhookPayload } from '@/lib/api/adapters/clickup-adapter'
import { SlackNotifier } from '@/lib/api/integrations/slack-notifier'
import { logError } from '@/lib/logger'

export async function POST(req: Request) {
    // ClickUp envia o Hash na signature
    const signature = req.headers.get('x-signature') || ''
    
    // Em produção, as keys são buscadas via RLS no DB por tenant
    const secret = process.env.CLICKUP_WEBHOOK_SECRET || 'dev-secret'
    const slackUrl = process.env.SLACK_WEBHOOK_URL || ''

    try {
        const payloadText = await req.text()
        const adapter = new ClickUpAdapter(secret)

        // Verificação Hmac (Padrão ouro em Webhooks)
        if (!adapter.verifySignature(payloadText, signature)) {
            // Retorna 401 para o Clickup não repassar sujeira
            return NextResponse.json({ error: 'Assinatura inválida (HMAC Mismatch)' }, { status: 401 })
        }

        const payload = JSON.parse(payloadText) as ClickUpWebhookPayload
        const taskData = adapter.extractTaskData(payload)

        // Disparo Condicional: Só aciona o motor Aura se concluiu
        if (taskData.completed) {
            console.log(`[Aura Engine] ✅ Tarefa ${taskData.sourceId} concluída remotamente (ClickUp).`)
            console.log(`[Aura Engine] ⚙️ Iniciando Backward Pass (D15) e ajuste no Castelo de Cartas...`)

            // -------------------------------------------------------------
            // SIMULAÇÃO DO MOTOR MATEMÁTICO (Mock MVP)
            // Na v2.0 substituiremos por "Engine.fractalBackwardPass(taskId)"
            // -------------------------------------------------------------
            const bufferRompeu = Math.random() > 0.8 // 20% de chance teórica no MVP
            
            if (bufferRompeu && slackUrl) {
                const notifier = new SlackNotifier(slackUrl)
                // Dispara o alerta proativo (Outbound) diretamente pro Slack da equipe
                await notifier.sendCrisisAlert('Sprint Alpha', 3.5, 12500, 'Vermelha')
            }
        }

        return NextResponse.json({ ok: true, processed: taskData.completed })

    } catch (err: unknown) {
        logError({
            message: (err as Error).message ?? 'Erro desconhecido na escuta do Clickup',
            stack: (err as Error).stack,
            context: { route: '/api/webhooks/clickup' }
        })
        return NextResponse.json({ error: 'Erro interno no processamento' }, { status: 500 })
    }
}
