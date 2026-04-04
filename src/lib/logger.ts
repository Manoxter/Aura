// ---------------------------------------------------------------------------
// Structured Logger — SaaS-7
//
// Outputs structured JSON logs with level prefixes for easy grep in Vercel.
// Never exposes sensitive data or stack traces in production client responses.
// ---------------------------------------------------------------------------

export function logRequest(data: {
    method: string
    path: string
    status: number
    duration_ms: number
    tenantId?: string
    correlationId: string
}): void {
    console.log(`[REQUEST] ${JSON.stringify(data)}`)
}

export function logError(data: {
    message: string
    stack?: string
    correlationId?: string
    context?: Record<string, unknown>
}): void {
    console.error(`[ERROR] ${JSON.stringify(data)}`)
}

export function logInfo(data: Record<string, unknown>): void {
    console.log(`[INFO] ${JSON.stringify(data)}`)
}
