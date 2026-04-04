import { describe, it, expect } from 'vitest'
import {
    distance,
    calculateTriangleArea,
    calculateBarycenter,
    calculateOrthicTriangle,
    Point,
    Triangle
} from './triangle-logic'

describe('triangle-logic', () => {
    describe('distance', () => {
        it('calculates the distance between two points correctly', () => {
            const p1: Point = { x: 0, y: 0 }
            const p2: Point = { x: 3, y: 4 }
            expect(distance(p1, p2)).toBe(5)
        })

        it('returns zero for the same point', () => {
            const p: Point = { x: 10, y: 20 }
            expect(distance(p, p)).toBe(0)
        })
    })

    describe('calculateTriangleArea', () => {
        it('calculates the area of a right triangle correctly', () => {
            const triangle: Triangle = {
                A: { x: 0, y: 0 },
                B: { x: 4, y: 0 },
                C: { x: 0, y: 3 }
            }
            expect(calculateTriangleArea(triangle)).toBe(6)
        })

        it('returns zero for colinear points', () => {
            const triangle: Triangle = {
                A: { x: 0, y: 0 },
                B: { x: 1, y: 1 },
                C: { x: 2, y: 2 }
            }
            expect(calculateTriangleArea(triangle)).toBe(0)
        })
    })

    describe('calculateBarycenter', () => {
        it('calculates the barycenter correctly', () => {
            const triangle: Triangle = {
                A: { x: 0, y: 0 },
                B: { x: 6, y: 0 },
                C: { x: 0, y: 6 }
            }
            expect(calculateBarycenter(triangle)).toEqual({ x: 2, y: 2 })
        })
    })

    describe('calculateOrthicTriangle', () => {
        it('calculates the orthic triangle vertices correctly', () => {
            // For a right triangle ABC with right angle at A, 
            // the feet of altitudes from B and C are A itself.
            const triangle: Triangle = {
                A: { x: 0, y: 0 },
                B: { x: 4, y: 0 },
                C: { x: 0, y: 3 }
            }
            const orthic = calculateOrthicTriangle(triangle)

            // FootA (from A to BC)
            // FootB (from B to AC) -> should be A(0,0)
            // FootC (from C to AB) -> should be A(0,0)

            expect(orthic.B).toEqual({ x: 0, y: 0 })
            expect(orthic.C).toEqual({ x: 0, y: 0 })

            // FootA should be on BC: (4,0) to (0,3). 
            // Line BC: y - 0 = (3-0)/(0-4) * (x - 4) => y = -0.75x + 3 => 3x + 4y - 12 = 0
            // Altitude from A(0,0) to 3x + 4y - 12 = 0
            // Point projection: x = 0 - 3(0+0-12)/(3^2 + 4^2) = 36/25 = 1.44
            // y = 0 - 4(0+0-12)/25 = 48/25 = 1.92
            expect(orthic.A.x).toBeCloseTo(1.44)
            expect(orthic.A.y).toBeCloseTo(1.92)
        })
    })
})
