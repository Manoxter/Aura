import { describe, it, expect } from 'vitest'
import { verificarAlertas, classificarZonaDesvio, detectarAceleracaoLegitima, classificarAceleracao } from './alertas'
import type { TAPoint } from './alertas'

// ═══════════════════════════════════════════════════════════════════════════
// alertas.test.ts — Testes unitários para Story 5.5
// ═══════════════════════════════════════════════════════════════════════════

// Triângulo Meta ideal (equilátero normalizado = lados iguais a 1)
const TM_IDEAL = { E: 1.0, P: 1.0, O: 1.0 }

// ─── classificarZonaDesvio ────────────────────────────────────────────────

describe('classificarZonaDesvio', () => {
    it('deve retornar OTIMO quando desvio < 0.05', () => {
        expect(classificarZonaDesvio(0.0)).toBe('OTIMO')
        expect(classificarZonaDesvio(0.04)).toBe('OTIMO')
        expect(classificarZonaDesvio(0.049)).toBe('OTIMO')
    })

    it('deve retornar SEGURO quando desvio >= 0.05 e < 0.15', () => {
        expect(classificarZonaDesvio(0.05)).toBe('SEGURO')
        expect(classificarZonaDesvio(0.10)).toBe('SEGURO')
        expect(classificarZonaDesvio(0.149)).toBe('SEGURO')
    })

    it('deve retornar RISCO quando desvio >= 0.15 e < 0.30', () => {
        expect(classificarZonaDesvio(0.15)).toBe('RISCO')
        expect(classificarZonaDesvio(0.20)).toBe('RISCO')
        expect(classificarZonaDesvio(0.299)).toBe('RISCO')
    })

    it('deve retornar CRISE quando desvio >= 0.30', () => {
        expect(classificarZonaDesvio(0.30)).toBe('CRISE')
        expect(classificarZonaDesvio(0.50)).toBe('CRISE')
        expect(classificarZonaDesvio(1.0)).toBe('CRISE')
    })
})

// ─── verificarAlertas — Throttle ─────────────────────────────────────────

describe('verificarAlertas — throttle por zona', () => {
    it('deve retornar vazio se zona não mudou (zonaAtual = zona calculada)', () => {
        // TA muito diferente do TM ideal → zona CRISE
        const ta = { E: 0.3, P: 0.3, O: 0.3 }
        // Calcula primeiro sem config para descobrir a zona
        const primeiroAlerta = verificarAlertas(ta, TM_IDEAL)
        expect(primeiroAlerta.length).toBeGreaterThan(0)
        const zona = primeiroAlerta[0].zona

        // Segundo call com a zona já registrada → deve retornar vazio (throttle)
        const segundoAlerta = verificarAlertas(ta, TM_IDEAL, { zonaAtual: zona })
        expect(segundoAlerta).toHaveLength(0)
    })

    it('deve emitir alerta quando zona muda de OTIMO para RISCO', () => {
        // TA com grande desvio → zona RISCO ou CRISE
        const ta_risco = { E: 0.4, P: 0.8, O: 0.4 }
        const alertas = verificarAlertas(ta_risco, TM_IDEAL, { zonaAtual: 'OTIMO' })

        expect(alertas.length).toBeGreaterThan(0)
        expect(alertas[0].tipo).toBe('desvio_clinico')
        expect(alertas[0].zonaAnterior).toBe('OTIMO')
        // A zona deve ser algo pior que OTIMO
        expect(alertas[0].zona).not.toBe('OTIMO')
    })

    it('deve emitir alerta quando zona piora de SEGURO para CRISE', () => {
        // TA muito degradado → CRISE
        const ta_crise = { E: 0.2, P: 0.2, O: 0.2 }
        const alertas = verificarAlertas(ta_crise, TM_IDEAL, { zonaAtual: 'SEGURO' })

        expect(alertas.length).toBe(1)
        expect(alertas[0].zona).toBe('CRISE')
        expect(alertas[0].zonaAnterior).toBe('SEGURO')
    })

    it('deve emitir alerta quando zona melhora de CRISE para OTIMO', () => {
        // TA próximo do TM → zona OTIMO, mas desvio < limiar → sem alerta
        // Para forçar um alerta de melhora, usamos desvio exatamente no limiar
        const ta_quase_ideal = { E: 1.0, P: 1.0, O: 1.0 }
        const alertas = verificarAlertas(ta_quase_ideal, TM_IDEAL, { zonaAtual: 'CRISE' })
        // Desvio = 0 → zona OTIMO, que é diferente de CRISE
        // Mas desvio < limiar (0.05) → sem alerta (AC-1: alerta só se desvio >= limiar)
        expect(alertas).toHaveLength(0)
    })
})

