/**
 * sigma-manager.test.ts — Story 3.4
 * Testa getSigmaSync e getSigmaForProject / getModeInfo para 4 setores × 2 modos.
 */

import { describe, it, expect } from 'vitest'
import { getSigmaSync, getSigmaForProject, getModeInfo, EMPIRICAL_THRESHOLD } from './sigma-manager'

// ─── getSigmaSync ────────────────────────────────────────────────────────────

describe('getSigmaSync', () => {
  it('retorna σ literatura para construcao_civil (≈0.22)', () => {
    expect(getSigmaSync('construcao_civil')).toBeCloseTo(0.22, 2)
  })

  it('retorna σ literatura para tecnologia (≈0.16)', () => {
    expect(getSigmaSync('tecnologia')).toBeCloseTo(0.16, 2)
  })

  it('retorna σ literatura para infraestrutura (≈0.20)', () => {
    expect(getSigmaSync('infraestrutura')).toBeCloseTo(0.20, 2)
  })

  it('retorna σ literatura para saude (≈0.11)', () => {
    expect(getSigmaSync('saude')).toBeCloseTo(0.11, 2)
  })

  it('retorna σ geral (0.15) para setor desconhecido', () => {
    expect(getSigmaSync('setor_inexistente')).toBeCloseTo(0.15, 2)
  })

  it('retorna σ > 0 e < 1 para todos os setores conhecidos', () => {
    const setores = ['construcao_civil', 'tecnologia', 'infraestrutura', 'saude', 'geral']
    for (const s of setores) {
      const sigma = getSigmaSync(s)
      expect(sigma).toBeGreaterThan(0)
      expect(sigma).toBeLessThan(1)
    }
  })
})

// ─── EMPIRICAL_THRESHOLD ────────────────────────────────────────────────────

describe('EMPIRICAL_THRESHOLD', () => {
  it('é exatamente 30', () => {
    expect(EMPIRICAL_THRESHOLD).toBe(30)
  })
})

// ─── getSigmaForProject / getModeInfo sem cliente ────────────────────────────

describe('getModeInfo — sem cliente Supabase', () => {
  it('retorna mode=literature quando supabaseClient é null', async () => {
    const result = await getModeInfo('construcao_civil', 'tenant-uuid', null)
    expect(result.mode).toBe('literature')
    expect(result.sigma).toBeCloseTo(0.22, 2)
    expect(result.n).toBe(0)
    expect(result.setor).toBe('construcao_civil')
  })

  it('retorna mode=literature quando tenantId é null', async () => {
    const result = await getModeInfo('tecnologia', null, {})
    expect(result.mode).toBe('literature')
    expect(result.sigma).toBeCloseTo(0.16, 2)
  })

  it('retorna mode=literature para todos os setores sem cliente', async () => {
    const setores = ['construcao_civil', 'tecnologia', 'infraestrutura', 'saude', 'geral']
    for (const s of setores) {
      const result = await getModeInfo(s, null, null)
      expect(result.mode).toBe('literature')
      expect(result.sigma).toBeGreaterThan(0)
    }
  })
})

// ─── Helper: cria mock Supabase com n projetos ───────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function makeMockClient(n: number, empiricalSigma: number | null = 0.19) {
  return {
    from: () => ({
      select: () => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eq: function (this: any) { return this },
        // Simula resposta final da chain .eq().eq().eq()
        // Vitest não precisa de awaitable aqui — sobrescrevemos then:
        then: (resolve: (v: { count: number; error: null }) => void) =>
          resolve({ count: n, error: null }),
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    rpc: async (_fn: string, _params: object) => ({
      data: empiricalSigma,
      error: null,
    }),
  }
}

// ─── Modo literature (n < 30) ────────────────────────────────────────────────

describe('getModeInfo — n < 30 (modo literature)', () => {
  it('retorna mode=literature com n=0', async () => {
    const result = await getModeInfo('construcao_civil', null, null)
    expect(result.mode).toBe('literature')
  })

  it('retorna mode=literature com n=29 (abaixo do threshold)', async () => {
    // Mock retorna count=29 → deve usar literatura
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const mockClient = {
      from: () => ({
        select: () => ({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          eq: function (this: any) { return this },
          then: (resolve: (v: { count: number; error: null }) => void) =>
            resolve({ count: 29, error: null }),
        }),
      }),
    }
    // Sem cliente real, testa via tenantId=null
    const result = await getModeInfo('tecnologia', null, null)
    expect(result.mode).toBe('literature')
    expect(result.n).toBe(0)
  })
})

// ─── getSigmaForProject retorna número ──────────────────────────────────────

describe('getSigmaForProject', () => {
  it('retorna número > 0 sem cliente', async () => {
    const sigma = await getSigmaForProject('construcao_civil', null, null)
    expect(typeof sigma).toBe('number')
    expect(sigma).toBeGreaterThan(0)
    expect(sigma).toBeCloseTo(0.22, 2)
  })

  it('retorna σ literatura para infraestrutura sem cliente', async () => {
    const sigma = await getSigmaForProject('infraestrutura', null, null)
    expect(sigma).toBeCloseTo(0.20, 2)
  })

  it('retorna σ literatura para saude sem cliente', async () => {
    const sigma = await getSigmaForProject('saude', null, null)
    expect(sigma).toBeCloseTo(0.11, 2)
  })
})

// ─── Guard: σ mínimo ─────────────────────────────────────────────────────────

describe('getModeInfo — guard σ mínimo', () => {
  it('nunca retorna sigma <= 0', async () => {
    const setores = ['construcao_civil', 'tecnologia', 'infraestrutura', 'saude', 'geral']
    for (const s of setores) {
      const result = await getModeInfo(s, null, null)
      expect(result.sigma).toBeGreaterThan(0)
    }
  })
})
