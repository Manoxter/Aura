import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { logRequest } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Aura Authentication Middleware (SaaS-1 — AC-5, AC-6 | SaaS-7 — correlationId)
//
// Strategy: @supabase/ssr createServerClient reads tokens from cookies and
// automatically refreshes the session, writing updated cookies back.
//
// Protected routes: everything NOT in PUBLIC_PATHS.
// Authenticated users on auth pages (/login, /register) → /dashboard.
// Unauthenticated users on protected routes → /login?redirect={encodedPath}
// ---------------------------------------------------------------------------

/** Routes accessible without authentication */
const PUBLIC_PATHS = new Set([
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/onboarding',
])

/** API routes that should always be allowed */
const PUBLIC_PATH_PREFIXES = ['/api/health', '/api/webhooks']

/** Auth pages where an already-logged-in user should not land */
const AUTH_REDIRECT_PATHS = new Set(['/login', '/register'])

function isPublicPath(pathname: string): boolean {
    if (PUBLIC_PATHS.has(pathname)) return true
    if (PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return true
    return false
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
    try {
        return await runMiddleware(request)
    } catch (err) {
        // Safety net: never let the middleware return 500 — fail open
        console.error('[MIDDLEWARE] Unhandled exception:', err)
        return NextResponse.next()
    }
}

async function runMiddleware(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl

    // SaaS-7: Generate a correlationId per request for distributed tracing
    const correlationId = crypto.randomUUID()
    const startTime = Date.now()

    // Validate env vars before using them — missing/malformed URL crashes edge
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\s/g, '')
    const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').replace(/\s/g, '')
    if (!supabaseUrl || !supabaseKey) {
        console.error('[MIDDLEWARE] Missing Supabase env vars — failing open')
        return NextResponse.next()
    }

    // Build a response object that we can attach Set-Cookie headers to
    // (needed so @supabase/ssr can refresh tokens)
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // Create Supabase server client — reads + writes cookies on the response
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value)
                )
                response = NextResponse.next({ request })
                cookiesToSet.forEach(({ name, value, options }) =>
                    response.cookies.set(name, value, options)
                )
            },
        },
    })

    // IMPORTANT: getUser() refreshes the session if needed
    let isAuthenticated = false
    try {
        const { data: { user } } = await supabase.auth.getUser()
        isAuthenticated = !!user
    } catch {
        isAuthenticated = false
    }

    // Helper to attach X-Correlation-ID header to any response
    function withCorrelationId(res: NextResponse): NextResponse {
        res.headers.set('X-Correlation-ID', correlationId)
        return res
    }

    // SaaS-7: Log every request with structured data
    logRequest({
        method: request.method,
        path: pathname,
        status: 200,
        duration_ms: Date.now() - startTime,
        correlationId,
    })

    // 1. Authenticated user tries to access /login or /register → go to dashboard
    if (isAuthenticated && AUTH_REDIRECT_PATHS.has(pathname)) {
        const redirect = request.nextUrl.searchParams.get('redirect')
        const dest = request.nextUrl.clone()
        dest.pathname = redirect || '/dashboard'
        dest.search = ''
        return withCorrelationId(NextResponse.redirect(dest))
    }

    // 2. Public path → allow through
    if (isPublicPath(pathname)) {
        return withCorrelationId(response)
    }

    // 3. Protected path + no session → redirect to /login?redirect={path}
    if (!isAuthenticated) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        loginUrl.search = `?redirect=${encodeURIComponent(pathname)}`
        return withCorrelationId(NextResponse.redirect(loginUrl))
    }

    // 4. Authenticated + protected path → allow (with refreshed cookies)
    return withCorrelationId(response)
}

export const config = {
    matcher: [
        // Skip Next.js internals, static assets, font files, and PWA manifest
        '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
    ],
}
