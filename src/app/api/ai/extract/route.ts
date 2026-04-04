import { NextResponse } from 'next/server'
import { groq } from '@/lib/engine/ai-client'
import { ExtractSchema } from '@/lib/validations/ai-schemas'
import { ZodError } from 'zod'
import { requireAuth } from '@/lib/api-auth'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { AiExtractRequestSchema } from '@/lib/schemas'

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req)
        if (auth.error) return auth.error

        // Rate limiting: 60 req/hora por tenant
        const rateLimit = await checkRateLimit(auth.user.id, '/api/ai/extract', 60, 3600000)
        if (!rateLimit.ok) {
            return NextResponse.json(
                { error: 'Limite de requisições atingido', retryAfter: rateLimit.retryAfter, limit: 60, window: '1h' },
                { status: 429 }
            )
        }

        // Zod validation
        const body = await req.json()
        const parseResult = AiExtractRequestSchema.safeParse(body)
        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', fields: parseResult.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        const { text } = parseResult.data

        if (!process.env.GROQ_API_KEY) {
            // Retorno de fallback caso a API KEY não esteja no .env local
            return NextResponse.json(
                {
                    nomeProj: text ? text.substring(0, 40) + "..." : "Projeto Sem Nome",
                    sponsor: "Extração Local (Sem Chave)",
                    bac: 1000000,
                    prazoDias: 120,
                    tarefasIdentificadas: 5
                }
            )
        }

        const systemPrompt = `Você é um engenheiro de planejamento sênior focado em extrair dados de Termos de Abertura de Projeto (TAP).
Você deve ler o escopo do projeto e extrair as informações ESTRITAMENTE em formato JSON.

Formato OBRIGATÓRIO (retorne SOMENTE este JSON e nada mais):
{
  "nomeProj": "Nome principal do projeto inferido ou explícito",
  "sponsor": "Nome ou cargo do patrocinador responsavel",
  "bac": 2500000.00, // Custo base em numero float
  "prazoDias": 180, // Duração total em dias
  "tarefasIdentificadas": 10 // Numero estimado de macro tarefas
}

Caso a informação não exista no texto, faça uma suposição educada baseada na natureza da obra.`

        const response = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text }
            ],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' }
        })

        const rawContent = response.choices[0]?.message?.content || '{}'
        const extracted = ExtractSchema.parse(JSON.parse(rawContent))

        return NextResponse.json(extracted)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Error in /api/ai/extract:', error)
        
        if (error instanceof ZodError) {
             return NextResponse.json(
                { error: 'AI Validation Error', details: error.flatten().fieldErrors },
                { status: 422 }
            )
        }

        return NextResponse.json(
            { error: 'Internal server error while extracting data' },
            { status: 500 }
        )
    }
}
