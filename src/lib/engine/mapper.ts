import { Point } from './triangle-logic'

export type ProjectDimensions = {
    totalCost: number       // e.g. 1500000 (R$)
    totalDuration: number   // e.g. 180 (Days)
}

export type CanvasDimensions = {
    width: number           // e.g. 600 (SVG width mapping)
    height: number          // e.g. 400 (SVG height mapping)
}

/**
 * Mappers to translate between Physical SVG Plane (X, Y) and Real Project Metrics (Days, R$).
 */
export class DimensionMapper {
    project: ProjectDimensions
    canvas: CanvasDimensions

    constructor(project: ProjectDimensions, canvas: CanvasDimensions) {
        this.project = project
        this.canvas = canvas
    }

    /**
     * Translates a mathematical coordinate into tangible project values.
     * X Axis -> Time (Days)
     * Y Axis -> Cost (R$)
     * 
     * Note: Depending on the geometric orientation of the starting triangle,
     * X and Y may represent different bounds. We assume standard left-to-right (time)
     * and bottom-to-top (cost) based on the bounds defined by the canvas.
     */
    toProjectValues(p: Point): { dias: number, custo: number } {
        // Prevent negative values from spilling over if point is way out of bounds
        const rawDias = (p.x / this.canvas.width) * this.project.totalDuration
        const rawCusto = (p.y / this.canvas.height) * this.project.totalCost

        return {
            dias: Math.max(0, Math.round(rawDias)),
            custo: Math.max(0, Math.round(rawCusto))
        }
    }

    /**
     * Translates human-readable metrics back into mathematical coordinates for the plotter.
     */
    toCoordinate(dias: number, custo: number): Point {
        return {
            x: (dias / this.project.totalDuration) * this.canvas.width,
            y: (custo / this.project.totalCost) * this.canvas.height
        }
    }

    /**
     * Formats currency for UI
     */
    static formatCusto(value: number): string {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    /**
     * Formats duration for UI
     */
    static formatDias(value: number): string {
        return `${value} dias`
    }
}
