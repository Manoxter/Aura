// ═══════════════════════════════════════════════════════════════════════════
// Story 8.7 — localStorage helpers com TTL (24h) + limpeza no logout
// Segurança: dados sensíveis de sessão não persistem indefinidamente.
// ═══════════════════════════════════════════════════════════════════════════

interface StorageItem<T> {
    value: T
    expiresAt: number
}

/**
 * Salva `value` no localStorage com expiração automática.
 * @param key    Chave de armazenamento (recomendado: prefixo `aura_`)
 * @param value  Valor serializável
 * @param ttlHours  Horas até expirar (padrão: 24h)
 */
export function setLocalStorage<T>(key: string, value: T, ttlHours = 24): void {
    if (typeof window === 'undefined') return
    const item: StorageItem<T> = {
        value,
        expiresAt: Date.now() + ttlHours * 60 * 60 * 1000,
    }
    try {
        localStorage.setItem(key, JSON.stringify(item))
    } catch {
        // quota exceeded — ignora silenciosamente
    }
}

/**
 * Recupera valor do localStorage. Retorna `null` e remove a chave se expirou.
 * Retorna `null` se a chave não existe ou se o valor não tem estrutura TTL.
 */
export function getLocalStorage<T>(key: string): T | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return null
        const item = JSON.parse(raw) as StorageItem<T>
        if (typeof item.expiresAt !== 'number') return null
        if (Date.now() > item.expiresAt) {
            localStorage.removeItem(key)
            return null
        }
        return item.value
    } catch {
        return null
    }
}

/**
 * Remove todas as chaves com prefixo `aura_` do localStorage.
 * Chamado automaticamente no logout para limpar dados de sessão.
 */
export function clearAuraStorage(): void {
    if (typeof window === 'undefined') return
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('aura_')) {
            keysToRemove.push(key)
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
}
