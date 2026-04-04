import { describe, it, expect } from 'vitest'
import {
    detectarTransicao,
    classificarSeveridade,
    HistoricoTransicoes,
} from './transicao-evento'

describe('detectarTransicao', () => {
    it('retorna null quando não há protocolo anterior (primeiro snapshot)', () => {
        expect(detectarTransicao(null, 'agudo')).toBeNull()
    })

    it('retorna null quando protocolo não mudou', () => {
        expect(detectarTransicao('agudo', 'agudo')).toBeNull()
        expect(detectarTransicao('obtuso_beta', 'obtuso_beta')).toBeNull()
    })

    it('detecta transição α → β com trigger correto', () => {
        const evento = detectarTransicao('agudo', 'obtuso_beta', 94.2)
        expect(evento).not.toBeNull()
        expect(evento!.de).toBe('agudo')
        expect(evento!.para).toBe('obtuso_beta')
        expect(evento!.trigger).toContain('custo dominou')
        expect(evento!.angulo_critico).toBe(94.2)
    })

    it('detecta transição α → γ', () => {
        const evento = detectarTransicao('agudo', 'obtuso_gamma', 92.1)
        expect(evento!.trigger).toContain('prazo dominou')
    })

    it('detecta transição α → singular', () => {
        const evento = detectarTransicao('agudo', 'singular', 90.0)
        expect(evento!.trigger).toContain('fronteira')
    })

    it('detecta remissão β → α', () => {
        const evento = detectarTransicao('obtuso_beta', 'agudo', 88.5)
        expect(evento!.trigger).toContain('remissão β')
    })

    it('detecta remissão γ → α', () => {
        const evento = detectarTransicao('obtuso_gamma', 'agudo', 87.0)
        expect(evento!.trigger).toContain('remissão γ')
    })

    it('detecta cruzamento β → γ (raro)', () => {
        const evento = detectarTransicao('obtuso_beta', 'obtuso_gamma')
        expect(evento!.trigger).toContain('migrou')
    })

    it('detecta singular → β', () => {
        const evento = detectarTransicao('singular', 'obtuso_beta', 90.5)
        expect(evento!.trigger).toContain('singular → β')
    })

    it('detecta singular → α (recuo)', () => {
        const evento = detectarTransicao('singular', 'agudo', 89.5)
        expect(evento!.trigger).toContain('singular → α')
    })

    it('timestamp é número válido', () => {
        const evento = detectarTransicao('agudo', 'obtuso_beta')
        expect(evento!.timestamp).toBeGreaterThan(0)
    })
})

describe('classificarSeveridade', () => {
    it('remissão β → α é positiva', () => {
        const evento = detectarTransicao('obtuso_beta', 'agudo')!
        expect(classificarSeveridade(evento)).toBe('positiva')
    })

    it('remissão γ → α é positiva', () => {
        const evento = detectarTransicao('obtuso_gamma', 'agudo')!
        expect(classificarSeveridade(evento)).toBe('positiva')
    })

    it('α → singular é alerta', () => {
        const evento = detectarTransicao('agudo', 'singular')!
        expect(classificarSeveridade(evento)).toBe('alerta')
    })

    it('α → β é crítica', () => {
        const evento = detectarTransicao('agudo', 'obtuso_beta')!
        expect(classificarSeveridade(evento)).toBe('critica')
    })

    it('α → γ é crítica', () => {
        const evento = detectarTransicao('agudo', 'obtuso_gamma')!
        expect(classificarSeveridade(evento)).toBe('critica')
    })

    it('β → γ é alerta', () => {
        const evento = detectarTransicao('obtuso_beta', 'obtuso_gamma')!
        expect(classificarSeveridade(evento)).toBe('alerta')
    })
})

describe('HistoricoTransicoes', () => {
    it('adiciona e recupera eventos', () => {
        const hist = new HistoricoTransicoes()
        const evento = detectarTransicao('agudo', 'obtuso_beta')!
        hist.adicionar(evento)
        expect(hist.todos()).toHaveLength(1)
        expect(hist.ultimo()).toBe(evento)
    })

    it('limita ao maxEventos', () => {
        const hist = new HistoricoTransicoes(3)
        for (let i = 0; i < 5; i++) {
            hist.adicionar(detectarTransicao('agudo', 'obtuso_beta')!)
        }
        expect(hist.todos()).toHaveLength(3)
    })

    it('ultimo retorna null quando vazio', () => {
        const hist = new HistoricoTransicoes()
        expect(hist.ultimo()).toBeNull()
    })

    it('contarPorTipo funciona', () => {
        const hist = new HistoricoTransicoes()
        hist.adicionar(detectarTransicao('agudo', 'obtuso_beta')!)
        hist.adicionar(detectarTransicao('agudo', 'obtuso_beta')!)
        hist.adicionar(detectarTransicao('obtuso_beta', 'agudo')!)
        const contagem = hist.contarPorTipo()
        expect(contagem['agudo→obtuso_beta']).toBe(2)
        expect(contagem['obtuso_beta→agudo']).toBe(1)
    })

    it('teveRemissao detecta remissão no histórico', () => {
        const hist = new HistoricoTransicoes()
        hist.adicionar(detectarTransicao('agudo', 'obtuso_beta')!)
        expect(hist.teveRemissao()).toBe(false)
        hist.adicionar(detectarTransicao('obtuso_beta', 'agudo')!)
        expect(hist.teveRemissao()).toBe(true)
    })

    it('limpar zera o histórico', () => {
        const hist = new HistoricoTransicoes()
        hist.adicionar(detectarTransicao('agudo', 'obtuso_beta')!)
        hist.limpar()
        expect(hist.todos()).toHaveLength(0)
    })
})
