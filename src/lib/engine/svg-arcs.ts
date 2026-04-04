/**
 * SVG Arc Path Utility — Sprint 0 Sessão 27
 *
 * Gera path SVG para arcos internos de ângulo nos triângulos.
 * Extraído de PainelIntegridadeTriangulo.tsx para reuso em
 * TrianglePlotter e CDTCanvas.
 */

/**
 * Gera um path SVG de arco circular.
 * @param cx - Centro X
 * @param cy - Centro Y
 * @param r  - Raio do arco
 * @param startAngle - Ângulo inicial em graus
 * @param endAngle   - Ângulo final em graus
 */
export function arcPath(
    cx: number, cy: number,
    r: number,
    startAngle: number, endAngle: number
): string {
    const toRad = (d: number) => (d * Math.PI) / 180
    const x1 = cx + r * Math.cos(toRad(startAngle))
    const y1 = cy + r * Math.sin(toRad(startAngle))
    const x2 = cx + r * Math.cos(toRad(endAngle))
    const y2 = cy + r * Math.sin(toRad(endAngle))
    const large = Math.abs(endAngle - startAngle) > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

/**
 * Calcula o ângulo SVG (em graus, sentido horário) de um vetor (dx, dy).
 * Usado para posicionar arcos nos vértices do triângulo.
 */
export function svgAngle(dx: number, dy: number): number {
    return Math.atan2(dy, dx) * (180 / Math.PI)
}
