import { describe, it, expect } from 'vitest'
import { detectarDesvioSubclinico } from './math'

// Story 3.7 — @aura-math validou a lógica de detecção subclínica

const TM_EQUI = { lados: { escopo: 1, orcamento: 1, prazo: 1 } }

function makeTa(
  escopo: number,
  orcamento: number,
  prazo: number,
  mated: number
) {
  return { lados: { escopo, orcamento, prazo }, mated_distancia: mated }
}

describe('detectarDesvioSubclinico', () => {
  // AC-7 caso 1: MATED=0.04, ΔP=12% → alerta
  it('dispara alerta quando MATED < ε e ΔP > limiar', () => {
    // prazo = 1.12 → ΔP = |1.12 - 1| / 1 = 0.12 > 0.05
    const ta = makeTa(1, 1, 1.12, 0.04)
    const alerta = detectarDesvioSubclinico(ta, TM_EQUI)
    expect(alerta).not.toBeNull()
    expect(alerta?.tipo).toBe('subclinico')
    expect(alerta?.dimensao).toBe('P')
    expect(alerta?.variacao).toBeCloseTo(0.12, 5)
    expect(alerta?.mated).toBe(0.04)
  })

  // AC-7 caso 2: MATED=0.04, ΔP=3% → sem alerta
  it('não dispara alerta quando variação está abaixo do limiar', () => {
    const ta = makeTa(1, 1, 1.03, 0.04)
    expect(detectarDesvioSubclinico(ta, TM_EQUI)).toBeNull()
  })

  // MATED >= ε → sem alerta independente de variação
  it('não dispara alerta quando MATED >= ε (projeto não está estável)', () => {
    const ta = makeTa(1, 1, 1.20, 0.06)
    expect(detectarDesvioSubclinico(ta, TM_EQUI)).toBeNull()
  })

  // Alerta dimensão E
  it('detecta desvio subclínico na dimensão E', () => {
    const ta = makeTa(1.15, 1, 1, 0.03)
    const alerta = detectarDesvioSubclinico(ta, TM_EQUI)
    expect(alerta?.dimensao).toBe('E')
    expect(alerta?.variacao).toBeCloseTo(0.15, 5)
  })

  // Alerta dimensão O (orcamento)
  it('detecta desvio subclínico na dimensão O', () => {
    const ta = makeTa(1, 1.20, 1, 0.02)
    const alerta = detectarDesvioSubclinico(ta, TM_EQUI)
    expect(alerta?.dimensao).toBe('O')
    expect(alerta?.variacao).toBeCloseTo(0.20, 5)
  })

  // Limiar personalizado
  it('respeita limiarDimensao personalizado', () => {
    // ΔP=8% com limiar=10% → sem alerta
    const ta = makeTa(1, 1, 1.08, 0.04)
    expect(detectarDesvioSubclinico(ta, TM_EQUI, 0.05, 0.10)).toBeNull()
    // ΔP=8% com limiar=5% → alerta
    expect(detectarDesvioSubclinico(ta, TM_EQUI, 0.05, 0.05)).not.toBeNull()
  })

  // Retorna dimensão com MAIOR variação
  it('retorna a dimensão com maior variação quando múltiplas ultrapassam o limiar', () => {
    // ΔE=8%, ΔP=15% → dimensão P
    const ta = makeTa(1.08, 1, 1.15, 0.03)
    const alerta = detectarDesvioSubclinico(ta, TM_EQUI)
    expect(alerta?.dimensao).toBe('P')
    expect(alerta?.variacao).toBeCloseTo(0.15, 5)
  })

  // MATED exatamente no limiar (0.05 não é < 0.05)
  it('não dispara quando MATED é exatamente igual ao limiarEpsilon', () => {
    const ta = makeTa(1, 1, 1.20, 0.05)
    expect(detectarDesvioSubclinico(ta, TM_EQUI)).toBeNull()
  })
})
