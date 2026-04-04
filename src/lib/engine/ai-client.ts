import Groq from 'groq-sdk'

// Lazy init: Groq SDK throws at module level if apiKey is missing.
// Deferring to runtime so CI build (no secrets) doesn't crash.
let _groq: Groq | null = null

export function getGroqClient(): Groq {
    if (!_groq) {
        _groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })
    }
    return _groq
}

// Backward compat: named export used by extract route
export const groq = new Proxy({} as Groq, {
    get(_target, prop) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (getGroqClient() as any)[prop]
    }
})
