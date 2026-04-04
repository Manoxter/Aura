/**
 * api-auth.test.ts — Story TEST-COVERAGE
 * Testa requireAuth: extração e validação do Bearer token.
 * Mocks: @supabase/supabase-js (createClient), next/server (NextResponse)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock next/server ─────────────────────────────────────────────────────────
// NextResponse não existe no ambiente Node/Vitest — mock mínimo
vi.mock('next/server', () => ({
    NextResponse: {
        json: (body: unknown, init?: { status?: number }) => ({
            _isNextResponse: true,
            body,
            status: init?.status ?? 200,
        }),
    },
}))

// ── Mock @supabase/supabase-js ───────────────────────────────────────────────
const mockGetUser = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        auth: { getUser: mockGetUser },
    }),
}))

import { requireAuth } from './api-auth'

// ─────────────────────────────────────────────────────────────────────────────

function makeRequest(headers: Record<string, string> = {}): Request {
    return {
        headers: {
            get: (key: string) => headers[key.toLowerCase()] ?? null,
        },
    } as unknown as Request
}

beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
})

describe('requireAuth()', () => {
    describe('header ausente ou inválido', () => {
        it('retorna 401 quando não há Authorization header', async () => {
            const result = await requireAuth(makeRequest())
            expect(result.error).toBeDefined()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((result.error as any).status).toBe(401)
            expect(result.user).toBeUndefined()
        })

        it('retorna 401 quando header não começa com "Bearer "', async () => {
            const result = await requireAuth(makeRequest({ authorization: 'Basic abc123' }))
            expect(result.error).toBeDefined()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((result.error as any).status).toBe(401)
        })

        it('retorna 401 para header "Bearer" sem token (só prefixo)', async () => {
            const result = await requireAuth(makeRequest({ authorization: 'Token mytoken' }))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((result.error as any).status).toBe(401)
        })
    })

    describe('token inválido ou expirado', () => {
        it('retorna 401 quando Supabase retorna erro', async () => {
            mockGetUser.mockResolvedValue({
                data: { user: null },
                error: { message: 'JWT expired' },
            })
            const result = await requireAuth(makeRequest({ authorization: 'Bearer bad-token' }))
            expect(result.error).toBeDefined()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((result.error as any).status).toBe(401)
        })

        it('retorna 401 quando Supabase retorna user null sem erro', async () => {
            mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
            const result = await requireAuth(makeRequest({ authorization: 'Bearer ghost-token' }))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((result.error as any).status).toBe(401)
        })
    })

    describe('token válido', () => {
        it('retorna user.id quando autenticação bem-sucedida', async () => {
            mockGetUser.mockResolvedValue({
                data: { user: { id: 'user-123', email: 'dev@aura.com' } },
                error: null,
            })
            const result = await requireAuth(makeRequest({ authorization: 'Bearer valid-token' }))
            expect(result.error).toBeUndefined()
            expect(result.user?.id).toBe('user-123')
        })

        it('retorna user.email quando autenticação bem-sucedida', async () => {
            mockGetUser.mockResolvedValue({
                data: { user: { id: 'user-456', email: 'pm@aura.com' } },
                error: null,
            })
            const result = await requireAuth(makeRequest({ authorization: 'Bearer another-token' }))
            expect(result.user?.email).toBe('pm@aura.com')
        })

        it('passa o token extraído para Supabase getUser', async () => {
            mockGetUser.mockResolvedValue({
                data: { user: { id: 'u1', email: 'x@x.com' } },
                error: null,
            })
            await requireAuth(makeRequest({ authorization: 'Bearer my-jwt-token' }))
            expect(mockGetUser).toHaveBeenCalledWith('my-jwt-token')
        })
    })
})