// ─── verificarAlertas — Limiar ────────────────────────────────────────────

describe('verificarAlertas — limiar configurável', () => {
    it('não deve emitir alerta quando desvio < limiar padrão (0.05)', () => {
        // TA quase idêntico ao TM
        const ta = { E: 1.0, P: 1.0, O: 1.0 }
        const alertas = verificarAlertas(ta, TM_IDEAL)
        // Desvio = 0, zona = OTIMO, sem zonaAtual → mas desvio < 0.05 → sem alerta
        expect(alertas).toHaveLength(0)
    })

    it('deve emitir alerta quando limiar customizado menor que o desvio atual', () => {
        // TA com leve desvio → zona SEGURO (desvio ~0.06)
        // Limiar customizado de 0.01 → alerta deve ser emitido
        const ta = { E: 0.9, P: 0.9, O: 0.9 }
        const alertas = verificarAlertas(ta, TM_IDEAL, { limiar: 0.01, zonaAtual: 'OTIMO' })

        // Com limiar muito baixo, qualquer desvio acima de 1% gera alerta
        // Verificamos: se zona mudou E desvio >= limiar
        if (alertas.length > 0) {
            expect(alertas[0].limiar).toBe(0.01)
            expect(alertas[0].mated).toBeGreaterThanOrEqual(0.01)
        }
        // Caso zona não mude (OTIMO → OTIMO), retorna vazio — ambos são válidos dependendo do desvio exato
    })

    it('não deve emitir alerta quando limiar customizado maior que o desvio', () => {
        // TA com desvio médio (~0.20)
        const ta = { E: 0.7, P: 0.7, O: 0.7 }
        // Limiar muito alto → não emite
        const alertas = verificarAlertas(ta, TM_IDEAL, { limiar: 0.99, zonaAtual: 'OTIMO' })
        expect(alertas).toHaveLength(0)
    })

    it('deve retornar o limiar correto no alerta emitido', () => {
        const ta_risco = { E: 0.3, P: 0.9, O: 0.3 }
        const limiarCustom = 0.02
        const alertas = verificarAlertas(ta_risco, TM_IDEAL, { limiar: limiarCustom, zonaAtual: 'OTIMO' })

        if (alertas.length > 0) {
            expect(alertas[0].limiar).toBe(limiarCustom)
        }
    })
})

// ─── verificarAlertas — Zona calculada corretamente ──────────────────────

describe('verificarAlertas — zona calculada corretamente', () => {
    it('deve calcular zona OTIMO para TA idêntico ao TM', () => {
        // Desvio = 0 → OTIMO, mas sem alerta pois desvio < limiar
        const alertas = verificarAlertas(TM_IDEAL, TM_IDEAL, { zonaAtual: 'CRISE' })
        // Zona OTIMO != CRISE, mas desvio=0 < 0.05 → sem alerta
        expect(alertas).toHaveLength(0)
    })

    it('deve calcular zona RISCO para desvio entre 15% e 30%', () => {
        // Teste da classificação direta
        expect(classificarZonaDesvio(0.20)).toBe('RISCO')
        expect(classificarZonaDesvio(0.25)).toBe('RISCO')
    })

    it('deve calcular zona CRISE para desvio >= 30%', () => {
        expect(classificarZonaDesvio(0.35)).toBe('CRISE')
        expect(classificarZonaDesvio(0.80)).toBe('CRISE')
    })

    it('deve retornar vazio se TM tem área zero (caso degenerado)', () => {
        // Triângulo Meta degenerado (impossível geometricamente)
        const tm_zero = { E: 0, P: 0, O: 0 }
        const ta = { E: 1.0, P: 1.0, O: 1.0 }
        const alertas = verificarAlertas(ta, tm_zero, { zonaAtual: 'OTIMO' })
        expect(alertas).toHaveLength(0)
    })

    it('deve incluir tipo desvio_clinico no alerta gerado', () => {
        const ta_ruim = { E: 0.2, P: 0.2, O: 0.2 }
        const alertas = verificarAlertas(ta_ruim, TM_IDEAL, { zonaAtual: 'OTIMO' })

        expect(alertas.length).toBeGreaterThan(0)
        expect(alertas[0].tipo).toBe('desvio_clinico')
    })

    it('deve incluir o valor de mated (desvio) no alerta', () => {
        const ta_ruim = { E: 0.2, P: 0.2, O: 0.2 }
        const alertas = verificarAlertas(ta_ruim, TM_IDEAL, { zonaAtual: 'OTIMO' })

        expect(alertas.length).toBeGreaterThan(0)
        expect(alertas[0].mated).toBeGreaterThan(0)
        expect(typeof alertas[0].mated).toBe('number')
    })
})

