/**
 * klauss-mated.ts — Parser e tipos para o endpoint klauss-to-mated
 * Story 7.1 — Texto → Parâmetros Numéricos MATED
 *
 * Responsabilidades:
 * - Definir o tipo KlaussMATEDResult
 * - Fazer parse robusto da resposta JSON do LLM (raw string ou markdown code block)
 * - Validar campos obrigatórios sem expor stack trace
 */

export type ZonaEstimada = 'OTIMO' | 'SEGURO' | 'RISCO' | 'CRISE'

export interface KlaussMATEDImpacto {
  E: number
  P: number
  O: number
}

export interface KlaussMATEDResult {
  impacto: KlaussMATEDImpacto
  zona_estimada: ZonaEstimada
  confianca: number
  justificativa: string
}

const ZONAS_VALIDAS: ZonaEstimada[] = ['OTIMO', 'SEGURO', 'RISCO', 'CRISE']

/**
 * Tenta extrair um objeto JSON de uma string bruta.
 * Suporta:
 *   - JSON puro: `{"impacto": ...}`
 *   - JSON em markdown code block: ```json\n{...}\n```
 */
function extractJsonString(raw: string): string | null {
  const trimmed = raw.trim()

  // Tentativa 1: JSON puro — começa com `{`
  if (trimmed.startsWith('{')) {
    return trimmed
  }

  // Tentativa 2: markdown code block ```json ... ``` ou ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim()
  }

  // Tentativa 3: encontrar primeiro `{` na string (LLM com prefixo textual)
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }

  return null
}

function isValidImpacto(v: unknown): v is KlaussMATEDImpacto {
  if (typeof v !== 'object' || v === null) return false
  const obj = v as Record<string, unknown>
  return (
    typeof obj['E'] === 'number' &&
    typeof obj['P'] === 'number' &&
    typeof obj['O'] === 'number'
  )
}

function isValidZona(v: unknown): v is ZonaEstimada {
  return typeof v === 'string' && (ZONAS_VALIDAS as string[]).includes(v)
}

/**
 * Faz parse da resposta raw do LLM e retorna KlaussMATEDResult ou null.
 * Retorna null se o JSON for inválido ou campos obrigatórios ausentes/incorretos.
 */
export function parseKlaussMATEDResponse(raw: string): KlaussMATEDResult | null {
  try {
    const jsonStr = extractJsonString(raw)
    if (!jsonStr) return null

    const parsed: unknown = JSON.parse(jsonStr)

    if (typeof parsed !== 'object' || parsed === null) return null

    const obj = parsed as Record<string, unknown>

    if (!isValidImpacto(obj['impacto'])) return null
    if (!isValidZona(obj['zona_estimada'])) return null

    const confianca = typeof obj['confianca'] === 'number' ? obj['confianca'] : 0.5
    const justificativa =
      typeof obj['justificativa'] === 'string' ? obj['justificativa'] : ''

    return {
      impacto: obj['impacto'] as KlaussMATEDImpacto,
      zona_estimada: obj['zona_estimada'] as ZonaEstimada,
      confianca,
      justificativa,
    }
  } catch {
    return null
  }
}
