/**
 * Supabase Auth Error → PT-BR message mapper (SaaS-1)
 *
 * Maps known Supabase error codes and message patterns to friendly
 * Portuguese-BR messages for end-user display.
 */

const ERROR_MAP: Array<{ match: RegExp | string; message: string }> = [
  // Credentials
  { match: 'Invalid login credentials', message: 'Email ou senha incorretos.' },
  { match: 'invalid_credentials', message: 'Email ou senha incorretos.' },
  { match: 'Email not confirmed', message: 'Email não confirmado — verifique sua caixa de entrada.' },
  { match: 'email_not_confirmed', message: 'Email não confirmado — verifique sua caixa de entrada.' },

  // Rate limiting
  { match: /too many requests/i, message: 'Muitas tentativas — aguarde 60 segundos.' },
  { match: /over_email_send_rate_limit/i, message: 'Muitas tentativas — aguarde 60 segundos.' },
  { match: /rate.?limit/i, message: 'Muitas tentativas — aguarde alguns segundos.' },

  // Registration
  { match: 'User already registered', message: 'Este email já possui uma conta.' },
  { match: /user_already_exists/i, message: 'Este email já possui uma conta.' },
  { match: /email.+already.+registered/i, message: 'Este email já possui uma conta.' },

  // Password rules
  { match: /password should be at least/i, message: 'A senha deve ter pelo menos 8 caracteres.' },
  { match: /weak.?password/i, message: 'Senha muito fraca — use letras, números e símbolos.' },

  // Token / session
  { match: /invalid.+token/i, message: 'Link inválido ou expirado — solicite um novo.' },
  { match: /token.+expired/i, message: 'Link expirado — solicite um novo.' },
  { match: /otp.+expired/i, message: 'Código expirado — solicite um novo.' },

  // Email not found
  { match: /user not found/i, message: 'Não encontramos uma conta com este email.' },

  // Network / server
  { match: /network/i, message: 'Erro de conexão — verifique sua internet e tente novamente.' },
  { match: /server error/i, message: 'Erro interno — tente novamente em instantes.' },
  { match: /fetch/i, message: 'Falha ao conectar ao servidor — tente novamente.' },
]

/**
 * Maps a Supabase auth error (or any thrown value) to a user-friendly
 * Portuguese-BR string.
 *
 * @param error - The error thrown by a Supabase Auth call (AuthError, Error, string, etc.)
 * @returns A localised, human-readable error message.
 */
export function mapSupabaseError(error: unknown): string {
  const raw = extractMessage(error)

  for (const { match, message } of ERROR_MAP) {
    if (typeof match === 'string') {
      if (raw.toLowerCase().includes(match.toLowerCase())) return message
    } else {
      if (match.test(raw)) return message
    }
  }

  // Fallback: return a generic message so we never leak raw Supabase internals
  return 'Ocorreu um erro inesperado. Tente novamente.'
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function extractMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (error === null || error === undefined) return ''
  if (typeof error === 'object') {
    // AuthError / Error shape
    const e = error as Record<string, unknown>
    if (typeof e['message'] === 'string') return e['message']
    if (typeof e['error_description'] === 'string') return e['error_description']
    if (typeof e['code'] === 'string') return e['code']
  }
  return String(error)
}