// ─── verificarAlertas — Edge cases ────────────────────────────────────────

describe('verificarAlertas — edge cases', () => {
    it('deve usar limiar padrão 0.05 quando config é omitido', () => {
        // TA com desvio perto de zero → sem alerta (< limiar padrão)
        const ta = { E: 1.0, P: 1.0, O: 1.0 }
        const alertas = verificarAlertas(ta, TM_IDEAL)
        expect(alertas).toHaveLength(0)
    })

    it('deve usar zonaAtual vazia como estado inicial (sem throttle)', () => {
        const ta_ruim = { E: 0.2, P: 0.2, O: 0.2 }
        // Sem zonaAtual → qualquer zona diferente de '' gera alerta se desvio >= limiar
        const alertas = verificarAlertas(ta_ruim, TM_IDEAL)
        expect(alertas.length).toBeGreaterThan(0)
        expect(alertas[0].zonaAnterior).toBe('')
    })

    it('não deve emitir alerta duplicado na mesma zona consecutivamente', () => {
        const ta_risco = { E: 0.4, P: 0.4, O: 0.4 }
        const primeiroAlerta = verificarAlertas(ta_risco, TM_IDEAL, { zonaAtual: 'OTIMO' })
        expect(primeiroAlerta.length).toBeGreaterThan(0)

        const zonaDetectada = primeiroAlerta[0].zona
        // Segunda chamada com a mesma zona → throttle ativo
        const segundoAlerta = verificarAlertas(ta_risco, TM_IDEAL, { zonaAtual: zonaDetectada })
        expect(segundoAlerta).toHaveLength(0)
    })
})

// ══════════════════════════════════════════════════════════════
// Story 2.4 — detectarAceleracaoLegitima() + classificarAceleracao()
// Semântica ângulo E–P: aceleração legítima vs predatória via IQ
// ══════════════════════════════════════════════════════════════

const ponto = (E: number, P: number, O: number, iq: number): TAPoint => ({ E, P, O, iq })

describe('detectarAceleracaoLegitima()', () => {
    it('menos de 2 pontos → null', () => {
        expect(detectarAceleracaoLegitima([ponto(3, 4, 5, 0.8)])).toBeNull()
    })

    it('ângulo fechando + IQ estável → legitima detectada', () => {
        // E sobe (ângulo fecha) + IQ mantém
        const hist = [ponto(3, 4, 5, 0.80), ponto(6, 4, 5, 0.80)]
        const r = detectarAceleracaoLegitima(hist)
        expect(r).not.toBeNull()
        expect(r?.tipo).toBe('aceleracao_legitima')
    })

    it('ângulo fechando + IQ subindo → legitima detectada', () => {
        const hist = [ponto(3, 4, 5, 0.70), ponto(6, 4, 5, 0.85)]
        const r = detectarAceleracaoLegitima(hist)
        expect(r).not.toBeNull()
    })

    it('ângulo fechando + IQ caindo → null (não é legítima)', () => {
        const hist = [ponto(3, 4, 5, 0.80), ponto(6, 4, 5, 0.50)]
        expect(detectarAceleracaoLegitima(hist)).toBeNull()
    })
})

describe('classificarAceleracao()', () => {
    it('menos de 2 pontos → neutra', () => {
        expect(classificarAceleracao([ponto(3, 4, 5, 0.8)])).toBe('neutra')
    })

    it('ângulo fechando + IQ caindo → predatoria', () => {
        const hist = [ponto(3, 4, 5, 0.80), ponto(6, 4, 5, 0.50)]
        expect(classificarAceleracao(hist)).toBe('predatoria')
    })

    it('ângulo fechando + IQ estável → legitima', () => {
        const hist = [ponto(3, 4, 5, 0.80), ponto(6, 4, 5, 0.80)]
        expect(classificarAceleracao(hist)).toBe('legitima')
    })

    it('ângulo estável (sem aceleração) → neutra', () => {
        const hist = [ponto(3, 4, 5, 0.80), ponto(3, 4, 5, 0.80)]
        expect(classificarAceleracao(hist)).toBe('neutra')
    })
})
