export type Point = { x: number; y: number }
export type Triangle = { A: Point; B: Point; C: Point }

/**
 * Calculates the Euclidean distance between two points.
 */
export function distance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
}

/**
 * Calculates the Euclidean Area of a triangle formed by points A, B, and C.
 * Formula: 0.5 * |x_A(y_B - y_C) + x_B(y_C - y_A) + x_C(y_A - y_B)|
 */
export function calculateTriangleArea({ A, B, C }: Triangle): number {
    return 0.5 * Math.abs(A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y))
}

/**
 * Calculates the Barycenter (Centroid) of a given triangle.
 * Formula: G = ((x_A + x_B + x_C) / 3, (y_A + y_B + y_C) / 3)
 */
export function calculateBarycenter({ A, B, C }: Triangle): Point {
    return {
        x: (A.x + B.x + C.x) / 3,
        y: (A.y + B.y + C.y) / 3,
    }
}

/**
 * Projection (foot of altitude) from point P onto line defined by l1→l2.
 * Story 1.9: exported so math.ts can delegate peAltitude() here, eliminating duplicate logic.
 */
export function projectPointToLine(P: Point, l1: Point, l2: Point): Point {
    const dx = l2.x - l1.x
    const dy = l2.y - l1.y

    if (dx === 0 && dy === 0) return l1

    // Calculate dot product
    const t = ((P.x - l1.x) * dx + (P.y - l1.y) * dy) / (dx * dx + dy * dy)

    return {
        x: l1.x + t * dx,
        y: l1.y + t * dy,
    }
}

/**
 * Calculates the vertices of the Orthic Triangle (pedal triangle) given an acute triangle.
 * The vertices are the feet of the altitudes from A to BC, B to AC, and C to AB.
 */
export function calculateOrthicTriangle(original: Triangle): Triangle {
    const { A, B, C } = original

    // Foot of altitude from A to line BC
    const footA = projectPointToLine(A, B, C)
    // Foot of altitude from B to line AC
    const footB = projectPointToLine(B, A, C)
    // Foot of altitude from C to line AB
    const footC = projectPointToLine(C, A, B)

    return {
        A: footA,
        B: footB,
        C: footC,
    }
}

/**
 * Calculate the incenter of a triangle (center of inscribed circle).
 * Always lies inside the triangle regardless of angle types.
 * Weighted average of vertices by opposite side lengths.
 */
export function calculateIncenter(original: Triangle): Point {
    const { A, B, C } = original
    const a = distance(B, C) // side opposite to A
    const b = distance(A, C) // side opposite to B
    const c = distance(A, B) // side opposite to C
    const p = a + b + c
    if (p === 0) return A
    return {
        x: (a * A.x + b * B.x + c * C.x) / p,
        y: (a * A.y + b * B.y + c * C.y) / p,
    }
}

/**
 * Detect if any angle in the triangle exceeds 90 degrees.
 */
export function isObtuseTriangle(original: Triangle): boolean {
    const { A, B, C } = original
    const a2 = (B.x - C.x) ** 2 + (B.y - C.y) ** 2
    const b2 = (A.x - C.x) ** 2 + (A.y - C.y) ** 2
    const c2 = (A.x - B.x) ** 2 + (A.y - B.y) ** 2
    // Obtuse if any squared side > sum of other two squared sides
    return a2 > b2 + c2 || b2 > a2 + c2 || c2 > a2 + b2
}

/**
 * CDT Semantic Labels for triangle sides.
 * Maps geometric sides (AB, BC, AC) to project dimensions.
 */
export type CDTSemanticLabels = {
    AB: { dimension: 'escopo'; label: string }
    BC: { dimension: 'orcamento'; label: string }
    AC: { dimension: 'prazo'; label: string }
}

export function getCDTLabels(lados: { escopo: number; orcamento: number; prazo: number }): CDTSemanticLabels {
    return {
        AB: { dimension: 'escopo', label: `Escopo: ${(lados.escopo * 100).toFixed(0)}%` },
        BC: { dimension: 'orcamento', label: `Custo: ${(lados.orcamento * 100).toFixed(0)}%` },
        AC: { dimension: 'prazo', label: `Prazo: ${(lados.prazo * 100).toFixed(0)}%` },
    }
}
