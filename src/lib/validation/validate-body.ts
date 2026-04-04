// Story 8.6 — validate-body: helper de validação Zod com resposta 400 padronizada
// AC-2: retorna 400 com mensagem descritiva dos campos inválidos

import { NextResponse } from 'next/server'
import type { z } from 'zod'

export type ValidationResult<T> =
    | { success: true; data: T; error: null }
    | { success: false; data: null; error: NextResponse }

/**
 * Valida o body de uma request via schema Zod.
 * Em caso de erro retorna um NextResponse 400 com os fields inválidos.
 * Em caso de sucesso retorna os dados tipados.
 */
export async function validateBody<T>(
    req: Request,
    schema: z.ZodType<T>
): Promise<ValidationResult<T>> {
    let raw: unknown
    try {
        raw = await req.json()
    } catch {
        return {
            success: false,
            data: null,
            error: NextResponse.json({ error: 'Body inválido ou não é JSON.' }, { status: 400 }),
        }
    }

    const result = schema.safeParse(raw)
    if (!result.success) {
        return {
            success: false,
            data: null,
            error: NextResponse.json(
                { error: 'Dados inválidos.', fields: result.error.flatten().fieldErrors },
                { status: 400 }
            ),
        }
    }

    return { success: true, data: result.data, error: null }
}
