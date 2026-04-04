import { Point, Triangle, calculateOrthicTriangle, calculateBarycenter, distance } from './triangle-logic'

export type DecisionEvaluation = {
    decisionPoint: Point
    distanceToOrthicBarycenter: number
    isInsideOrthicTriangle: boolean // Optional: can be implemented later to see if it's strictly inside the ZRE
}

/**
 * Calculates if a given point P lies inside the triangle ABC using barycentric coordinates.
 */
function isPointInsideTriangle({ A, B, C }: Triangle, P: Point): boolean {
    const dX = P.x - C.x
    const dY = P.y - C.y
    const dX21 = C.x - B.x
    const dY12 = B.y - C.y
    const D = dY12 * (A.x - C.x) + dX21 * (A.y - C.y)
    const s = dY12 * dX + dX21 * dY
    const t = (C.y - A.y) * dX + (A.x - C.x) * dY

    if (D < 0) return s <= 0 && t <= 0 && s + t >= D
    return s >= 0 && t >= 0 && s + t <= D
}

/**
 * Evaluates a given decision point against the optimal resilience zone (Orthic Barycenter).
 * According to MATED theory, the closer the point to the Orthic Barycenter, the more optimal the decision.
 * 
 * @param originalTriangle The current original triangle defined by Cost, Scope, Time lines.
 * @param decision The mapped coordinates of the proposed decision.
 * @returns {DecisionEvaluation} with the distance score.
 */
export function evaluateDecision(originalTriangle: Triangle, decision: Point): DecisionEvaluation {
    // 1. Find the Executive Resilience Zone (ZRE) - Orthic Triangle
    const orthicTriangle = calculateOrthicTriangle(originalTriangle)

    // 2. Find the Optimal Nucleus of Viability (NVO) - Barycenter of Orthic Triangle
    const orthicBarycenter = calculateBarycenter(orthicTriangle)

    // 3. MATED: Calculate Euclidean distance from the decision to the optimal point
    const dist = distance(decision, orthicBarycenter)

    // 4. Verify if it falls strictly inside the optimal zone
    const isInside = isPointInsideTriangle(orthicTriangle, decision)

    return {
        decisionPoint: decision,
        distanceToOrthicBarycenter: dist,
        isInsideOrthicTriangle: isInside
    }
}
