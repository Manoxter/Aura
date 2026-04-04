/**
 * GET /api/health
 * Endpoint público para monitoramento da aplicação.
 * Não requer autenticação.
 */
export async function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
}
