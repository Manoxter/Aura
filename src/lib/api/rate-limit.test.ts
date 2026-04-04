/**
 * rate-limit.test.ts — Story TEST-COVERAGE
 * Testa checkRateLimit com Supabase mockado:
 * - caminho feliz (RPC OK, dentro/acima do limite)
 * - fallback upsert (quando RPC falha)
 * - fail-safe (SEC-07) quando infra falha completamente
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock de getSupabaseAdmin ─────────────────────────────────────────────────

const mockRpc = vi.fn()
const mockUpsert = vi.fn()

vi.mock('@/lib/supabase', () => ({
    getSupabaseAdmin: () => ({
        rpc: mockRpc,
        from: () => ({
            upsert: () => ({
                select: () => ({
                    single: mockUpsert,
                }),
            }),
        }),
    }),
}))

import { checkRateLimit } from './rate-limit'

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
    vi.clearAllMocks()
})

describe('checkRateLimit()', () => {
    describe('caminho RPC bem-sucedido', () => {
        it('ok: true quando count abaixo do limite', async () => {
            mockRpc.mockResolvedValue({ data: 3, error: null })
            const result = await checkRateLimit('tenant-1', '/api/test', 10, 3600_000)
            expect(result.ok).toBe(true)
            expect(result.remaining).toBe(7) // 10 - 3
        })

        it('ok: true quando count igual ao limite', async () => {
            mockRpc.mockResolvedValue({ data: 10, error: null })
            const result = await checkRateLimit('tenant-1', '/api/test', 10, 3600_000)
            expect(result.ok).toBe(true)
            expect(result.remaining).toBe(0)
        })

        it('ok: false quando count excede limite, retorna retryAfter', async () => {
            mockRpc.mockResolvedValue({ data: 11, error: null })
            const result = await checkRateLimit('tenant-1', '/api/test', 10, 3600_000)
            expect(result.ok).toBe(false)
            expect(result.remaining).toBe(0)
            expect(result.retryAfter).toBeGreaterThan(0)
        })

        it('remaining nunca é negativo', async () => {
            mockRpc.mockResolvedValue({ data: 50, error: null })
            const result = await checkRateLimit('tenant-1', '/api/test', 10, 3600_000)
            expect(result.remaining).toBe(0)
        })
    })

    describe('fallback upsert (RPC falha)', () => {
        it('usa upsert e retorna ok: true quando count dentro do limite', async () => {
            mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc not found' } })
            mockUpsert.mockResolvedValue({ data: { count: 5 }, error: null })

            const result = await checkRateLimit('tenant-2', '/api/test', 10, 3600_000)
            expect(result.ok).toBe(true)
            expect(result.remaining).toBe(5) // 10 - 5
        })

        it('usa upsert e retorna ok: false quando count excede limite', async () => {
            mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc not found' } })
            mockUpsert.mockResolvedValue({ data: { count: 15 }, error: null })

            const result = await checkRateLimit('tenant-2', '/api/test', 10, 3600_000)
            expect(result.ok).toBe(false)
            expect(result.remaining).toBe(0)
            expect(result.retryAfter).toBeGreaterThan(0)
        })

        it('SEC-07: fail-safe quando upsert também falha → ok: false', async () => {
            mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc error' } })
            mockUpsert.mockResolvedValue({ data: null, error: { message: 'db down' } })

            const result = await checkRateLimit('tenant-3', '/api/test', 10, 3600_000)
            expect(result.ok).toBe(false)
            expect(result.remaining).toBe(0)
        })
    })

    describe('SEC-07: fail-safe no catch', () => {
        it('retorna ok: false quando getSupabaseAdmin lança exceção inesperada', async () => {
            mockRpc.mockRejectedValue(new Error('connection refused'))

            const result = await checkRateLimit('tenant-4', '/api/test', 10, 3600_000)
            expect(result.ok).toBe(false)
            expect(result.remaining).toBe(0)
        })
    })

    describe('parâmetros', () => {
        it('usa tenantId e endpoint no RPC', async () => {
            mockRpc.mockResolvedValue({ data: 1, error: null })
            await checkRateLimit('my-tenant', '/api/ai/klauss', 5, 60_000)

            expect(mockRpc).toHaveBeenCalledWith(
                'increment_ratelimit_count',
                expect.objectContaining({
                    p_tenant_id: 'my-tenant',
                    p_endpoint: '/api/ai/klauss',
                })
            )
        })
    })
})
