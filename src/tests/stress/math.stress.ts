/* eslint-disable */
import { gerarTrianguloCDT, regressaoOLS, calcularMATED } from '../../lib/engine/math'

export function runStressTests() {
    console.log("=== AURA MATH ENGINE STRESS TEST ===")

    // 1. Zero Division Prevention
    try {
        const result = gerarTrianguloCDT(
            { x1: 0, y1: 0, x2: 0, y2: 0 }, // Zero dx
            { a: 0 },
            0,
            0,
            0
        )
        console.log("✅ Zero Division Test: Passed", result.baricentro)
    } catch (e) {
        console.error("❌ Zero Division Test: Failed")
    }

    // 2. Extreme Intensities
    try {
        const result = gerarTrianguloCDT(
            { x1: 0, y1: 0, x2: 1, y2: 999 }, // Extreme slope
            { a: 999 },
            1000,
            1,
            500
        )
        console.log("✅ Extreme Intensity Test: Passed", result.baricentro)
    } catch (e) {
        console.error("❌ Extreme Intensity Test: Failed")
    }

    // 3. Regression stability
    const emptyOLS = regressaoOLS([])
    if (emptyOLS.a === 0 && emptyOLS.b === 0) {
        console.log("✅ Empty Regression Test: Passed")
    } else {
        console.error("❌ Empty Regression Test: Failed")
    }

    // 4. MATED precision at extreme distance
    const dist = calcularMATED({ x: 9999, y: 9999 }, [0, 0])
    if (!isNaN(dist) && isFinite(dist)) {
        console.log("✅ MATED Precision Test: Passed", dist)
    } else {
        console.error("❌ MATED Precision Test: Failed")
    }

    console.log("=== STRESS TESTS COMPLETE ===")
}
