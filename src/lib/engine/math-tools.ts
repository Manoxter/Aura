// ==========================================
// Aura Engine — Arsenal Matemático (IE & OR)
// Funções de Pesquisa Operacional para suporte à decisão gerencial
// PRD v6.1 — @aura-math squad
// ==========================================

/**
 * 1. LEC / EOQ (Lote Econômico de Compra)
 * Formula clássica de gestão de estoques para minimizar custos de setup e armazenamento.
 * D = Demanda Anual (ou do período do projeto)
 * S = Custo de Setup (por pedido)
 * H = Custo de Armazenagem Anual (por unidade)
 */
export function calculateEOQ(D: number, S: number, H: number): number {
    if (H <= 0 || D < 0 || S < 0) return 0;
    return Math.sqrt((2 * D * S) / H);
}

/**
 * 2. Teoria das Filas (M/M/1 Básica)
 * lambda = Taxa de chegada (ex: requisições por dia)
 * mu = Taxa de atendimento (ex: capacidade de processamento por dia)
 * Retorna Ocupação (rho), Num de pessoas na fila (Lq) e Tempo de Espera (Wq)
 */
export interface QueueResult {
    rho: number;
    Lq: number;
    Wq: number;
    isBottleneck: boolean;
}

export function analyzeQueueMM1(lambda: number, mu: number): QueueResult {
    if (mu <= 0) return { rho: 1, Lq: Infinity, Wq: Infinity, isBottleneck: true };

    const rho = lambda / mu;
    if (rho >= 1) {
        return { rho, Lq: Infinity, Wq: Infinity, isBottleneck: true };
    }

    const Lq = (rho * rho) / (1 - rho);
    const Wq = lambda > 0 ? Lq / lambda : 0;

    return {
        rho,
        Lq,
        Wq,
        isBottleneck: rho > 0.85 // 85% de ocupação é o limite saudável Lean
    };
}

/**
 * 3. Monte Carlo Básico (Simulação de Duração)
 * Recebe base, variância e número de iterações para prever prazos probabilísticos.
 * Usa a Transformação Box-Muller para gerar distribuição normal.
 */
export function monteCarloSimulation(baseDuration: number, variancePct: number, iterations: number = 1000): number[] {
    const results: number[] = [];
    for (let i = 0; i < iterations; i++) {
        // Normal distribution approximation (Box-Muller transform)
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

        const variation = baseDuration * (variancePct / 100);
        const result = baseDuration + (num * variation);
        results.push(Math.max(0, result)); // não existe duração negativa
    }
    return results;
}

/**
 * 4. Centro de Gravidade (Logística)
 * Localiza o ponto central ideal entre múltiplas coordenadas baseadas no peso (demanda).
 * points = [{x, y, weight}]
 */
export interface CoordWeight { x: number; y: number; weight: number }

export function calculateGravityCenter(points: CoordWeight[]): { x: number, y: number } {
    let sumWeight = 0;
    let sumX = 0;
    let sumY = 0;

    for (const p of points) {
        sumWeight += p.weight;
        sumX += p.x * p.weight;
        sumY += p.y * p.weight;
    }

    if (sumWeight === 0) return { x: 0, y: 0 };
    return { x: sumX / sumWeight, y: sumY / sumWeight };
}

/**
 * 5. Valor Monetário Esperado (VME / EMV)
 * Avalia riscos qualitativos em valores quantitativos
 * scenario = [{ probability: 0 to 1, impact: number (positivo ou negativo) }]
 */
export function calculateEMV(scenarios: { probability: number, impact: number }[]): number {
    return scenarios.reduce((acc, curr) => acc + (curr.probability * curr.impact), 0);
}
