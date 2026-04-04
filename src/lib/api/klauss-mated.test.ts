import { describe, it, expect } from 'vitest'
import { parseKlaussMATEDResponse } from './klauss-mated'
import type { KlaussMATEDResult } from './klauss-mated'

// ══════════════════════════════════════════════════════════════
// Story 7.1 — parseKlaussMATEDResponse
// Valida o parser robusto da resposta JSON do LLM
// ══════════════════════════════════════════════════════════════

describe('parseKlaussMATEDResponse', () => {

  // ─── Caso 1: JSON válido direto ────────────────────────────
  describe('JSON válido direto', () => {
    it('parseia JSON puro com todos os campos', () => {
      const raw = JSON.stringify({
        impacto: { E: 0.0, P: 0.2, O: 0.2 },
        zona_estimada: 'RISCO',
        confianca: 0.85,
        justificativa: 'Aditivo de 20% no orçamento e postergação de 2 sprints.',
      })

      const result = parseKlaussMATEDResponse(raw)
      expect(result).not.toBeNull()

      const r = result as KlaussMATEDResult
      expect(r.impacto.E).toBe(0.0)
      expect(r.impacto.P).toBe(0.2)
      expect(r.impacto.O).toBe(0.2)
      expect(r.zona_estimada).toBe('RISCO')
      expect(r.confianca).toBe(0.85)
      expect(r.justificativa).toBe('Aditivo de 20% no orçamento e postergação de 2 sprints.')
    })

    it('parseia todas as zonas válidas', () => {
      const zonas = ['OTIMO', 'SEGURO', 'RISCO', 'CRISE'] as const
      for (const zona of zonas) {
        const raw = JSON.stringify({
          impacto: { E: 0.1, P: -0.1, O: 0.0 },
          zona_estimada: zona,
          confianca: 0.7,
          justificativa: 'Teste',
        })
        const result = parseKlaussMATEDResponse(raw)
        expect(result).not.toBeNull()
        expect(result!.zona_estimada).toBe(zona)
      }
    })

    it('preenche confianca com 0.5 quando ausente no JSON', () => {
      const raw = JSON.stringify({
        impacto: { E: 0.0, P: 0.0, O: 0.1 },
        zona_estimada: 'SEGURO',
        justificativa: 'Sem confianca explícita.',
      })
      const result = parseKlaussMATEDResponse(raw)
      expect(result).not.toBeNull()
      expect(result!.confianca).toBe(0.5)
    })

    it('preenche justificativa com string vazia quando ausente', () => {
      const raw = JSON.stringify({
        impacto: { E: 0.0, P: 0.0, O: 0.0 },
        zona_estimada: 'OTIMO',
        confianca: 1.0,
      })
      const result = parseKlaussMATEDResponse(raw)
      expect(result).not.toBeNull()
      expect(result!.justificativa).toBe('')
    })

    it('parseia deltas negativos corretamente', () => {
      const raw = JSON.stringify({
        impacto: { E: -0.5, P: -0.3, O: -0.8 },
        zona_estimada: 'CRISE',
        confianca: 0.9,
        justificativa: 'Redução drástica em todas as dimensões.',
      })
      const result = parseKlaussMATEDResponse(raw)
      expect(result).not.toBeNull()
      expect(result!.impacto.E).toBe(-0.5)
      expect(result!.impacto.O).toBe(-0.8)
    })
  })

  // ─── Caso 2: JSON em markdown code block ──────────────────
  describe('JSON em markdown code block', () => {
    it('extrai JSON de bloco ```json ... ```', () => {
      const raw = '```json\n' + JSON.stringify({
        impacto: { E: 0.0, P: 0.15, O: 0.2 },
        zona_estimada: 'SEGURO',
        confianca: 0.75,
        justificativa: 'Pequeno aditivo de prazo e orçamento.',
      }) + '\n```'

      const result = parseKlaussMATEDResponse(raw)
      expect(result).not.toBeNull()
      expect(result!.zona_estimada).toBe('SEGURO')
      expect(result!.impacto.P).toBe(0.15)
    })

    it('extrai JSON de bloco ``` ... ``` sem tag de linguagem', () => {
      const raw = '```\n' + JSON.stringify({
        impacto: { E: 0.05, P: 0.0, O: 0.0 },
        zona_estimada: 'OTIMO',
        confianca: 0.95,
        justificativa: 'Impacto mínimo no escopo.',
      }) + '\n```'

      const result = parseKlaussMATEDResponse(raw)
      expect(result).not.toBeNull()
      expect(result!.zona_estimada).toBe('OTIMO')
    })

    it('extrai JSON quando LLM adiciona texto antes do code block', () => {
      const jsonPart = JSON.stringify({
        impacto: { E: 0.1, P: 0.3, O: 0.25 },
        zona_estimada: 'RISCO',
        confianca: 0.8,
        justificativa: 'Desvio relevante detectado.',
      })
      const raw = `Aqui está a análise solicitada:\n\`\`\`json\n${jsonPart}\n\`\`\``

      const result = parseKlaussMATEDResponse(raw)
      expect(result).not.toBeNull()
      expect(result!.zona_estimada).toBe('RISCO')
    })
  })

  // ─── Caso 3: Resposta inválida → retorna null ─────────────
  describe('Resposta inválida → null', () => {
    it('retorna null para string vazia', () => {
      expect(parseKlaussMATEDResponse('')).toBeNull()
    })

    it('retorna null para texto sem JSON', () => {
      expect(parseKlaussMATEDResponse('Não consigo analisar isso agora.')).toBeNull()
    })

    it('retorna null para JSON com campo impacto ausente', () => {
      const raw = JSON.stringify({
        zona_estimada: 'SEGURO',
        confianca: 0.7,
        justificativa: 'Sem impacto.',
      })
      expect(parseKlaussMATEDResponse(raw)).toBeNull()
    })

    it('retorna null para JSON com impacto incompleto (falta campo O)', () => {
      const raw = JSON.stringify({
        impacto: { E: 0.1, P: 0.2 }, // falta O
        zona_estimada: 'SEGURO',
        confianca: 0.7,
        justificativa: 'Teste.',
      })
      expect(parseKlaussMATEDResponse(raw)).toBeNull()
    })

    it('retorna null para zona_estimada inválida', () => {
      const raw = JSON.stringify({
        impacto: { E: 0.1, P: 0.2, O: 0.3 },
        zona_estimada: 'DESCONHECIDO',
        confianca: 0.7,
        justificativa: 'Zona inválida.',
      })
      expect(parseKlaussMATEDResponse(raw)).toBeNull()
    })

    it('retorna null para JSON malformado', () => {
      expect(parseKlaussMATEDResponse('{ impacto: { E: 0.1 }')).toBeNull()
    })

    it('retorna null para JSON que é array em vez de objeto', () => {
      expect(parseKlaussMATEDResponse('[1, 2, 3]')).toBeNull()
    })

    it('retorna null para JSON com impacto contendo strings em vez de números', () => {
      const raw = JSON.stringify({
        impacto: { E: '0.1', P: '0.2', O: '0.3' },
        zona_estimada: 'SEGURO',
        confianca: 0.5,
        justificativa: 'Tipo errado.',
      })
      expect(parseKlaussMATEDResponse(raw)).toBeNull()
    })
  })

  // ─── Caso 4: Extração de JSON embutido em texto ───────────
  describe('JSON embutido em texto livre (fallback)', () => {
    it('extrai JSON quando precedido de texto sem code block', () => {
      const jsonPart = JSON.stringify({
        impacto: { E: 0.0, P: 0.1, O: 0.1 },
        zona_estimada: 'SEGURO',
        confianca: 0.6,
        justificativa: 'Pequeno desvio.',
      })
      const raw = `Análise concluída. Resultado: ${jsonPart} — Fim da análise.`

      const result = parseKlaussMATEDResponse(raw)
      expect(result).not.toBeNull()
      expect(result!.zona_estimada).toBe('SEGURO')
    })
  })
})
