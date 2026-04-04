import type { CDTResult } from '@/lib/engine/math'
import type { TranslatedMetrics } from '@/components/aura/MetricTranslator'

// =====================================================================
// CDT Report Data Builder — Task 9.3
// Generates self-contained HTML for browser print-to-PDF
// =====================================================================

export interface CDTReportData {
    projetoNome: string
    dataGeracao: string
    diaAtual: number
    prazoTotal: number
    orcamentoTotal: number
    cdt: CDTResult
    metrics: TranslatedMetrics
    historico?: { data: string; zona: string; qualidade: number }[]
}

// ── Color maps (explicit hex for print compatibility) ────────────────

const ZONA_COLORS: Record<string, { bg: string; text: string; border: string; fill: string }> = {
    OTIMO:  { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7', fill: '#10b981' },
    SEGURO: { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd', fill: '#3b82f6' },
    RISCO:  { bg: '#fffbeb', text: '#92400e', border: '#fcd34d', fill: '#f59e0b' },
    CRISE:  { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5', fill: '#ef4444' },
}

const QUALIDADE_COLORS: Record<string, { bg: string; text: string; fill: string }> = {
    otimo: { bg: '#ecfdf5', text: '#065f46', fill: '#10b981' },
    risco: { bg: '#fffbeb', text: '#92400e', fill: '#f59e0b' },
    crise: { bg: '#fef2f2', text: '#991b1b', fill: '#ef4444' },
    slate: { bg: '#f1f5f9', text: '#64748b', fill: '#94a3b8' },
}

// ── Formatting helpers ───────────────────────────────────────────────

function fmtCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function fmtPct(value: number | null): string {
    if (value === null) return '--'
    return `${value.toFixed(1)}%`
}

function fmtNumber(value: number, decimals = 3): string {
    return value.toFixed(decimals)
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

// ── Main builder ─────────────────────────────────────────────────────

export function buildCDTReport(data: CDTReportData): string {
    const { projetoNome, dataGeracao, diaAtual, prazoTotal, orcamentoTotal, cdt, metrics, historico } = data

    const zona = cdt.zona_mated || 'CRISE'
    const zonaColor = ZONA_COLORS[zona] || ZONA_COLORS.CRISE
    const qualColor = QUALIDADE_COLORS[metrics.qualidade_cor] || QUALIDADE_COLORS.slate
    const qualPct = metrics.qualidade_pct ?? 0
    const clampedPct = Math.max(0, Math.min(100, qualPct))
    const progressPct = Math.round((diaAtual / (prazoTotal || 1)) * 100)

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Relatorio CDT — ${escapeHtml(projetoNome)}</title>
<style>
/* ── Reset & Base ──────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #1e293b;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}
.page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 20mm 18mm;
}

/* ── Typography ────────────────────────────────────── */
h1 { font-size: 20pt; font-weight: 900; letter-spacing: -0.5px; color: #0f172a; }
h2 { font-size: 13pt; font-weight: 700; color: #334155; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
h3 { font-size: 11pt; font-weight: 700; color: #475569; margin-bottom: 6px; }
p { margin-bottom: 4px; }

/* ── Layout ────────────────────────────────────────── */
.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
.header-left { display: flex; flex-direction: column; gap: 4px; }
.header-right { text-align: right; font-size: 9pt; color: #64748b; }
.brand { font-size: 22pt; font-weight: 900; letter-spacing: -1px; color: #0f172a; text-transform: uppercase; }
.brand-sub { font-size: 9pt; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 2px; }
.projeto-nome { font-size: 16pt; font-weight: 700; color: #1e40af; margin-top: 8px; }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }

/* ── Cards ─────────────────────────────────────────── */
.card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; background: #ffffff; }
.card-label { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 6px; }
.card-value { font-size: 18pt; font-weight: 800; font-family: 'Cascadia Code', 'Fira Code', monospace; }
.card-detail { font-size: 9pt; color: #64748b; margin-top: 4px; }

/* ── Quality Gauge ─────────────────────────────────── */
.gauge-container { padding: 20px; border-radius: 10px; margin-bottom: 20px; }
.gauge-value { font-size: 36pt; font-weight: 900; font-family: 'Cascadia Code', 'Fira Code', monospace; }
.gauge-bar { height: 8px; width: 100%; background: #e2e8f0; border-radius: 4px; margin-top: 10px; overflow: hidden; }
.gauge-fill { height: 100%; border-radius: 4px; }

/* ── Zone Badge ────────────────────────────────────── */
.zone-badge {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 16px; border-radius: 20px; font-weight: 700;
    font-size: 10pt; border: 2px solid;
}
.zone-dot { width: 10px; height: 10px; border-radius: 50%; }

/* ── Triangle Sides ────────────────────────────────── */
.side-card { text-align: center; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
.side-letter { font-size: 14pt; font-weight: 900; font-family: monospace; margin-bottom: 2px; }
.side-value { font-size: 13pt; font-weight: 700; font-family: monospace; }
.side-label { font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
.side-raw { font-size: 8pt; color: #94a3b8; margin-top: 2px; }

/* ── Narrative ─────────────────────────────────────── */
.narrative { padding: 14px 16px; border-left: 4px solid; margin-bottom: 10px; border-radius: 0 6px 6px 0; background: #f8fafc; }
.narrative-icon { font-family: monospace; font-weight: 900; font-size: 11pt; margin-right: 8px; }
.narrative-cost { border-left-color: #3b82f6; }
.narrative-time { border-left-color: #8b5cf6; }
.narrative-cet { border-left-color: #10b981; }
.narrative-cet.invalid { border-left-color: #ef4444; background: #fef2f2; }

/* ── Prescription ──────────────────────────────────── */
.prescription { padding: 14px 16px; border-radius: 8px; border: 2px solid #fca5a5; background: #fef2f2; margin-bottom: 20px; }
.prescription-title { font-size: 9pt; font-weight: 800; color: #991b1b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }
.prescription-text { font-size: 10pt; color: #991b1b; }

/* ── History Table ─────────────────────────────────── */
.history-table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 10px; }
.history-table th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 700; border-bottom: 2px solid #cbd5e1; text-transform: uppercase; letter-spacing: 1px; font-size: 8pt; }
.history-table td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
.history-table tr:nth-child(even) td { background: #f8fafc; }

/* ── CEt Status ────────────────────────────────────── */
.cet-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 12px; border-radius: 12px; font-size: 9pt; font-weight: 700;
}
.cet-valid { background: #ecfdf5; color: #065f46; }
.cet-invalid { background: #fef2f2; color: #991b1b; }

/* ── MATED Info ────────────────────────────────────── */
.mated-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.mated-item { font-size: 9pt; }
.mated-label { color: #94a3b8; font-weight: 600; }
.mated-value { font-family: monospace; font-weight: 700; }

/* ── Progress Bar ──────────────────────────────────── */
.progress-bar { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-top: 6px; }
.progress-fill { height: 100%; background: #3b82f6; border-radius: 3px; }

/* ── Footer ────────────────────────────────────────── */
.footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 8pt; color: #94a3b8; }

/* ── Section divider ───────────────────────────────── */
.section { margin-bottom: 24px; }
.section-divider { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }

/* ── Print ─────────────────────────────────────────── */
@media print {
    body { background: #fff; }
    .page { width: 100%; padding: 12mm 14mm; margin: 0; }
    .no-print { display: none !important; }
    .card, .gauge-container, .narrative, .prescription, .side-card {
        break-inside: avoid;
    }
    @page {
        size: A4;
        margin: 0;
    }
}

@media screen {
    body { background: #94a3b8; }
    .page { box-shadow: 0 4px 24px rgba(0,0,0,0.15); margin: 20px auto; }
    .print-btn {
        position: fixed; top: 16px; right: 16px;
        padding: 10px 20px; background: #0f172a; color: #fff;
        border: none; border-radius: 8px; cursor: pointer;
        font-weight: 700; font-size: 10pt; z-index: 100;
    }
    .print-btn:hover { background: #1e40af; }
}
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">Imprimir / Salvar PDF</button>

<div class="page">

<!-- ── HEADER ──────────────────────────────────────── -->
<div class="header">
    <div class="header-left">
        <div class="brand">Aura v1.0</div>
        <div class="brand-sub">Relatorio CDT &mdash; Condicao de Existencia do Triangulo</div>
        <div class="projeto-nome">${escapeHtml(projetoNome)}</div>
    </div>
    <div class="header-right">
        <div><strong>Data:</strong> ${escapeHtml(dataGeracao)}</div>
        <div><strong>Dia Atual:</strong> ${diaAtual} / ${prazoTotal}</div>
        <div><strong>Orcamento:</strong> ${fmtCurrency(orcamentoTotal)}</div>
    </div>
</div>

<!-- ── PROJECT PROGRESS ───────────────────────────── -->
<div class="section">
    <div class="grid-3">
        <div class="card">
            <div class="card-label">Dia do Projeto</div>
            <div class="card-value" style="color: #1e40af;">${diaAtual}</div>
            <div class="card-detail">de ${prazoTotal} dias planejados</div>
            <div class="progress-bar"><div class="progress-fill" style="width: ${progressPct}%;"></div></div>
        </div>
        <div class="card">
            <div class="card-label">Orcamento Base</div>
            <div class="card-value" style="color: #0f172a; font-size: 14pt;">${fmtCurrency(orcamentoTotal)}</div>
            <div class="card-detail">BAC planejado</div>
        </div>
        <div class="card">
            <div class="card-label">Versao CDT</div>
            <div class="card-value" style="color: #64748b;">v${cdt.cdt_version}</div>
            <div class="card-detail">Tangentes pontuais</div>
        </div>
    </div>
</div>

<!-- ── QUALITY GAUGE ──────────────────────────────── -->
<div class="section">
    <h2>Qualidade do Projeto</h2>
    <div class="gauge-container" style="background: ${qualColor.bg}; border: 1px solid ${qualColor.fill}33;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 8pt; font-weight: 700; color: ${qualColor.text}; text-transform: uppercase; letter-spacing: 1.5px;">
                ${escapeHtml(metrics.qualidade_label)}
            </span>
            <span class="zone-badge" style="background: ${zonaColor.bg}; color: ${zonaColor.text}; border-color: ${zonaColor.border};">
                <span class="zone-dot" style="background: ${zonaColor.fill};"></span>
                ${escapeHtml(metrics.zona_label)}
            </span>
        </div>
        <div class="gauge-value" style="color: ${qualColor.text};">
            ${metrics.qualidade_pct !== null ? fmtPct(metrics.qualidade_pct) : '--'}
        </div>
        <div class="gauge-bar">
            <div class="gauge-fill" style="width: ${clampedPct}%; background: ${qualColor.fill};"></div>
        </div>
        <div style="font-size: 8pt; color: #64748b; margin-top: 6px;">
            Baseado na area do Triangulo de Qualidade (MetodoAura: A_atual / A_baseline x 100)
        </div>
    </div>
</div>

<!-- ── TRIANGLE SIDES ─────────────────────────────── -->
<div class="section">
    <h2>Lados do Triangulo CDT</h2>
    <div class="grid-3">
        <div class="side-card">
            <div class="side-letter" style="color: #10b981;">E</div>
            <div class="side-label">Escopo</div>
            <div class="side-value">${fmtNumber(cdt.lados.escopo)}</div>
            <div class="side-raw">bruto: ${fmtNumber(cdt.lados_brutos.E)}</div>
        </div>
        <div class="side-card">
            <div class="side-letter" style="color: #3b82f6;">C</div>
            <div class="side-label">Orcamento</div>
            <div class="side-value">${fmtNumber(cdt.lados.orcamento)}</div>
            <div class="side-raw">bruto: ${fmtNumber(cdt.lados_brutos.C)}</div>
        </div>
        <div class="side-card">
            <div class="side-letter" style="color: #8b5cf6;">P</div>
            <div class="side-label">Prazo</div>
            <div class="side-value">${fmtNumber(cdt.lados.prazo)}</div>
            <div class="side-raw">bruto: ${fmtNumber(cdt.lados_brutos.P)}</div>
        </div>
    </div>
</div>

<!-- ── CEt STATUS ─────────────────────────────────── -->
<div class="section">
    <h2>Condicao de Existencia (CEt)</h2>
    <div class="card">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
            <span class="cet-badge ${cdt.cet.valida ? 'cet-valid' : 'cet-invalid'}">
                ${cdt.cet.valida ? 'VALIDA' : 'VIOLADA'}
            </span>
            <span style="font-size: 9pt; color: #64748b;">
                |P - C| &lt; E &lt; P + C &rarr;
                |${fmtNumber(cdt.lados_brutos.P)} - ${fmtNumber(cdt.lados_brutos.C)}| &lt; ${fmtNumber(cdt.lados_brutos.E)} &lt; ${fmtNumber(cdt.lados_brutos.P)} + ${fmtNumber(cdt.lados_brutos.C)}
            </span>
        </div>
        <div class="mated-info">
            <div class="mated-item">
                <span class="mated-label">MATED Distancia:</span>
                <span class="mated-value">${fmtNumber(cdt.mated_distancia, 4)}</span>
            </div>
            <div class="mated-item">
                <span class="mated-label">Dentro do Ortico:</span>
                <span class="mated-value">${cdt.mated_inside_ortico ? 'Sim' : 'Nao'}</span>
            </div>
            <div class="mated-item">
                <span class="mated-label">Area CDT:</span>
                <span class="mated-value">${fmtNumber(cdt.cdt_area, 4)}</span>
            </div>
            <div class="mated-item">
                <span class="mated-label">Area Ortico:</span>
                <span class="mated-value">${fmtNumber(cdt.cdt_area_ortico, 4)}</span>
            </div>
            <div class="mated-item">
                <span class="mated-label">NVO Tipo:</span>
                <span class="mated-value">${cdt.nvo_tipo}</span>
            </div>
            <div class="mated-item">
                <span class="mated-label">Area Baseline:</span>
                <span class="mated-value">${cdt.cdt_area_baseline !== null ? fmtNumber(cdt.cdt_area_baseline, 4) : '--'}</span>
            </div>
        </div>
    </div>
</div>

<hr class="section-divider">

<!-- ── DIAGNOSTIC NARRATIVES ──────────────────────── -->
<div class="section">
    <h2>Diagnostico</h2>

    <div class="narrative narrative-cost">
        <span class="narrative-icon" style="color: #3b82f6;">$</span>
        ${escapeHtml(metrics.custo_narrativa)}
    </div>

    <div class="narrative narrative-time">
        <span class="narrative-icon" style="color: #8b5cf6;">T</span>
        ${escapeHtml(metrics.prazo_narrativa)}
    </div>

    <div class="narrative narrative-cet${cdt.cet.valida ? '' : ' invalid'}">
        <span class="narrative-icon" style="color: ${cdt.cet.valida ? '#10b981' : '#ef4444'};">E</span>
        ${escapeHtml(metrics.cet_narrativa)}
    </div>
</div>

${metrics.prescricao ? `
<!-- ── PRESCRIPTION ───────────────────────────────── -->
<div class="section">
    <div class="prescription">
        <div class="prescription-title">Prescricao</div>
        <div class="prescription-text">${escapeHtml(metrics.prescricao)}</div>
    </div>
</div>
` : ''}

${cdt.cet_projecao ? `
<!-- ── CEt PROJECTION ─────────────────────────────── -->
<div class="section">
    <h2>Projecao CEt (+5 dias)</h2>
    <div class="card">
        <div style="display: flex; align-items: center; gap: 12px;">
            <span class="cet-badge ${cdt.cet_projecao.valida_em_5dias ? 'cet-valid' : 'cet-invalid'}">
                ${cdt.cet_projecao.valida_em_5dias ? 'PROJECAO VALIDA' : 'PROJECAO VIOLADA'}
            </span>
        </div>
        <div class="mated-info" style="margin-top: 8px;">
            <div class="mated-item">
                <span class="mated-label">E proj:</span>
                <span class="mated-value">${fmtNumber(cdt.cet_projecao.E_proj)}</span>
            </div>
            <div class="mated-item">
                <span class="mated-label">C proj:</span>
                <span class="mated-value">${fmtNumber(cdt.cet_projecao.C_proj)}</span>
            </div>
            <div class="mated-item">
                <span class="mated-label">P proj:</span>
                <span class="mated-value">${fmtNumber(cdt.cet_projecao.P_proj)}</span>
            </div>
        </div>
    </div>
</div>
` : ''}

${historico && historico.length > 0 ? `
<!-- ── HISTORY ────────────────────────────────────── -->
<div class="section">
    <h2>Historico de Zonas</h2>
    <table class="history-table">
        <thead>
            <tr>
                <th>Data</th>
                <th>Zona</th>
                <th>Qualidade</th>
            </tr>
        </thead>
        <tbody>
            ${historico.map(h => {
                const hColor = ZONA_COLORS[h.zona] || ZONA_COLORS.CRISE
                return `<tr>
                    <td>${escapeHtml(h.data)}</td>
                    <td><span style="color: ${hColor.text}; font-weight: 700;">${escapeHtml(h.zona)}</span></td>
                    <td>${fmtPct(h.qualidade)}</td>
                </tr>`
            }).join('\n            ')}
        </tbody>
    </table>
</div>
` : ''}

<!-- ── FOOTER ─────────────────────────────────────── -->
<div class="footer">
    <span>Aura v1.0 &mdash; MetodoAura CDT Report</span>
    <span>Gerado em ${escapeHtml(dataGeracao)}</span>
</div>

</div><!-- .page -->

</body>
</html>`
}
