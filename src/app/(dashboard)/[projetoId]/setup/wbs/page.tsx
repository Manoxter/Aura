'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Layers, Plus, Trash2, ArrowRight, Save, Info, Upload, AlertCircle, CheckCircle2, X, Pencil, Lock } from 'lucide-react'
import { EmptyState, EapEmptyIllustration } from '@/components/ui/EmptyState'
import { useProject } from '@/context/ProjectContext'
import { supabase } from '@/lib/supabase'
import { AIInsightCard } from '@/components/aura/AIInsightCard'
import { SetupStepper } from '@/components/aura/SetupStepper'
import { calculateCPMLocal, TarefaData } from '@/lib/engine/cpm'

// EAP Module — Aura 6.1

interface WBSNode {
    id: string
    nome: string
    descricao: string
    duracao?: number
    pai_id: string | null
    nivel: number
}

interface ImportedRow {
    code: string
    nome: string
    duracao: number | null
    custo: number | null
    dependencias: string[]
}


const safeGUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
    }
    // Fallback: gera UUID v4 válido para compatibilidade com tarefas.id (uuid)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
}

export default function EAPPage() {
    const { projetoId } = useParams()
    const router = useRouter()
    const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        tap, setTap,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        tarefas, setTarefas,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setOrcamentoBase,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setFuncoes,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setMarcos,
        eapCount: _eapCount, setEapCount,
        tenantId,
        custosTarefas,
        loading: contextLoading
    } = useProject()
    const [nodes, setNodes] = useState<WBSNode[]>([])
    const [dbNodes, setDbNodes] = useState<WBSNode[]>([]) // For differential sync

    // Compute EAP display codes (1, 1.1, 1.1.1) from tree position — display only, not stored
    const eapCodes = useMemo(() => {
        const codes = new Map<string, string>()
        const byParent = new Map<string | null, WBSNode[]>()
        nodes.forEach(n => {
            const key = n.pai_id ?? null
            if (!byParent.has(key)) byParent.set(key, [])
            byParent.get(key)!.push(n)
        })
        function assign(parentId: string | null, prefix: string) {
            const children = byParent.get(parentId) || []
            children.forEach((n, idx) => {
                const code = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`
                codes.set(n.id, code)
                assign(n.id, code)
            })
        }
        assign(null, '')
        return codes
    }, [nodes])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isDirty, setIsDirty] = useState(false)
    // Modo leitura — ativo quando EAP já está salva no banco (retorno ao formulário)
    const [isViewMode, setIsViewMode] = useState(false)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [msg, setMsg] = useState({ type: '', text: '' })

    const [custos, setCustos] = useState<Record<string, number>>({})
    const [exportStatus, setExportStatus] = useState<'idle' | 'success'>('idle')
    const [predecessorasMap, setPredecessorasMap] = useState<Record<string, string>>({})
    const [invalidPredCodes, setInvalidPredCodes] = useState<string[]>([])
    const [showAddModal, setShowAddModal] = useState(false)
    const [addForm, setAddForm] = useState({ code: '', nome: '', duracao: '', custo: '', predecessoras: '' })
    const [addError, setAddError] = useState('')
    // Guard: prevents useEffect from repopulating nodes after manual clear
    const eapManuallyCleared = useRef(false)
    // uncontrolled textarea — avoids re-render on every keystroke (fix 231ms block)
    const tableTextRef = useRef<HTMLTextAreaElement>(null)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const tableDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [hasTableText, setHasTableText] = useState(false)
    const _handleTableInputChange = useCallback(() => {
        if (tableDebounceRef.current) clearTimeout(tableDebounceRef.current)
        tableDebounceRef.current = setTimeout(() => {
            setHasTableText((tableTextRef.current?.value.trim().length ?? 0) >= 5)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        }, 150)
    }, [])
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [importedRows, setImportedRows] = useState<ImportedRow[]>([])

    const leafNodes = useMemo(() =>
        nodes.filter(n => !nodes.some(child => child.pai_id === n.id)),
        [nodes]
    )
    const totalCusto = useMemo(() =>
        leafNodes.reduce((sum, n) => sum + (custos[n.id] || 0), 0),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        [leafNodes, custos]
    )

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const codeToNodeId = useMemo(() => {
        const map = new Map<string, string>()
        eapCodes.forEach((code, nodeId) => map.set(code, nodeId))
        return map
    }, [eapCodes])

    // Sum of custos for all leaf descendants of each node
    const descendantCostMap = useMemo(() => {
        const map = new Map<string, number>()
        function calc(nodeId: string): number {
            const children = nodes.filter(n => n.pai_id === nodeId)
            if (children.length === 0) {
                const v = custos[nodeId] || 0
                map.set(nodeId, v)
                return v
            }
            const total = children.reduce((sum, c) => sum + calc(c.id), 0)
            map.set(nodeId, total)
            return total
        }
        nodes.filter(n => n.pai_id === null).forEach(n => calc(n.id))
        return map
    }, [nodes, custos])

    const [showBulkModal, setShowBulkModal] = useState(false)
    const [bulkText, setBulkText] = useState('')
    const [bulkReplaceMode, setBulkReplaceMode] = useState<'replace' | 'append'>('replace')
    const [tablePreview, setTablePreview] = useState<{ header: string[]; rows: string[][] } | null>(null)
    const [colCodigo, setColCodigo] = useState<number | null>(null)
    const [colNome, setColNome] = useState<number>(0)
    const [colDuracao, setColDuracao] = useState<number | null>(null)
    const [colCusto, setColCusto] = useState<number | null>(null)
    const [colPred, setColPred] = useState<number | null>(null)
    const [colOtimista, setColOtimista] = useState<number | null>(null)
    const [colProvavel, setColProvavel] = useState<number | null>(null)
    const [colPessimista, setColPessimista] = useState<number | null>(null)
    const [colEs, setColEs] = useState<number | null>(null)
    const [colEf, setColEf] = useState<number | null>(null)
    const [colLs, setColLs] = useState<number | null>(null)
    const [colLf, setColLf] = useState<number | null>(null)
    const [colFolga, setColFolga] = useState<number | null>(null)
    const [pertValues, setPertValues] = useState<Record<string, { o: number; m: number; p: number }>>({})
    const [scheduledValues, setScheduledValues] = useState<Record<string, { es: number; ef: number; ls: number; lf: number; folga: number }>>({})


    // Load persisted costs from localStorage
    useEffect(() => {
        if (!projetoId) return
        const stored = localStorage.getItem(`aura_eap_custos_${projetoId}`)
        if (stored) {
            try { setCustos(JSON.parse(stored)) } catch {}
        }
    }, [projetoId])

    // Load predecessoras map from localStorage
    useEffect(() => {
        if (!projetoId) return
        const stored = localStorage.getItem(`aura_eap_pred_${projetoId}`)
        if (stored) {
            try { setPredecessorasMap(JSON.parse(stored)) } catch {}
        }
    }, [projetoId])

    // Persist predecessorasMap to localStorage whenever it changes
    useEffect(() => {
        if (!projetoId || Object.keys(predecessorasMap).length === 0) return
        localStorage.setItem(`aura_eap_pred_${projetoId}`, JSON.stringify(predecessorasMap))
    }, [predecessorasMap, projetoId])

    // WBS-02: Persist custos to localStorage whenever they change
    useEffect(() => {
        if (!projetoId || Object.keys(custos).length === 0) return
        localStorage.setItem(`aura_eap_custos_${projetoId}`, JSON.stringify(custos))
    }, [custos, projetoId])

    const formatCostShort = (n: number): string => {
        if (n >= 1e9) return `US$${(n / 1e9).toFixed(1)}B`
        if (n >= 1e6) return `US$${(n / 1e6).toFixed(0)}M`
        if (n >= 1e3) return `R$${(n / 1e3).toFixed(0)}k`
        return `R$${n}`
    }

    const handleExportar = async () => {
        setExportStatus('success')
        await handleSaveStructure()

        // Build CPM-ready export — usa UUID como id para evitar desalinhamento com tarefas no DB
        const leafNodes = nodes.filter(n => !nodes.some(child => child.pai_id === n.id))
        // Mapa T-code → UUID para resolver predecessoras residuais ainda em T-code
        const exportCodeToId = new Map<string, string>()
        nodes.forEach(n => {
            const code = eapCodes.get(n.id)
            if (code) {
                exportCodeToId.set(`T${code}`, n.id)
                exportCodeToId.set(code, n.id)
            }
        })
        const isUUIDExport = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
        const tasks = leafNodes.map(n => {
            const code = eapCodes.get(n.id)
            const rawPreds = predecessorasMap[n.id] || ''
            const preds = rawPreds
                .split(/[;,\s]+/)
                .map((s: string) => s.trim())
                .filter(Boolean)
                .map((p: string) => isUUIDExport(p) ? p : (exportCodeToId.get(p) ?? exportCodeToId.get(p.replace(/^T/i, '')) ?? p))
                .filter(isUUIDExport)
            // WBS-07: fallback to context custosTarefas if local custos is empty
            return { id: n.id, tCode: code ? `T${code}` : null, nome: n.nome, duracao_estimada: n.duracao || 1, dependencias: preds, custo: custos[n.id] || custosTarefas[n.id] || 0 }
        })

        // Non-leaf nodes for CPM grouping display
        const leafIds = new Set(leafNodes.map(n => n.id))
        const groups: Record<string, string> = {}
        nodes.filter(n => !leafIds.has(n.id)).forEach(n => {
            const code = eapCodes.get(n.id)
            if (code) groups[`T${code}`] = n.nome
        })

        try {
            localStorage.setItem(`aura_wbs_export_${projetoId}`, JSON.stringify({ tasks, groups }))
        } catch {}

        setTimeout(() => {
            setExportStatus('idle')
            router.push(`/${projetoId as string}/setup/cpm`)
        }, 800)
    }

    const parseImportTable = (text: string): ImportedRow[] | null => {
        const parsed = parseTableText(text)
        if (!parsed) return null

        // Limpa marcadores markdown (bold, italic) de células
        const cleanCell = (s: string) => s.replace(/\*\*/g, '').replace(/\*/g, '').trim()

        const { header, rows } = parsed
        const cleanRows = rows.map(r => r.map(cleanCell))
        const h = header.map(s => cleanCell(s).toLowerCase())

        // ── Detecção por header (regex ampliado) ──────────────────────────────
        const codeIdx  = h.findIndex(s => /c[oó]d|^id$|^code|^wbs|^n[°º]|^num|^#|^t[0-9]/.test(s))
        const nomeIdx  = h.findIndex(s => /pacote|nome|task|tarefa|work|atividade|descri/.test(s))
        const durIdx   = h.findIndex(s => /dura|dias|days|tempo|prazo|month|semana/.test(s))
        const custoIdx = h.findIndex(s => /custo|cost|valor|budget|us\$|r\$|brl|\$|orçament/.test(s))
        const depIdx   = h.findIndex(s => /depend|pred|anterior|requisit|preced/.test(s))

        // ── Detecção por conteúdo (fallback quando header não reconhecido) ────
        const isTCode = (v: string) => /^T?\d+(\.\d+)*$/.test(v.trim())
        const isNumber = (v: string) => /^\d[\d.,]*$/.test(v.trim())
        const isLargeNum = (v: string) => {
            const n = parseFloat(v.replace(/[.,]/g, ''))
            return !isNaN(n) && n > 999
        }
        const isPredList = (v: string) => /^T?\d+(\.\d+)*([;,\s]+T?\d+(\.\d+)*)*$/.test(v.trim())

        const scoreCol = (colIdx: number, scoreFn: (v: string) => boolean) => {
            const vals = cleanRows.map(r => r[colIdx] || '').filter(v => v.length > 0)
            if (vals.length === 0) return 0
            return vals.filter(scoreFn).length / vals.length
        }

        const ncols = Math.max(header.length, ...cleanRows.map(r => r.length))
        const colIndices = Array.from({ length: ncols }, (_, i) => i)

        // Resolve cada coluna: header primeiro, conteúdo como desempate
        const resolveIdx = (headerIdx: number, contentScoreFn: (v: string) => boolean, exclude: number[]) => {
            if (headerIdx >= 0) return headerIdx
            const best = colIndices
                .filter(i => !exclude.includes(i))
                .map(i => ({ i, score: scoreCol(i, contentScoreFn) }))
                .sort((a, b) => b.score - a.score)
            return best[0]?.score > 0.6 ? best[0].i : -1
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const resolvedCode = resolveIdx(codeIdx, isTCode, [])
        const resolvedNome = resolveIdx(nomeIdx, v => v.length > 3 && !isTCode(v) && !isNumber(v), [resolvedCode])
        const resolvedDur  = resolveIdx(durIdx,  v => isNumber(v) && !isLargeNum(v), [resolvedCode, resolvedNome])
        const resolvedCusto = resolveIdx(custoIdx, isLargeNum, [resolvedCode, resolvedNome, resolvedDur])
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const resolvedDep  = resolveIdx(depIdx,  isPredList, [resolvedCode, resolvedNome, resolvedDur, resolvedCusto])

        if (resolvedCode < 0 || resolvedNome < 0) return null

        // ── parseCusto: todos os formatos de custo reconhecidos ──────────────────
        // Suportados: 58M · 58B · 58K · R$ 58.000.000,00 · US$58M · $58000000
        //             58000000 · 58.000.000 · 58000000,00 · 58,000,000.00
        const parseCusto = (raw: string): number | null => {
            if (!raw || /^[-—]$/.test(raw.trim())) return null
            // Remove prefixos de moeda (R$, US$, $, €, £)
            const s = raw.trim().replace(/^(?:R\$|US\$|\$|€|£)\s*/i, '').trim()
            if (!s) return null

            // Sufixo de escala B/M/K (maiúsculo ou minúsculo)
            const sfx = s.match(/^([\d.,]+)\s*([BbMmKk])$/)
            if (sfx) {
                const mult = ({ b:1e9, m:1e6, k:1e3 } as Record<string,number>)[sfx[2].toLowerCase()] ?? 1
                const num = sfx[1]
                const euro = (num.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(num)
                const norm = euro ? num.replace(/\./g, '').replace(',', '.') : num.replace(/,/g, '')
                const n = parseFloat(norm)
                return isNaN(n) ? null : n * mult
            }

            // Número puro — detecta separador de milhar vs decimal
            // Europeu: 58.000.000 · 58.000.000,00 · 58000000,00
            // Anglo:   58,000,000 · 58,000,000.00
            const dots  = (s.match(/\./g) || []).length
            const commas = (s.match(/,/g)  || []).length
            let norm: string
            if (dots > 1 || (dots === 1 && /\.\d{3}(,\d+)?$/.test(s))) {
                // Ponto = separador de milhar, vírgula = decimal
                norm = s.replace(/\./g, '').replace(',', '.')
            } else if (commas > 1 || (commas === 1 && /,\d{3}(\.\d+)?$/.test(s))) {
                // Vírgula = separador de milhar, ponto = decimal
                norm = s.replace(/,/g, '')
            } else if (commas === 1 && /,\d{1,2}$/.test(s)) {
                // Vírgula decimal final (ex: 58000000,00)
                norm = s.replace(',', '.')
            } else {
                norm = s.replace(/,/g, '')
            }
            const n = parseFloat(norm.replace(/[^0-9.]/g, ''))
            return isNaN(n) ? null : n
        }

        // ── parseDuracao: extrai dias de formatos como "60", "60d", "60 dias" ──
        const parseDuracao = (raw: string): number | null => {
            const m = raw.trim().match(/^(\d+)/)
            if (!m) return null
            const n = parseInt(m[1], 10)
            return isNaN(n) ? null : n
        }

        // ── Classificadores por conteúdo ──────────────────────────────────────
        // Regras:
        //   isCostCell: prefixo de moeda OU sufixo B/M/K (MAIÚSCULO) OU número > 9999
        //   isDurCell : inteiro ≤9999 OU número + unidade (d/dias/days/m/meses/months…)
        //   Nota: "60M" (maiúsculo) → custo; "60m"/"60 meses"/"60 dias" → duração
        //   Custo é avaliado ANTES de duração para evitar que "58M" vire duração.
        const isSingleCode = (v: string) => /^T?\d+(\.\d+)*$/.test(v.trim())
        const isPredCell   = (v: string) => {
            const s = v.trim()
            // Separados por vírgula ou ponto-e-vírgula: "T1.1,T1.2" ou "T1.1; T1.2"
            if (/^T?\d+(\.\d+)*([;,]\s*T?\d+(\.\d+)*)+$/.test(s)) return true
            // Separados por espaço: TODOS os tokens devem ser T-codes com nível (T1.2, 1.2) ou T+dígito (T1)
            const parts = s.split(/\s+/)
            if (parts.length >= 2) {
                const isTCode = (p: string) => /^T\d+(\.\d+)*$/.test(p) || /^\d+\.\d+(\.\d+)*$/.test(p)
                if (parts.every(isTCode)) return true
            }
            return false
        }
        const isCostCell   = (v: string) => {
            const s = v.trim()
            if (/^(?:R\$|US\$|\$|€|£)\s*\d/.test(s)) return true          // prefixo de moeda
            if (/^\d[\d.,]*\s*[MBK]$/.test(s)) return true                 // sufixo MAIÚSCULO M/B/K
            const stripped = s.replace(/^(?:R\$|US\$|\$|€|£)\s*/, '').replace(/[.,\s]/g, '')
            const n = parseFloat(stripped)
            return !isNaN(n) && n > 9999                                    // número grande sem sufixo
        }
        const isDurCell = (v: string) => {
            const s = v.trim()
            if (/^\d{1,4}$/.test(s)) return true  // inteiro puro ≤9999
            // número + unidade temporal (lowercase m = meses é duração, não milhão)
            return /^\d+\s*(?:d(?:ias?|ays?)?|m(?:eses?|onths?)?|semanas?|weeks?|h(?:oras?|ours?)?)$/i.test(s)
        }

        return cleanRows
            .filter(row => row.some(c => c.trim()))
            .map(row => {
                let code = '', duracao: number | null = null, custo: number | null = null
                const preds: string[] = []
                const nomeParts: string[] = []

                for (const cell of row) {
                    const v = cell.trim()
                    if (!v || /^[-—\s]+$/.test(v)) continue
                    if (isPredCell(v)) {
                        preds.push(...v.split(/[;,\s]+/).map((s: string) => s.trim()).filter(Boolean))
                        continue
                    }
                    if (!code && isSingleCode(v)) { code = v; continue }
                    if (custo === null && isCostCell(v)) { custo = parseCusto(v); continue }
                    if (duracao === null && isDurCell(v)) { duracao = parseDuracao(v); continue }
                    if (isSingleCode(v) && code) { preds.push(v); continue }
                    nomeParts.push(v)
                }
                const nome = nomeParts.join(' ').trim()
                return { code, nome, duracao, custo, dependencias: preds }
            })
            .filter(row => row.code && row.nome)
    }

    // ── Smart Insert ─────────────────────────────────────────────────────────
    function getSubtreeLastIndex(nodesList: WBSNode[], nodeId: string): number {
        const idx = nodesList.findIndex(n => n.id === nodeId)
        if (idx === -1) return -1
        const descendantIds = new Set<string>()
        function collectDesc(id: string) {
            nodesList.forEach(n => { if (n.pai_id === id) { descendantIds.add(n.id); collectDesc(n.id) } })
        }
        collectDesc(nodeId)
        if (descendantIds.size === 0) return idx
        let last = idx
        nodesList.forEach((n, i) => { if (descendantIds.has(n.id)) last = Math.max(last, i) })
        return last
    }

    const handleSmartInsert = () => {
        const raw = addForm.code.trim().replace(/^T/i, '')
        const parts = raw.split('.').filter(Boolean)
        if (parts.length === 0 || parts.some(p => isNaN(Number(p)))) {
            setAddError('Código inválido. Use T1, T2.1, T2.2.1 etc.')
            return
        }
        if (!addForm.nome.trim()) { setAddError('Nome é obrigatório.'); return }
        const duracao = parseInt(addForm.duracao) || undefined
        const custo = parseFloat(addForm.custo) || 0
        const newId = safeGUID()
        const newNode: WBSNode = { id: newId, nome: addForm.nome.trim(), descricao: '', duracao, pai_id: null, nivel: parts.length }
        const newNodes = [...nodes]

        if (parts.length === 1) {
            const rootNodes = newNodes.filter(n => n.pai_id === null)
            const pos = parseInt(parts[0])
            newNode.nivel = 1
            if (pos <= rootNodes.length) {
                const insertIdx = newNodes.findIndex(n => n.id === rootNodes[pos - 1].id)
                newNodes.splice(insertIdx, 0, newNode)
            } else {
                const last = rootNodes[rootNodes.length - 1]
                const endIdx = last ? getSubtreeLastIndex(newNodes, last.id) : -1
                newNodes.splice(endIdx + 1, 0, newNode)
            }
        } else {
            const parentCode = parts.slice(0, -1).join('.')
            const parentId = Array.from(eapCodes.entries()).find(([, c]) => c === parentCode)?.[0]
            if (!parentId) { setAddError(`Nó pai T${parentCode} não encontrado. Crie-o primeiro.`); return }
            const parent = newNodes.find(n => n.id === parentId)!
            newNode.pai_id = parentId
            newNode.nivel = parent.nivel + 1
            const children = newNodes.filter(n => n.pai_id === parentId)
            const pos = parseInt(parts[parts.length - 1])
            if (children.length > 0 && pos <= children.length) {
                const insertIdx = newNodes.findIndex(n => n.id === children[pos - 1].id)
                newNodes.splice(insertIdx, 0, newNode)
            } else if (children.length > 0) {
                const endIdx = getSubtreeLastIndex(newNodes, children[children.length - 1].id)
                newNodes.splice(endIdx + 1, 0, newNode)
            } else {
                const parentIdx = newNodes.findIndex(n => n.id === parentId)
                newNodes.splice(parentIdx + 1, 0, newNode)
            }
        }

        setNodes(newNodes)
        if (custo > 0) setCustos(prev => ({ ...prev, [newId]: custo }))
        if (addForm.predecessoras.trim()) setPredecessorasMap(prev => ({ ...prev, [newId]: addForm.predecessoras.trim() }))
        setIsDirty(true)
        setSaveStatus('idle')
        setShowAddModal(false)
        setAddForm({ code: '', nome: '', duracao: '', custo: '', predecessoras: '' })
        setAddError('')
    }

    // 1. Load existing EAP or fallback to tasks
    useEffect(() => {
        if (projetoId) {
            loadEAP()
        }
    }, [projetoId])

    // Unified Parser for WBS Hierarchy (V6.3 Centralized)
    const handleParse = async (lines: string[]): Promise<WBSNode[]> => {
        const { wbsExtractor } = await import('@/lib/engine/extractors')
        const drafts = wbsExtractor(lines.join('\n'))
        return drafts.map(d => ({
            id: d.id,
            nome: d.nome,
            descricao: '',
            duracao: d.duracao,
            pai_id: d.pai_id,
            nivel: d.nivel
        }))
    }

    // 2. Sync nodes if eap_nodes is empty but tasks are available (Cascata TAP)
    useEffect(() => {
        const isCorrectProject = tap?.projeto_id === projetoId

        if (!loading && isCorrectProject && nodes.length === 0 && tarefas.length > 0 && !eapManuallyCleared.current) {
            const taskLines = tarefas.map(t => t.nome)
            handleParse(taskLines).then(initialNodes => {
                setNodes(initialNodes)
            })
        }
    }, [tarefas, loading, nodes.length, projetoId, tap?.projeto_id])

    async function loadEAP() {
        setLoading(true)
        // 1. Try LocalStorage First (Quick Load)
        const localKey = `aura_eap_draft_${projetoId}`
        const localDraft = localStorage.getItem(localKey)
        if (localDraft) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const parsed = JSON.parse(localDraft)
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setNodes(parsed)
                    setIsDirty(true) // Mark as dirty since it's local
                }
            } catch (_e) {
                console.warn('[EAP] Erro ao ler rascunho local.')
            }
        }

        try {
            const { data, error } = await supabase
                .from('eap_nodes')
                .select('*')
                .eq('projeto_id', projetoId)
                .order('posicao', { ascending: true })
                .order('criado_em', { ascending: true })

            if (error) throw error

            if (data && data.length > 0) {
                setNodes(data)
                setDbNodes(data) // Reference for diff
                setIsDirty(false)
                // WBS sempre em modo edição — modo leitura removido (regressão RFN-sprint-1)
                localStorage.removeItem(localKey) // Cloud is source of truth now
            } else if (!localDraft) {
                setNodes([])
                setDbNodes([])
            }

            // WBS-05: Restaura predecessorasMap a partir de tarefas.predecessoras se localStorage vazio
            const storedPred = localStorage.getItem(`aura_eap_pred_${projetoId}`)
            if (!storedPred) {
                const { data: dbTarefas } = await supabase
                    .from('tarefas')
                    .select('id, predecessoras')
                    .eq('projeto_id', projetoId)
                if (dbTarefas) {
                    const rebuilt: Record<string, string> = {}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    dbTarefas.forEach((t: any) => {
                        if (t.predecessoras && t.predecessoras.length > 0) {
                            rebuilt[t.id] = (t.predecessoras as string[]).join(';')
                        }
                    })
                    if (Object.keys(rebuilt).length > 0) {
                        setPredecessorasMap(rebuilt)
                    }
                }
            }
        } catch (err) {
            console.error('[EAP] Erro fatal ao carregar:', err)
            setMsg({ type: 'error', text: 'Erro ao carregar estrutura do projeto. Verifique a conexão.' })
        } finally {
            setLoading(false)
        }
    }

    // ── Smart Table Parser ────────────────────────────────────────────────
    // Aceita: Markdown (|), TSV (\t), CSV (,), espaços múltiplos (PDF/Word), WBS simples
    const parseTableText = (text: string): { header: string[]; rows: string[][] } | null => {
        // Para espaço-alinhado precisamos das linhas RAW (sem trim) para extração posicional
        const rawLines = text.split('\n').filter(l => l.trim().length > 0)
        const lines = rawLines.map(l => l.trim()).filter(l => l.length > 0)
        if (lines.length < 1) return null

        // Detecta formatos estruturados
        const isPipe = lines.filter(l => l.includes('|')).length > lines.length / 2
        const isTSV = lines.filter(l => l.includes('\t')).length > lines.length / 2
        // Espaço-alinhado: 40%+ das linhas têm 2+ espaços consecutivos (PDF/Word)
        const isSpaceAligned = !isPipe && !isTSV &&
            lines.filter(l => /\S+\s{2,}\S+/.test(l)).length >= Math.max(1, lines.length * 0.4)

        let header: string[] = []
        let dataRows: string[][] = []

        if (isPipe) {
            // Markdown: filtra separadores |---|, |:---:|, |---:|, |===| etc.
            // Verifica célula a célula para maior robustez
            const isSepRow = (l: string) => l.includes('|') && l.split('|').every(cell => /^[\s\-:=]*$/.test(cell))
            const validLines = lines.filter(l => !isSepRow(l))
            if (validLines.length < 2) return null
            const split = (l: string) => l.split('|').map(c => c.trim()).filter(Boolean)
            header = split(validLines[0])
            dataRows = validLines.slice(1).map(split).filter(r => r.length > 0)
        } else if (isTSV) {
            const split = (l: string) => l.split('\t').map(c => c.trim())
            header = split(lines[0])
            dataRows = lines.slice(1).map(split)
        } else if (isSpaceAligned) {
            // Extração POSICIONAL: localiza onde cada coluna começa no header e fatia
            // as linhas de dados nessas posições — preserva células vazias (ex: Predecessoras)
            const headerRaw = rawLines.find(l => l.trim() === lines[0]) ?? lines[0]
            const colStarts: number[] = []
            let inWord = false
            for (let ci = 0; ci < headerRaw.length; ci++) {
                if (headerRaw[ci] !== ' ' && !inWord) { colStarts.push(ci); inWord = true }
                else if (headerRaw[ci] === ' ') inWord = false
            }
            if (colStarts.length < 2) return null
            header = colStarts.map((start, idx) => {
                const end = idx < colStarts.length - 1 ? colStarts[idx + 1] : headerRaw.length
                return headerRaw.substring(start, end).trim()
            }).filter(Boolean)
            // Para dados, usa rawLines (sem trim) para manter posições corretas
            const dataRawLines = rawLines.filter(l => l.trim() !== lines[0] && l.trim().length > 0)
            dataRows = dataRawLines.map(line => {
                return colStarts.map((start, idx) => {
                    const end = idx < colStarts.length - 1 ? colStarts[idx + 1] : line.length
                    return line.length > start ? line.substring(start, end).trim() : ''
                })
            }).filter(r => r.some(v => v))
        } else {
            // Tenta CSV primeiro
            const splitCsv = (l: string) => l.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
            const csvCols = splitCsv(lines[0]).length
            if (csvCols >= 2) {
                header = splitCsv(lines[0])
                dataRows = lines.slice(1).map(splitCsv)
            } else {
                // Fallback: WBS simples — "CÓDIGO NOME [duração] [custo]" por linha
                // Permite colar direto da documentação sem formatação de tabela
                const wbsLineRe = /^([A-Z](?:\.\d+)*\.?|\d+(?:\.\d+)*)\.?\s+(.+)$/i
                const parsed = lines
                    .map(l => {
                        const m = l.match(wbsLineRe)
                        if (!m) return null
                        const code = m[1].replace(/\.$/, '')
                        const rest = m[2].trim()
                        const custoM = rest.match(/(?:US\$|R\$|\$)?\s*([\d.]+)\s*([BbMmKk])\s*$/)
                        const durM = rest.match(/(\d+)\s*(?:m(?:eses?)?|d(?:ias?)?)(?:\s|$)/i)
                        const nome = rest
                            .replace(/(?:US\$|R\$|\$)?\s*[\d.]+\s*[BbMmKk]\s*$/, '')
                            .replace(/\d+\s*(?:m(?:eses?)?|d(?:ias?)?)(?:\s|$)/i, '')
                            .trim()
                        const custoRaw = custoM ? parseFloat(custoM[1]) * ({'b':1e9,'m':1e6,'k':1e3}[custoM[2].toLowerCase() as 'b'|'m'|'k'] || 1) : null
                        const durRaw = durM ? durM[1] : null
                        return [code, nome || rest, durRaw || '', custoRaw ? String(custoRaw) : '']
                    })
                    .filter(Boolean) as string[][]
                if (parsed.length === 0) return null
                header = ['Cód.', 'Pacote de Trabalho', 'Duração', 'Custo']
                dataRows = parsed
            }
        }

        if (header.length < 1 || dataRows.length === 0) return null
        return { header, rows: dataRows }
    }

    const autoDetectColumns = (header: string[]) => {
        const clean = (s: string) => s.replace(/\*\*/g, '').replace(/\*/g, '').trim()
        const h = header.map(s => clean(s).toLowerCase())
        const codigoIdx = h.findIndex(s => /c[oó]d|^id$|^code|^wbs|^n[°º]|^num|^#/.test(s))
        const nomeIdx   = h.findIndex(s => /pacote|nome|task|tarefa|work|atividade|descri/.test(s))
        const durIdx    = h.findIndex(s => /dura|dias|days|tempo|prazo|month|semana/.test(s))
        const custoIdx  = h.findIndex(s => /custo|cost|valor|budget|us\$|r\$|brl|\$|orçament/.test(s))
        const predIdx   = h.findIndex(s => /depend|pred|anterior|requisit|preced/.test(s))
        const otimIdx   = h.findIndex(s => /otim|optim|melhor/.test(s))
        const provaIdx  = h.findIndex(s => /prov[aá]vel|prov[^i]|modal/.test(s))
        const pessIdx   = h.findIndex(s => /pess|pessim|pior/.test(s))
        const esIdx     = h.findIndex(s => /^es$|^i\.cedo$|^inicio.cedo|early.?start/.test(s))
        const efIdx     = h.findIndex(s => /^ef$|^f\.cedo$|^fim.cedo|early.?finish/.test(s))
        const lsIdx     = h.findIndex(s => /^ls$|^i\.tarde$|^inicio.tarde|late.?start/.test(s))
        const lfIdx     = h.findIndex(s => /^lf$|^f\.tarde$|^fim.tarde|late.?finish/.test(s))
        const folgaIdx  = h.findIndex(s => /^folga|^slack|^float|^holgura/.test(s))
        setColCodigo(codigoIdx >= 0 ? codigoIdx : null)
        setColNome(nomeIdx >= 0 ? nomeIdx : codigoIdx >= 0 ? 1 : 0)
        setColDuracao(durIdx >= 0 ? durIdx : null)
        setColCusto(custoIdx >= 0 ? custoIdx : null)
        setColPred(predIdx >= 0 ? predIdx : null)
        setColOtimista(otimIdx >= 0 ? otimIdx : null)
        setColProvavel(provaIdx >= 0 ? provaIdx : null)
        setColPessimista(pessIdx >= 0 ? pessIdx : null)
        setColEs(esIdx >= 0 ? esIdx : null)
        setColEf(efIdx >= 0 ? efIdx : null)
        setColLs(lsIdx >= 0 ? lsIdx : null)
        setColLf(lfIdx >= 0 ? lfIdx : null)
        setColFolga(folgaIdx >= 0 ? folgaIdx : null)
    }

    const handleBulkTextChange = (text: string) => {
        setBulkText(text)
        const parsed = parseTableText(text)
        setTablePreview(parsed)
        if (parsed) autoDetectColumns(parsed.header)
    }

    const handleBulkImport = async () => {
        if (tablePreview) {
            // Modo Tabela: usa parseImportTable (classificação inteligente por célula)
            // cobre tabelas desalinhadas, espaço-alinhadas e markdown
            const smartRows = parseImportTable(bulkText)

            const codeToId = new Map<string, string>()
            const importedNodes: WBSNode[] = []
            const newCustos: Record<string, number> = {}
            const newPred: Record<string, string> = {}
            const newPertValues: Record<string, { o: number; m: number; p: number }> = {}
            const newScheduledValues: Record<string, { es: number; ef: number; ls: number; lf: number; folga: number }> = {}

            // Quando colunas de cronograma (ES/EF/LS/LF) ou PERT são detectadas,
            // o smartRows não sabe extraí-las e joga os valores em dependencias.
            // Nesses casos forçamos o caminho tablePreview que usa índices precisos.
            const hasAdvancedCols = colEs !== null || colEf !== null || colLs !== null || colLf !== null
                || colOtimista !== null || colProvavel !== null || colPessimista !== null

            const sourceRows: Array<{ nome: string; rawCode: string; dur: number; custo: number; predRaw: string; otim: number; prova: number; pess: number; es: number; ef: number; ls: number; lf: number; folga: number }> =
                (!hasAdvancedCols && smartRows && smartRows.length > 0)
                    ? smartRows.map(r => ({
                          nome: r.nome,
                          rawCode: r.code,
                          dur: r.duracao ?? 0,
                          custo: r.custo ?? 0,
                          predRaw: r.dependencias.join(';'),
                          otim: 0, prova: 0, pess: 0,
                          es: 0, ef: 0, ls: 0, lf: 0, folga: 0,
                      }))
                    : tablePreview.rows
                          .filter(row => row[colNome]?.trim())
                          .map(row => {
                              const otim = colOtimista !== null ? (parseFloat(row[colOtimista] || '0') || 0) : 0
                              const prova = colProvavel !== null ? (parseFloat(row[colProvavel] || '0') || 0) : 0
                              const pess = colPessimista !== null ? (parseFloat(row[colPessimista] || '0') || 0) : 0
                              const hasPert = otim > 0 || prova > 0 || pess > 0
                              const pertDur = hasPert ? (otim + 4 * prova + pess) / 6 : 0
                              const baseDur = colDuracao !== null ? (parseInt(row[colDuracao] || '0') || 0) : 0
                              return {
                                  nome: row[colNome]?.trim() || '',
                                  rawCode: colCodigo !== null ? (row[colCodigo]?.trim() || '') : '',
                                  dur: hasPert ? pertDur : baseDur,
                                  custo: colCusto !== null ? (parseFloat(row[colCusto] || '0') || 0) : 0,
                                  predRaw: colPred !== null ? (row[colPred]?.trim() || '') : '',
                                  otim, prova, pess,
                                  es:    colEs    !== null ? (parseFloat(row[colEs]    || '0') || 0) : 0,
                                  ef:    colEf    !== null ? (parseFloat(row[colEf]    || '0') || 0) : 0,
                                  ls:    colLs    !== null ? (parseFloat(row[colLs]    || '0') || 0) : 0,
                                  lf:    colLf    !== null ? (parseFloat(row[colLf]    || '0') || 0) : 0,
                                  folga: colFolga !== null ? (parseFloat(row[colFolga] || '0') || 0) : 0,
                              }
                          })

            // FIX-D2: ordena por código EAP numericamente antes de processar hierarquia
            // Garante que pais sempre existam no codeToId antes dos filhos
            sourceRows.sort((a, b) =>
                a.rawCode.replace(/^T/i, '').localeCompare(
                    b.rawCode.replace(/^T/i, ''),
                    undefined,
                    { numeric: true }
                )
            )

            sourceRows.forEach(({ nome, rawCode, dur, custo, predRaw, otim, prova, pess, es, ef, ls, lf, folga }) => {
                    // Deriva hierarquia do código T1.2.3 ou 1.2.3
                    const normalized = rawCode.replace(/^T/i, '')
                    const parts = normalized.split('.').filter(Boolean)
                    const nivel = parts.length > 0 ? parts.length : 1

                    let paiId: string | null = null
                    if (parts.length > 1) {
                        const parentRaw = rawCode.replace(/^(T?)(\d+(?:\.\d+)*)\.\d+$/i, '$1$2')
                        paiId = codeToId.get(parentRaw) ?? codeToId.get(parentRaw.replace(/^T/i, '')) ?? null
                    }

                    const nodeId = safeGUID()
                    if (rawCode) {
                        codeToId.set(rawCode, nodeId)
                        // Armazena também variação sem/com prefixo T para resolver qualquer formato
                        const strippedCode = rawCode.replace(/^T/i, '')
                        if (strippedCode !== rawCode) codeToId.set(strippedCode, nodeId)
                        else codeToId.set('T' + rawCode, nodeId)
                    }
                    // Store raw T-code predecessoras — resolved to UUIDs in second pass below
                    if (predRaw && predRaw !== '-' && predRaw !== '—') {
                        newPred[nodeId] = predRaw
                    }

                    importedNodes.push({
                        id: nodeId,
                        nome,
                        descricao: '',
                        duracao: dur > 0 ? dur : undefined,
                        pai_id: paiId,
                        nivel,
                    })
                    if (custo > 0) newCustos[nodeId] = custo
                    if (otim > 0 || prova > 0 || pess > 0) newPertValues[nodeId] = { o: otim, m: prova, p: pess }
                    if (es > 0 || ef > 0 || ls > 0 || lf > 0) newScheduledValues[nodeId] = { es, ef, ls, lf, folga }
                })

            // Segunda passagem: resolve T-codes em newPred para UUIDs usando codeToId
            // Tenta todas as variações: "T1", "1", e "T" + stripped — garante resolução robusta
            Object.keys(newPred).forEach(nodeId => {
                const raw = newPred[nodeId]
                const resolved = raw
                    .split(/[;,\s]+/)
                    .map((p: string) => p.trim())
                    .filter(Boolean)
                    .map((p: string) => {
                        const stripped = p.replace(/^T/i, '')
                        return codeToId.get(p) ??           // "T1.2" ou "1.2" como está
                               codeToId.get(stripped) ??    // sem prefixo T: "1.2"
                               codeToId.get('T' + stripped) ?? // com prefixo T: "T1.2"
                               p                            // fallback: mantém original
                    })
                    .join(';')
                newPred[nodeId] = resolved
            })

            // FIX-D3: valida T-codes de predecessoras contra knownEapCodes
            const knownEapCodes = new Set(codeToId.keys())
            const isUUIDCheck = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
            const invalidCodes: string[] = []
            Object.values(newPred).forEach(predsStr => {
                predsStr.split(/[;,\s]+/).filter(Boolean).forEach(p => {
                    if (!isUUIDCheck(p) && !knownEapCodes.has(p) && !knownEapCodes.has(p.replace(/^T/i, '')) && !knownEapCodes.has('T' + p)) {
                        invalidCodes.push(p)
                    }
                })
            })
            setInvalidPredCodes(Array.from(new Set(invalidCodes)))

            // WBS-06: deduplicação por nome+pai em modo append
            const filteredImport = bulkReplaceMode === 'append'
                ? importedNodes.filter(n => !nodes.some(e => e.nome === n.nome && e.pai_id === n.pai_id))
                : importedNodes

            if (filteredImport.length > 0) {
                const base = bulkReplaceMode === 'replace' ? [] : nodes
                if (bulkReplaceMode === 'replace') {
                    const pid = Array.isArray(projetoId) ? projetoId[0] : projetoId
                    if (pid) {
                        await supabase.from('eap_nodes').delete().eq('projeto_id', pid)
                        await supabase.from('tarefas').delete().eq('projeto_id', pid)
                        setDbNodes([])
                    }
                    localStorage.removeItem(`aura_eap_tabela_${projetoId}`)
                    localStorage.removeItem(`aura_eap_custos_${projetoId}`)
                    eapManuallyCleared.current = true
                    setImportedRows([])
                    setCustos({})
                }
                setCustos(prev => bulkReplaceMode === 'replace' ? newCustos : { ...prev, ...newCustos })
                setPredecessorasMap(prev => bulkReplaceMode === 'replace' ? newPred : { ...prev, ...newPred })
                setPertValues(prev => bulkReplaceMode === 'replace' ? newPertValues : { ...prev, ...newPertValues })
                setScheduledValues(prev => bulkReplaceMode === 'replace' ? newScheduledValues : { ...prev, ...newScheduledValues })
                setNodes([...base, ...filteredImport])
                setIsDirty(true)
                setSaveStatus('idle')
                setBulkText('')
                setTablePreview(null)
                setShowBulkModal(false)
                const custoCount = Object.keys(newCustos).length
                const skipped = importedNodes.length - filteredImport.length
                const skipNote = skipped > 0 ? ` (${skipped} duplicados ignorados)` : ''
                setMsg({ type: 'success', text: `${filteredImport.length} pacotes importados${colDuracao !== null ? ' com duração' : ''}${custoCount > 0 ? ` e custo (${custoCount} nós)` : ''}${skipNote}!` })
            }
            return
        }

        // Modo Texto Hierárquico (original)
        const lines = bulkText.split('\n')
        const importedNodes = await handleParse(lines)

        if (importedNodes.length > 0) {
            const base = bulkReplaceMode === 'replace' ? [] : nodes
            if (bulkReplaceMode === 'replace') {
                const pid = Array.isArray(projetoId) ? projetoId[0] : projetoId
                if (pid) {
                    await supabase.from('eap_nodes').delete().eq('projeto_id', pid)
                    await supabase.from('tarefas').delete().eq('projeto_id', pid)
                    setDbNodes([])
                }
                localStorage.removeItem(`aura_eap_tabela_${projetoId}`)
                localStorage.removeItem(`aura_eap_custos_${projetoId}`)
                eapManuallyCleared.current = true
                setImportedRows([])
                setCustos({})
            }
            setNodes([...base, ...importedNodes])
            setIsDirty(true)
            setSaveStatus('idle')
            setBulkText('')
            setShowBulkModal(false)
            setMsg({ type: 'success', text: `${importedNodes.length} pacotes importados com hierarquia!` })
        }
    }

    const handleClearAll = async () => {
        const pid = Array.isArray(projetoId) ? projetoId[0] : projetoId
        if (!pid) return
        if (!window.confirm('Tem certeza que deseja limpar toda a EAP? Esta ação não pode ser desfeita.')) return
        const { error: e1 } = await supabase.from('eap_nodes').delete().eq('projeto_id', pid)
        const { error: e2 } = await supabase.from('tarefas').delete().eq('projeto_id', pid)
        if (e1 || e2) {
            setMsg({ type: 'error', text: `Erro ao limpar: ${e1?.message || e2?.message}` })
            return
        }
        localStorage.removeItem(`aura_eap_draft_${pid}`)
        localStorage.removeItem(`aura_eap_tabela_${pid}`)
        localStorage.removeItem(`aura_eap_custos_${pid}`)
        eapManuallyCleared.current = true
        setNodes([])
        setDbNodes([])
        setCustos({})
        setPredecessorasMap({})
        setImportedRows([])
        setEapCount(0)
        setIsDirty(false)
        setSaveStatus('idle')
        localStorage.removeItem(`aura_eap_pred_${pid}`)
        setMsg({ type: 'success', text: 'EAP limpa com sucesso.' })
    }

    const addNode = (paiId: string | null = null) => {
        const parent = nodes.find(n => n.id === paiId)
        const newNode: WBSNode = {
            id: safeGUID(),
            nome: 'Novo Pacote de Trabalho',
            descricao: '',
            duracao: undefined,
            pai_id: paiId,
            nivel: parent ? parent.nivel + 1 : 1
        }
        setNodes([...nodes, newNode])
        setIsDirty(true)
        setSaveStatus('idle')
    }

    const duplicateNode = (id: string) => {
        const nodeToClone = nodes.find(n => n.id === id)
        if (!nodeToClone) return

        const clonedNodes: WBSNode[] = []
        const idMap: Record<string, string> = {} // WBS-13: original → new ID mapping for costs

        const cloneRecursive = (originalId: string, newPaiId: string | null) => {
            const original = nodes.find(n => n.id === originalId)
            if (!original) return

            const newId = safeGUID()
            idMap[originalId] = newId

            clonedNodes.push({
                ...original,
                id: newId,
                nome: `${original.nome} (Cópia)`,
                pai_id: newPaiId
            })

            // Find children
            nodes.filter(n => n.pai_id === originalId).forEach(child => {
                cloneRecursive(child.id, newId)
            })
        }

        cloneRecursive(id, nodeToClone.pai_id)
        // WBS-13: Copy custos for all cloned nodes
        const newCustos: Record<string, number> = {}
        Object.entries(idMap).forEach(([origId, newId]) => {
            if (custos[origId]) newCustos[newId] = custos[origId]
        })
        if (Object.keys(newCustos).length > 0) {
            setCustos(prev => ({ ...prev, ...newCustos }))
        }
        setNodes([...nodes, ...clonedNodes])
        setIsDirty(true)
        setSaveStatus('idle')
    }


    const removeNode = async (id: string) => {
        // Collect node + all descendants recursively
        const idsToRemove = new Set<string>([id])
        const findChildren = (pid: string) => {
            nodes.filter(n => n.pai_id === pid).forEach(c => {
                idsToRemove.add(c.id)
                findChildren(c.id)
            })
        }
        findChildren(id)
        // WBS-03: DB-first, rollback UI if delete fails
        const ids = Array.from(idsToRemove)
        const { error: delErr } = await supabase.from('eap_nodes').delete().in('id', ids)
        if (delErr) {
            setMsg({ type: 'error', text: `Erro ao remover nó: ${delErr.message}` })
            return
        }
        setNodes(nodes.filter(n => !idsToRemove.has(n.id)))
        setIsDirty(true)
        setSaveStatus('idle')
        // tarefas orphans are cleaned by handleSaveStructure differential sync on next save
    }

    const updateNode = (id: string, field: string, value: string | number | undefined) => {
        setNodes(nodes.map(n => n.id === id ? { ...n, [field]: value } : n))
        setIsDirty(true)
        setSaveStatus('idle')
    }

    const handleSaveStructure = async () => {
        if (loading || saving || contextLoading) {
            setMsg({ type: 'info', text: 'Aguardando inicialização do ambiente...' })
            return
        }

        const startTime = performance.now()
        setMsg({ type: 'info', text: 'Sincronizando estrutura...' })
        setSaving(true)

        const MAX_RETRIES = 3
        let attempt = 0
        let success = false

        async function attemptSave() {
            attempt++
            // 0. Persistence Gating: Save to LocalStorage just in case
            localStorage.setItem(`aura_eap_draft_${projetoId}`, JSON.stringify(nodes))

            if (attempt > 1) {
                setMsg({ type: 'info', text: `Conexão instável... Tentando reconectar (${attempt}/${MAX_RETRIES})` })
                await new Promise(r => setTimeout(r, 1000 * attempt)) 
            }

            // 1. Session & Identity check
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Sessão expirada.')

            // Resolve tenantId: contexto ou fallback direto no banco
            const pid = Array.isArray(projetoId) ? projetoId[0] : projetoId
            let effectiveTenantId = tenantId
            if (!effectiveTenantId && pid) {
                const { data: projMeta } = await supabase
                    .from('projetos')
                    .select('tenant_id')
                    .eq('id', pid)
                    .maybeSingle()
                effectiveTenantId = projMeta?.tenant_id ?? null
            }
            if (!effectiveTenantId) throw new Error('TenantID ausente.')

            const delay = (ms: number) => new Promise(res => setTimeout(res, ms))
            const BATCH_SIZE = 25

            // 2. DIFFERENTIAL SYNC LOGIC
            // Comparison helper to ignore database-only fields (created_at, etc.)
            const isDifferent = (a: WBSNode, b: WBSNode) => {
                return a.nome !== b.nome ||
                       a.descricao !== b.descricao ||
                       a.duracao !== b.duracao ||
                       a.pai_id !== b.pai_id ||
                       a.nivel !== b.nivel
            }

            const nodesToUpsert = nodes.filter(node => {
                const original = dbNodes.find(db => db.id === node.id)
                if (!original) return true // Created
                return isDifferent(original, node) // Updated
            })

            const nodesToDelete = dbNodes.filter(db => !nodes.some(n => n.id === db.id))

            // 2.1 Process Deletes first
            if (nodesToDelete.length > 0) {
                const deleteIds = nodesToDelete.map(n => n.id).filter(Boolean)
                if (deleteIds.length > 0) {
                    const { error: delErr } = await supabase.from('eap_nodes').delete().in('id', deleteIds)
                    if (delErr) throw new Error(`Falha ao remover pacotes: ${delErr.message}`)
                }
                await delay(200)
            }

            // 2.2 Process Upserts in batches
            if (nodesToUpsert.length > 0) {
                for (let i = 0; i < nodesToUpsert.length; i += BATCH_SIZE) {
                    const chunk = nodesToUpsert.slice(i, i + BATCH_SIZE)
                    const { error: insErr } = await supabase.from('eap_nodes').upsert(
                        chunk.map(n => ({
                            id: n.id,
                            projeto_id: projetoId,
                            tenant_id: effectiveTenantId,
                            nome: n.nome,
                            descricao: n.descricao,
                            duracao: n.duracao ?? null,
                            pai_id: n.pai_id,
                            nivel: n.nivel,
                            posicao: nodes.indexOf(n), // preserva ordem global da array
                        }))
                    )
                    if (insErr) throw new Error(`Falha ao salvar dados: ${insErr.message}`)
                    await delay(300)
                }
            }

            // 3. Sync to Tasks (V6.4 Atomic Cleanup)
            if (nodesToUpsert.length > 0 || nodesToDelete.length > 0) {
                const leafNodes = nodes.filter(node => !nodes.some(child => child.pai_id === node.id))
                
                // 3.1 Fetch current tasks to identify orphans
                const { data: currentTasks, error: fetchErr } = await supabase
                    .from('tarefas')
                    .select('id')
                    .eq('projeto_id', projetoId)
                
                if (fetchErr) console.error('[EAP] Erro ao buscar tarefas para cleanup:', fetchErr)
                
                if (currentTasks) {
                    const leafIds = new Set(leafNodes.map(n => n.id))
                    const taskIdsToDelete = currentTasks
                        .map((t: { id: string }) => t.id)
                        .filter((id: string) => !leafIds.has(id))
                    
                    if (taskIdsToDelete.length > 0) {
                        const { error: cleanErr } = await supabase
                            .from('tarefas')
                            .delete()
                            .in('id', taskIdsToDelete)
                        if (cleanErr) throw new Error(`Falha no cleanup de tarefas: ${cleanErr.message}`)
                    }
                }

                // 3.2 Upsert valid leaf nodes as tasks (preserving existing duration)
                const { data: existingTasks } = await supabase
                    .from('tarefas')
                    .select('id, duracao_estimada')
                    .eq('projeto_id', projetoId)
                const existingDuracoes = new Map((existingTasks || []).map((t: { id: string; duracao_estimada: number | null }) => [t.id, t.duracao_estimada]))

                // Build reverse map: T-code → node ID (for resolving predecessoras)
                const codeToNodeId = new Map<string, string>()
                nodes.forEach(n => {
                    const code = eapCodes.get(n.id)
                    if (code) {
                        codeToNodeId.set(`T${code}`, n.id)
                        codeToNodeId.set(code, n.id)
                    }
                })

                // Auto-CPM: resolve predecessors and run forward/backward pass
                const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
                const resolvePreds = (nodeId: string): string[] => {
                    const rawPreds = predecessorasMap[nodeId] || ''
                    return rawPreds
                        .split(/[;,\s]+/)
                        .map(p => p.trim())
                        .filter(Boolean)
                        .map(p => {
                            if (isUUID(p)) return p
                            const stripped = p.replace(/^T/i, '')
                            return codeToNodeId.get(p) || codeToNodeId.get(stripped) || codeToNodeId.get('T' + stripped) || null
                        })
                        .filter((p): p is string => p !== null && p !== nodeId && isUUID(p))
                }

                // Nodes com ES/EF/LS/LF importados usam esses valores diretamente
                // Nodes sem → CPM calculado (PERT ou determinístico)
                const nodesNeedingCPM = leafNodes.filter(n => !scheduledValues[n.id])
                const cpmInput: TarefaData[] = nodesNeedingCPM.map(n => ({
                    id: n.id,
                    nome: n.nome,
                    duracao_estimada: (n.duracao || existingDuracoes.get(n.id) || 5) as number,
                    dependencias: resolvePreds(n.id),
                    es: 0, ef: 0, ls: 0, lf: 0, folga: 0, critica: false,
                }))
                const cpmResult = cpmInput.length > 0 ? calculateCPMLocal(cpmInput) : []
                const cpmMap = new Map(cpmResult.map(t => [t.id, t]))

                for (let i = 0; i < leafNodes.length; i += BATCH_SIZE) {
                    const chunk = leafNodes.slice(i, i + BATCH_SIZE)
                    const { error: tErr } = await supabase.from('tarefas').upsert(
                        chunk.map(n => {
                            const resolvedPreds = resolvePreds(n.id)
                            const sched = scheduledValues[n.id]   // valores importados (prioridade)
                            const cpm   = cpmMap.get(n.id)        // valores calculados (fallback)
                            const pert  = pertValues[n.id]
                            const dur   = n.duracao || existingDuracoes.get(n.id) || 5
                            return {
                                id: n.id,
                                projeto_id: projetoId,
                                tenant_id: effectiveTenantId,
                                nome: n.nome,
                                duracao_estimada: dur,
                                ...(resolvedPreds.length > 0 ? { predecessoras: resolvedPreds } : {}),
                                status: 'planejado',
                                es: sched?.es ?? cpm?.es ?? 0,
                                ef: sched?.ef ?? cpm?.ef ?? dur,
                                ls: sched?.ls ?? cpm?.ls ?? 0,
                                lf: sched?.lf ?? cpm?.lf ?? dur,
                                folga_total: sched?.folga ?? cpm?.folga ?? 0,
                                no_caminho_critico: sched
                                    ? (sched.folga === 0)
                                    : (cpm?.critica ?? false),
                                ...(pert ? {
                                    duracao_otimista: pert.o,
                                    duracao_provavel: pert.m,
                                    duracao_pessimista: pert.p,
                                    metodo_duracao: 'pert',
                                } : { metodo_duracao: sched ? 'importado' : 'cpm' }),
                            }
                        }),
                        { onConflict: 'id' }
                    )
                    if (tErr) throw new Error(`Falha na integração CDT: ${tErr.message}`)
                    await delay(200)
                }
            }

            // WBS-01: Persistir custos em orcamentos.custos_tarefas
            const custoPayload = Object.fromEntries(
                Object.entries(custos).filter(([, v]) => (v as number) > 0)
            )
            if (Object.keys(custoPayload).length > 0) {
                await supabase.from('orcamentos')
                    .upsert({
                        projeto_id: projetoId,
                        tenant_id: effectiveTenantId,
                        custos_tarefas: custoPayload,
                    }, { onConflict: 'projeto_id' })
            }

            // Finalizing: Update dbNodes reference and refresh from cloud
            setDbNodes([...nodes])
            localStorage.removeItem(`aura_eap_draft_${projetoId}`)
            // Invalida export CPM stale — Caminho 2 (DB) será usado no próximo sync
            try { localStorage.removeItem(`aura_wbs_export_${projetoId}`) } catch {}
            
            // Critical: Force a fresh load from the cloud to ensure all timestamps and IDs are synced
            await loadEAP()
        }

        try {
            while (attempt < MAX_RETRIES && !success) {
                try {
                    await attemptSave()
                    success = true
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } catch (e: any) {
                    console.warn(`[EAP] ⚠️ Falha na tentativa ${attempt}:`, e.message || e)
                    if (attempt >= MAX_RETRIES) throw e
                    await new Promise(r => setTimeout(r, 1000))
                }
            }

            const endTime = performance.now()
            const latency = (endTime - startTime).toFixed(0)
            setMsg({ type: 'success', text: `Sincronização concluída com sucesso (${latency}ms)!` })
            
            // Sync with Global Context
            setEapCount(nodes.length)
            
            setIsDirty(false)
            setSaveStatus('success')
            // Auto-reset success status after 2 seconds
            setTimeout(() => setSaveStatus('idle'), 2000)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('[EAP] 💥 Erro crítico após retentativas:', err)
            const technicalMsg = err.message || JSON.stringify(err)
            setMsg({ type: 'error', text: `ERRO DE REDE: ${technicalMsg}` })
            setSaveStatus('error')
        } finally {
            setSaving(false)
        }
    }

    const handleNext = async () => {
        // Auto-save se houver alterações pendentes antes de navegar para o Calendário
        if (isDirty) {
            await handleSaveStructure()
        }
        router.push(`/${projetoId as string}/setup/calendario`)
    }

    if (loading) return (
        <div className="min-h-[400px] flex items-center justify-center">
            <div className="text-center space-y-4">
                <div className="h-10 w-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto" />
                <p className="text-slate-500 font-medium">Carregando Estrutura Analítica...</p>
            </div>
        </div>
    )

    return (
        <div className="p-8 w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <SetupStepper />
            {showBulkModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center gap-3 mb-4 text-blue-400">
                            <Layers className="h-6 w-6" />
                            <h3 className="text-xl font-bold">Importar Estrutura</h3>
                        </div>

                        <p className="text-sm text-slate-400 mb-3">
                            Cole a EAP em qualquer formato — texto hierárquico com numeração PMBOK, indentação, ou tabela Markdown/CSV. O sistema detecta automaticamente.
                        </p>
                        <textarea
                            value={bulkText}
                            onChange={(e) => handleBulkTextChange(e.target.value)}
                            className="w-full h-52 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-200 focus:border-blue-500 outline-none resize-none font-mono text-sm"
                            placeholder={`Texto hierárquico:\n1. Planejamento\n1.1 Kickoff\n1.2 Projeto Executivo\n2. Execução\n\nOu tabela Markdown/CSV:\n| Código | Nome | Duração | Custo |\n| T01 | Fundação | 30 | 50000 |`}
                        />
                        {tablePreview && (
                            <div className="mt-4 animate-in fade-in duration-200">
                                <p className="text-xs text-emerald-400 font-semibold mb-3">✓ Tabela detectada — {tablePreview.rows.length} linha(s). Confirme o mapeamento:</p>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-medium block mb-1">Código (hierarquia)</label>
                                        <select value={colCodigo ?? ''} onChange={(e) => setColCodigo(e.target.value === '' ? null : Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:border-blue-500 outline-none">
                                            <option value="">— Ignorar —</option>
                                            {tablePreview.header.map((h, i) => <option key={i} value={i}>{h || `Col ${i+1}`}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-medium block mb-1">Nome *</label>
                                        <select value={colNome} onChange={(e) => setColNome(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:border-blue-500 outline-none">
                                            {tablePreview.header.map((h, i) => <option key={i} value={i}>{h || `Col ${i+1}`}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-amber-400/80 font-medium block mb-1">Duração (dias)</label>
                                        <select value={colDuracao ?? ''} onChange={(e) => setColDuracao(e.target.value === '' ? null : Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:border-amber-500 outline-none">
                                            <option value="">— Ignorar —</option>
                                            {tablePreview.header.map((h, i) => <option key={i} value={i}>{h || `Col ${i+1}`}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-emerald-400/80 font-medium block mb-1">Custo (US$)</label>
                                        <select value={colCusto ?? ''} onChange={(e) => setColCusto(e.target.value === '' ? null : Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:border-emerald-500 outline-none">
                                            <option value="">— Ignorar —</option>
                                            {tablePreview.header.map((h, i) => <option key={i} value={i}>{h || `Col ${i+1}`}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-indigo-400/80 font-medium block mb-1">Predecessoras (T-codes)</label>
                                        <select value={colPred ?? ''} onChange={(e) => setColPred(e.target.value === '' ? null : Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none">
                                            <option value="">— Ignorar —</option>
                                            {tablePreview.header.map((h, i) => <option key={i} value={i}>{h || `Col ${i+1}`}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="bg-slate-950 rounded-xl overflow-auto max-h-32">
                                    <table className="w-full text-[11px]">
                                        <thead>
                                            <tr>
                                                {tablePreview.header.map((h, i) => (
                                                    <th key={i} className={`px-3 py-2 text-left font-semibold border-b border-slate-800 ${i === colNome ? 'text-blue-400' : i === colDuracao ? 'text-amber-400' : i === colCusto ? 'text-emerald-400' : i === colCodigo ? 'text-slate-300' : 'text-slate-600'}`}>
                                                        {h}
                                                        {i === colCodigo && <span className="ml-1 text-[9px] bg-slate-500/20 text-slate-400 rounded px-1">Cód.</span>}
                                                        {i === colNome && <span className="ml-1 text-[9px] bg-blue-500/20 text-blue-400 rounded px-1">Nome</span>}
                                                        {i === colDuracao && <span className="ml-1 text-[9px] bg-amber-500/20 text-amber-400 rounded px-1">Dur.</span>}
                                                        {i === colCusto && <span className="ml-1 text-[9px] bg-emerald-500/20 text-emerald-400 rounded px-1">Custo</span>}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tablePreview.rows.slice(0, 4).map((row, ri) => (
                                                <tr key={ri} className="border-b border-slate-800/50">
                                                    {row.map((cell, ci) => (
                                                        <td key={ci} className={`px-3 py-1.5 ${ci === colNome ? 'text-slate-200 font-medium' : ci === colDuracao ? 'text-amber-300/80 font-mono' : ci === colCusto ? 'text-emerald-300/80 font-mono' : 'text-slate-500'}`}>{cell}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {tablePreview.rows.length > 4 && <p className="text-center text-[10px] text-slate-600 py-1">...e mais {tablePreview.rows.length - 4} linha(s)</p>}
                                </div>
                                        <p className="text-[10px] text-slate-500 mt-2">
                                            Custo e predecessoras devem ser configurados nas etapas Orçamento e CPM.
                                        </p>
                                    </div>
                                )}
                        {/* Replace vs Append toggle */}
                        {nodes.length > 0 && (
                            <div className="mt-4 flex items-center gap-3 p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl">
                                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                                <span className="text-xs text-amber-300 flex-1">EAP já tem {nodes.length} nó(s). O que fazer?</span>
                                <div className="flex gap-1 bg-slate-800 rounded-lg p-0.5">
                                    <button
                                        onClick={() => setBulkReplaceMode('replace')}
                                        className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${bulkReplaceMode === 'replace' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        Substituir tudo
                                    </button>
                                    <button
                                        onClick={() => setBulkReplaceMode('append')}
                                        className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${bulkReplaceMode === 'append' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                    >
                                        Adicionar
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => { setShowBulkModal(false); setTablePreview(null); setBulkText('') }} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancelar</button>
                            <button
                                onClick={handleBulkImport}
                                disabled={bulkText.trim().length < 3}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all"
                            >
                                {tablePreview ? `Importar ${tablePreview.rows.length} linhas` : 'Importar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Modal: Adicionar Tarefa com Smart Insert ─── */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3 text-blue-400">
                                <Plus className="h-5 w-5" />
                                <h3 className="text-lg font-bold">Adicionar Tarefa</h3>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 font-medium block mb-1">Código *</label>
                                <input
                                    type="text"
                                    value={addForm.code}
                                    onChange={(e) => setAddForm(f => ({ ...f, code: e.target.value }))}
                                    placeholder="T2.3 ou 2.3"
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-slate-200 font-mono text-sm outline-none"
                                />
                                <p className="text-[10px] text-slate-600 mt-1">Ex: T1 (raiz) · T2.3 (3º filho do grupo 2) · T2.2.1 (sub-nível entre 2.2 e 2.3)</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-medium block mb-1">Nome *</label>
                                <input
                                    type="text"
                                    value={addForm.nome}
                                    onChange={(e) => setAddForm(f => ({ ...f, nome: e.target.value }))}
                                    placeholder="Nome da tarefa ou grupo"
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-slate-200 text-sm outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-amber-400/80 font-medium block mb-1">Duração (dias)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={addForm.duracao}
                                        onChange={(e) => setAddForm(f => ({ ...f, duracao: e.target.value }))}
                                        placeholder="0"
                                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-amber-300 font-mono text-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-emerald-400/80 font-medium block mb-1">Custo (US$)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={addForm.custo}
                                        onChange={(e) => setAddForm(f => ({ ...f, custo: e.target.value }))}
                                        placeholder="0"
                                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-emerald-300 font-mono text-sm outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-indigo-400/80 font-medium block mb-1">Predecessoras (separadas por ;)</label>
                                <input
                                    type="text"
                                    value={addForm.predecessoras}
                                    onChange={(e) => setAddForm(f => ({ ...f, predecessoras: e.target.value }))}
                                    placeholder="T2.1;T2.3"
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-indigo-300 font-mono text-sm outline-none"
                                />
                            </div>
                            {addError && (
                                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    {addError}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm">Cancelar</button>
                            <button
                                onClick={handleSmartInsert}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all"
                            >
                                Inserir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className="flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-3 text-emerald-500 mb-2">
                        <Layers className="h-6 w-6" />
                        <h2 className="text-sm font-semibold uppercase tracking-wider">Setup</h2>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-50">EAP / WBS</h1>
                    <p className="text-slate-400 mt-2">
                        Estrutura Analítica do Projeto: Detalhamento do escopo em pacotes de trabalho (Work Packages).
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowBulkModal(true)}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm transition-colors border border-slate-700"
                    >
                        <Upload className="h-4 w-4" /> Colar Estrutura
                    </button>
                    {nodes.length > 0 && (
                        <button
                            onClick={handleExportar}
                            disabled={saving}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border active:scale-95 ${
                                exportStatus === 'success'
                                    ? 'bg-emerald-600 border-emerald-500 text-white'
                                    : 'bg-indigo-600/20 hover:bg-indigo-600 border-indigo-500/40 text-indigo-400 hover:text-white hover:border-indigo-500'
                            }`}
                        >
                            {exportStatus === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                            {exportStatus === 'success' ? 'Exportando...' : 'Exportar para CPM'}
                        </button>
                    )}
                    <div className="flex flex-col md:flex-row gap-4">
                    <button
                        onClick={handleSaveStructure}
                        disabled={saving}
                        className={`w-full md:w-auto font-bold py-4 px-8 rounded-2xl transition shadow-xl flex items-center justify-center gap-3 border active:scale-95 duration-300 ${
                            saveStatus === 'success' ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20' :
                            saveStatus === 'error' ? 'bg-rose-600 border-rose-500 text-white shadow-rose-500/20' :
                            isDirty ? 'bg-amber-600 border-amber-500 text-white animate-pulse shadow-amber-500/20' :
                            'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100 shadow-slate-900/40'
                        }`}
                    >
                        {saving ? (
                            <>
                                <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                Sincronizando...
                            </>
                        ) : saveStatus === 'success' ? (
                            <>
                                <CheckCircle2 className="h-6 w-6" />
                                Estrutura Salva!
                            </>
                        ) : saveStatus === 'error' ? (
                            <>
                                <AlertCircle className="h-6 w-6" />
                                Falha na Sincronização
                            </>
                        ) : (
                            <>
                                <Save className="h-6 w-6" />
                                {isDirty ? 'Confirmar Alterações' : 'Salvar Estrutura'}
                            </>
                        )}
                    </button>
                    
                    <button
                        onClick={handleNext}
                        className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-10 rounded-2xl transition shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-95 hover:scale-[1.02] duration-300"
                    >
                        Seguinte
                        <ArrowRight className="h-6 w-6" />
                    </button>
                </div>
                </div>
            </header>

            {msg.text && (
                <div className={`p-4 rounded-2xl border transition-all animate-in slide-in-from-top-2 ${
                    msg.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                    msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    'bg-blue-500/10 border-blue-500/20 text-blue-400'
                }`}>
                    <div className="flex items-center gap-3">
                        {msg.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <Info className="h-5 w-5" />}
                        <span className="text-sm font-medium">{msg.text}</span>
                    </div>
                </div>
            )}

            {/* FIX-D3: badge de T-codes inválidos nas predecessoras */}
            {invalidPredCodes.length > 0 && (
                <div className="p-4 rounded-2xl border bg-amber-500/10 border-amber-500/20 text-amber-400 animate-in slide-in-from-top-2">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                        <div>
                            <span className="text-sm font-semibold">
                                ⚠ {invalidPredCodes.length} predecessora{invalidPredCodes.length > 1 ? 's' : ''} não encontrada{invalidPredCodes.length > 1 ? 's' : ''}
                            </span>
                            <p className="text-xs mt-1 text-amber-400/70">
                                Os seguintes T-codes não correspondem a nenhum nó da WBS e foram ignorados no CPM:{' '}
                                <span className="font-mono">{invalidPredCodes.join(', ')}</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modo Leitura EAP ─────────────────────────────────────────────── */}
            {isViewMode && !loading && nodes.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl animate-in fade-in duration-300">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2 text-emerald-400">
                            <Lock className="h-4 w-4" />
                            <span className="text-sm font-semibold">EAP Salva — Modo Leitura</span>
                            <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full border border-slate-700 ml-2">
                                {nodes.length} nós
                            </span>
                        </div>
                        <button
                            onClick={() => setIsViewMode(false)}
                            className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                        >
                            <Pencil className="h-3 w-3" /> Editar EAP
                        </button>
                    </div>
                    <div className="overflow-auto max-h-[60vh]">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-widest text-[10px]">
                                    <th className="text-left pb-2 pr-4">Código</th>
                                    <th className="text-left pb-2 pr-4">Nome</th>
                                    <th className="text-left pb-2 pr-4">Duração</th>
                                    <th className="text-left pb-2">Custo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {nodes.map((n) => {
                                    const code = eapCodes.get(n.id) ?? '—'
                                    const depth = (code.match(/\./g) || []).length
                                    const isPhase = depth === 0
                                    const phaseCost = isPhase ? (descendantCostMap.get(n.id) || 0) : 0
                                    return (
                                        <tr key={n.id} className={`border-b transition-colors ${isPhase ? 'border-slate-700 bg-slate-800/30 hover:bg-slate-800/50' : 'border-slate-800/50 hover:bg-slate-800/20'}`}>
                                            <td className={`py-2 pr-4 font-mono font-bold whitespace-nowrap ${isPhase ? 'text-blue-300' : 'text-slate-500'}`}>
                                                {isPhase ? `F${code}` : `T${code}`}
                                            </td>
                                            <td className="py-2 pr-4 text-slate-200" style={{ paddingLeft: `${depth * 16}px` }}>
                                                {isPhase ? <span className="font-bold text-blue-200">{n.nome}</span> : n.nome}
                                            </td>
                                            <td className="py-2 pr-4 font-mono text-slate-400">
                                                {isPhase
                                                    ? <span className="text-slate-600">—</span>
                                                    : n.duracao ? `${n.duracao}d` : <span className="text-slate-600">—</span>
                                                }
                                            </td>
                                            <td className="py-2 font-mono">
                                                {isPhase
                                                    ? (phaseCost > 0
                                                        ? <span className="text-blue-300/70 text-[11px]">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(phaseCost)}</span>
                                                        : <span className="text-slate-600">—</span>)
                                                    : (custos[n.id]
                                                        ? <span className="text-emerald-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(custos[n.id])}</span>
                                                        : <span className="text-slate-600">—</span>)
                                                }
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    {totalCusto > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Custo Total EAP</span>
                            <span className="text-sm font-mono font-bold text-emerald-400">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCusto)}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* ── Editor EAP (visível apenas fora do modo leitura) ─────────────── */}
            {!isViewMode && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-3 space-y-4">
                    {/* ─── Unified WBS Table ─── */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                        <div className="flex justify-between items-center mb-5">
                            <div>
                                <h3 className="font-semibold text-slate-200">Estrutura Analítica do Projeto</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {nodes.length} nós · {leafNodes.length} pacotes de trabalho
                                    {totalCusto > 0 && <span> · Total: <span className="text-emerald-400 font-mono">{formatCostShort(totalCusto)}</span></span>}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setAddForm({ code: '', nome: '', duracao: '', custo: '', predecessoras: '' }); setAddError(''); setShowAddModal(true) }}
                                    className="flex items-center gap-1.5 text-xs bg-blue-600/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg hover:bg-blue-600/20 transition-colors"
                                >
                                    <Plus className="h-3.5 w-3.5" /> Adicionar Tarefa
                                </button>
                                {nodes.length > 0 && (
                                    <button onClick={handleClearAll} className="text-xs bg-rose-600/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg hover:bg-rose-600/20 transition-colors">
                                        Limpar Tudo
                                    </button>
                                )}
                            </div>
                        </div>

                        {nodes.length === 0 && (
                            <EmptyState
                                icon={<EapEmptyIllustration className="h-8 w-8" />}
                                title={tarefas.length === 0 ? 'Nenhuma tarefa encontrada' : 'EAP não estruturada'}
                                description={
                                    tarefas.length === 0
                                        ? 'Comece pelo TAP para que a IA extraia as tarefas do escopo e preencha a EAP automaticamente.'
                                        : 'Você tem tarefas definidas. Agora organize a Estrutura Analítica do Projeto (EAP) em pacotes hierárquicos.'
                                }
                                ctaLabel={tarefas.length === 0 ? 'Ir para Tarefas' : 'Estruturar EAP'}
                                ctaHref={tarefas.length === 0 ? `/${projetoId}/setup/tap` : `/${projetoId}/setup/wbs`}
                                zona={tarefas.length === 0 ? 'risco' : 'info'}
                            />
                        )}

                        {nodes.length > 0 && (
                            <div className="overflow-auto rounded-2xl border border-slate-800">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-slate-950 border-b border-slate-800">
                                            <th className="px-3 py-2.5 text-left text-slate-500 font-semibold w-16">Código</th>
                                            <th className="px-3 py-2.5 text-left text-slate-500 font-semibold">Nome</th>
                                            <th className="px-3 py-2.5 text-right text-amber-400/80 font-semibold w-20">Dur. (d)</th>
                                            <th className="px-3 py-2.5 text-right text-emerald-400/80 font-semibold w-28">Custo (US$)</th>
                                            <th className="px-3 py-2.5 text-left text-indigo-400/80 font-semibold w-32">Predecessoras</th>
                                            <th className="px-3 py-2.5 w-20"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {nodes.map(node => {
                                            const code = eapCodes.get(node.id) || '?'
                                            const isGroup = nodes.some(n => n.pai_id === node.id)
                                            const groupCost = descendantCostMap.get(node.id) || 0
                                            return (
                                                <tr
                                                    key={node.id}
                                                    className={`group border-b border-slate-800/40 transition-colors ${
                                                        isGroup ? 'bg-slate-800/20 hover:bg-slate-800/40' : 'hover:bg-slate-800/20'
                                                    }`}
                                                >
                                                    <td className="px-3 py-2">
                                                        <span className={`font-mono font-bold text-[11px] ${isGroup ? 'text-blue-400' : 'text-slate-500'}`}>
                                                            {isGroup ? `F${code}` : `T${code}`}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="text"
                                                            value={node.nome}
                                                            onChange={(e) => updateNode(node.id, 'nome', e.target.value)}
                                                            style={{ paddingLeft: `${(node.nivel - 1) * 1.25 + 0.5}rem` }}
                                                            className={`w-full bg-transparent border-none focus:outline-none focus:ring-1 rounded px-2 py-0.5 transition-colors ${
                                                                isGroup
                                                                    ? 'font-bold text-slate-100 focus:ring-blue-500/30'
                                                                    : isDirty ? 'text-amber-300 focus:ring-amber-500/30' : 'text-slate-200 focus:ring-blue-500/30'
                                                            }`}
                                                            placeholder="Nome do pacote..."
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        {isGroup ? (
                                                            <span className="text-slate-600 font-mono">—</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={node.duracao ?? ''}
                                                                onChange={(e) => updateNode(node.id, 'duracao', e.target.value === '' ? undefined : parseInt(e.target.value) || 0)}
                                                                className="w-16 text-right bg-slate-800 border border-slate-700 focus:border-amber-500 rounded px-1.5 py-0.5 text-amber-300 font-mono text-xs outline-none"
                                                                placeholder="0"
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        {isGroup ? (
                                                            <span className="text-emerald-300/60 font-mono text-[11px]">
                                                                {groupCost > 0 ? formatCostShort(groupCost) : '—'}
                                                            </span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={custos[node.id] ?? ''}
                                                                onChange={(e) => {
                                                                    const v = parseFloat(e.target.value) || 0
                                                                    setCustos(prev => ({ ...prev, [node.id]: v }))
                                                                    setIsDirty(true)
                                                                }}
                                                                className="w-24 text-right bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded px-1.5 py-0.5 text-emerald-300 font-mono text-xs outline-none"
                                                                placeholder="0"
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {isGroup ? (
                                                            <span className="text-slate-600">—</span>
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={
                                                                    (predecessorasMap[node.id] || '')
                                                                        .split(/[;,\s]+/)
                                                                        .filter(Boolean)
                                                                        .map(p =>
                                                                            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p)
                                                                                ? (eapCodes.get(p) ? `T${eapCodes.get(p)}` : p)
                                                                                : p
                                                                        )
                                                                        .join(';')
                                                                }
                                                                onChange={(e) => setPredecessorasMap(prev => ({ ...prev, [node.id]: e.target.value }))}
                                                                className="w-full bg-slate-800/60 border border-slate-700/60 focus:border-indigo-500 rounded px-2 py-0.5 text-indigo-300/80 font-mono text-[11px] outline-none placeholder-slate-700"
                                                                placeholder="T2.1;T2.3"
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="hidden group-hover:flex items-center justify-end gap-1">
                                                            <button onClick={() => addNode(node.id)} className="p-1 hover:bg-blue-500/20 rounded text-blue-400 transition-colors" title="Adicionar Sub-nível">
                                                                <Plus className="h-3 w-3" />
                                                            </button>
                                                            <button onClick={() => duplicateNode(node.id)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Duplicar Ramo">
                                                                <Plus className="h-3 w-3 rotate-45" />
                                                            </button>
                                                            <button onClick={() => removeNode(node.id)} className="p-1 hover:bg-rose-500/20 rounded text-rose-500 transition-colors" title="Excluir">
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                    {leafNodes.length > 0 && (
                                        <tfoot>
                                            <tr className="border-t border-slate-700 bg-slate-950">
                                                <td colSpan={3} className="px-3 py-2.5 text-xs font-bold text-slate-400 uppercase">Total</td>
                                                <td className="px-3 py-2.5 text-right font-bold font-mono text-emerald-400">{formatCostShort(totalCusto)}</td>
                                                <td colSpan={2}></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        )}

                        {leafNodes.length > 0 && (
                            <div className="flex justify-end mt-4">
                                <button
                                    onClick={handleExportar}
                                    disabled={saving}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all border active:scale-95 ${
                                        exportStatus === 'success'
                                            ? 'bg-emerald-600 border-emerald-500 text-white'
                                            : 'bg-indigo-600/20 hover:bg-indigo-600 border-indigo-500/40 text-indigo-400 hover:text-white hover:border-indigo-500'
                                    }`}
                                >
                                    {exportStatus === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                                    {exportStatus === 'success' ? 'Exportando...' : 'Exportar para CPM'}
                                </button>
                            </div>
                        )}
                    </div>

                </div>

                <div className="space-y-6">
                    <AIInsightCard
                        contexto={{
                            modulo: 'EAP / WBS',
                            dados: { total_nodes: nodes.length, project: tap?.nome_projeto || 'Novo Projeto' },
                            projeto_id: projetoId as string
                        }}
                    />

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                        <div className="flex items-center gap-2 mb-3 text-slate-300">
                            <Info className="h-4 w-4 text-blue-400" />
                            <h4 className="text-xs font-bold uppercase tracking-wider">Produtividade</h4>
                        </div>
                        <ul className="text-[11px] text-slate-500 space-y-2 leading-relaxed">
                            <li>• Use <strong>Colar Estrutura</strong> para importar EAP com numeração PMBOK ou indentação.</li>
                            <li>• <strong>Adicionar Tarefa</strong> insere na posição exata pelo código (T2.2.1 entre T2.2 e T2.3).</li>
                            <li>• Tarefas-título (com filhos) têm duração e custo calculados automaticamente.</li>
                            <li>• Apenas as <strong>folhas</strong> entram no CPM/PERT e no cronograma.</li>
                        </ul>
                    </div>
                </div>
            </div>
            )}
            {/* fim !isViewMode */}
        </div>
    )
}
