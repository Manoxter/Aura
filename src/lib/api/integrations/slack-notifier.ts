export interface SlackBlock {
    type: string
    text?: { type: string; text: string }
    fields?: Array<{ type: string; text: string }>
}

export class SlackNotifier {
    private webhookUrl: string

    constructor(webhookUrl: string) {
        this.webhookUrl = webhookUrl
    }

    /**
     * Envia um alerta de War Room renderizado em Blocks UI.
     */
    async sendCrisisAlert(sprintName: string, deltaDays: number, deltaCost: number, zona: string) {
        if (!this.webhookUrl) return

        let emoji = '🟡'
        if (zona.toLowerCase() === 'vermelha' || zona.toLowerCase() === 'crise') emoji = '🔴'
        if (zona.toLowerCase() === 'preto' || zona.toLowerCase() === 'colapso') emoji = '⚫'

        const blocks: SlackBlock[] = [
            {
                type: 'header',
                text: { type: 'plain_text', text: `${emoji} Gabinete de Crise Klauss: ${sprintName}` }
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*O Sprint rompeu a Zona Plástica do Triângulo Vivo.*` }
            },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*Sangramento (Dias):*\n-${Number(deltaDays).toFixed(1)} dias` },
                    { type: 'mrkdwn', text: `*Custo Irrecuperável:*\nR$ ${Number(deltaCost).toLocaleString('pt-BR')}` }
                ]
            },
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `_O Fever Chart teve seu buffer engolido nos bastidores. Assuma a cabine de comando._` }
            }
        ]

        try {
            await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blocks }),
            })
        } catch (error) {
            console.error('Falha ao enviar webhook do Slack:', error)
        }
    }
}
