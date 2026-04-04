import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setLocalStorage, getLocalStorage, clearAuraStorage } from './local-storage'

// ══════════════════════════════════════════════════════════════
// Story 8.7 — localStorage helpers: TTL + cleanup
// ══════════════════════════════════════════════════════════════

function makeMockStorage() {
    const store: Record<string, string> = {}
    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = value },
        removeItem: (key: string) => { delete store[key] },
        clear: () => { Object.keys(store).forEach(k => delete store[k]) },
        get length() { return Object.keys(store).length },
        key: (i: number) => Object.keys(store)[i] ?? null,
        _store: store,
    }
}

let mockStorage: ReturnType<typeof makeMockStorage>

beforeEach(() => {
    mockStorage = makeMockStorage()
    vi.stubGlobal('localStorage', mockStorage)
    vi.stubGlobal('window', { localStorage: mockStorage })
})

describe('setLocalStorage() + getLocalStorage()', () => {
    it('set/get normal — retorna valor dentro do TTL', () => {
        setLocalStorage('aura_test', { foo: 'bar' })
        const result = getLocalStorage<{ foo: string }>('aura_test')
        expect(result).toEqual({ foo: 'bar' })
    })

    it('get expirado — retorna null e remove a chave', () => {
        // Salva com TTL negativo (já expirado)
        const raw = JSON.stringify({ value: 42, expiresAt: Date.now() - 1000 })
        mockStorage.setItem('aura_expired', raw)
        const result = getLocalStorage<number>('aura_expired')
        expect(result).toBeNull()
        expect(mockStorage.getItem('aura_expired')).toBeNull()
    })

    it('get inexistente — retorna null', () => {
        expect(getLocalStorage('aura_nao_existe')).toBeNull()
    })
})

describe('clearAuraStorage()', () => {
    it('remove apenas chaves com prefixo aura_', () => {
        setLocalStorage('aura_key1', 'a')
        setLocalStorage('aura_key2', 'b')
        mockStorage.setItem('outro_key', 'c')

        clearAuraStorage()

        expect(getLocalStorage('aura_key1')).toBeNull()
        expect(getLocalStorage('aura_key2')).toBeNull()
        expect(mockStorage.getItem('outro_key')).toBe('c')
    })
})
