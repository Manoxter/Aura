'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Layers, Plus, Trash2, ArrowRight, Save, Info, ChevronDown, ChevronRight, Upload, AlertCircle, CheckCircle2, DollarSign, Download } from 'lucide-react'
import { EmptyState, EapEmptyIllustration } from '@/components/ui/EmptyState'
import { setLocalStorage, getLocalStorage } from '@/lib/storage/local-storage'
import { useProject } from '@/context/ProjectContext'
import { supabase } from '@/lib/supabase'
import { AIInsightCard } from '@/components/aura/AIInsightCard'
import { SetupStepper } from '@/components/aura/SetupStepper'

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

interface MergePreviewRow {
    row: ImportedRow
    status: 'match' | 'new'
    nodeId?: string
    existingNome?: string
}

const safeGUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID().split('-')[0]
    }
    return Math.random().toString(36).substring(2, 9)
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        eapCount, setEapCount,
        tenantId,
        loading: contextLoading
    } = useProject()
    const [nodes, setNodes] = useState<WBSNode[]>([])
    const [dbNodes, setDbNodes] = useState<WBSNode[]>([]) // For differential sync
    // P3: evita re-parse quando context carrega antes do DB (cascata só uma vez por projeto)
    const cascadeAttemptedRef = useRef<string | null>(null)

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
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [msg, setMsg] = useState({ type: '', text: '' })

    const [activeEapTab, setActiveEapTab] = useState<'hierarquia' | 'custos'>('hierarquia')
    const [custos, setCustos] = useState<Record<string, number>>({})
    const [exportStatus, setExportStatus] = useState<'idle' | 'success'>('idle')
    // uncontrolled textarea — avoids re-render on every keystroke (fix 231ms block)
    const tableTextRef = useRef<HTMLTextAreaElement>(null)
    const tableDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [hasTableText, setHasTableText] = useState(false)
    const handleTableInputChange = useCallback(() => {
        if (tableDebounceRef.current) clearTimeout(tableDebounceRef.current)
        tableDebounceRef.current = setTimeout(() => {
            setHasTableText((tableTextRef.current?.value.trim().length ?? 0) >= 5)
        }, 150)
    }, [])
    const [importedRows, setImportedRows] = useState<ImportedRow[]>([])
    const [mergePreview, setMergePreview] = useState<MergePreviewRow[] | null>(null)
    const [subCosts, setSubCosts] = useState<Record<string, { code: string; nome: string; custo: number }[]>>({})
    const [expandedCostRows, setExpandedCostRows] = useState<Set<string>>(new Set())

    const leafNodes = useMemo(() =>
        nodes.filter(n => !nodes.some(child => child.pai_id === n.id)),
        [nodes]
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    )
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const totalCusto = useMemo(() =>
        leafNodes.reduce((sum, n) => sum + (custos[n.id] || 0), 0),
        [leafNodes, custos]
    )

    const codeToNodeId = useMemo(() => {
        const map = new Map<string, string>()
        eapCodes.forEach((code, nodeId) => map.set(code, nodeId))
        return map
    }, [eapCodes])

    const [showBulkModal, setShowBulkModal] = useState(false)
    const [bulkText, setBulkText] = useState('')
    const [bulkMode, setBulkMode] = useState<'text' | 'table'>('text')
    const [bulkReplaceMode, setBulkReplaceMode] = useState<'replace' | 'append'>('replace')
    const [tablePreview, setTablePreview] = useState<{ header: string[]; rows: string[][] } | null>(null)
    const [colNome, setColNome] = useState<number>(0)
    const [colDuracao, setColDuracao] = useState<number | null>(null)

    // Load persisted costs from localStorage (Story 8.7 — TTL 24h)
    useEffect(() => {
        if (!projetoId) return
        const stored = getLocalStorage<Record<string, number>>(`aura_eap_custos_${projetoId}`)
        if (stored) setCustos(stored)
    }, [projetoId])

    // Load imported table rows from localStorage (Story 8.7 — TTL 24h)
    useEffect(() => {
        if (!projetoId) return
        const stored = getLocalStorage<ImportedRow[]>(`aura_eap_tabela_${projetoId}`)
        if (stored) setImportedRows(stored)
    }, [projetoId])

    const formatCostShort = (n: number): string => {
        if (n >= 1e9) return `US$${(n / 1e9).toFixed(1)}B`
        if (n >= 1e6) return `US$${(n / 1e6).toFixed(0)}M`
        if (n >= 1e3) return `R$${(n / 1e3).toFixed(0)}k`
        return `R$${n}`
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleExportCustos = () => {
        setLocalStorage(`aura_eap_custos_${projetoId}`, custos)
        setExportStatus('success')
        setMsg({ type: 'success', text: `Custos de ${leafNodes.length} pacote(s) exportados — disponíveis no CPM (Gerar Predecessoras) e no plano de custos.` })
        setTimeout(() => setExportStatus('idle'), 3000)
    }

    const parseImportTable = (text: string): ImportedRow[] | null => {
        const parsed = parseTableText(text)
        if (!parsed) return null
        const { header, rows } = parsed
        const h = header.map(s => s.toLowerCase().trim())
        const codeIdx = h.findIndex(s => /c[oó]d(ig)?|^id$|^code|^wbs|^n[°º]|^num|^#/.test(s))
        const nomeIdx = h.findIndex(s => /pacote|nome|task|tarefa|work|atividade|descri/.test(s))
        const durIdx = h.findIndex(s => /dura[cç]|dur|meses|dias|month/.test(s))
        const custoIdx = h.findIndex(s => /custo|cost|valor|budget|us\$|r\$/.test(s))
        const depIdx = h.findIndex(s => /depend|pred|anterior|requisit/.test(s))
        // Fallback de posição: se headers não reconhecidos, col 0 = código, col 1 = nome
        // (comum quando tabela vem do fallback WBS simples ou espaço-alinhado sem headers)
        if (codeIdx < 0) {
            // Usa col 0 se valores parecem WBS (1, 1.1, A., A.1...)
            const firstVals = rows.slice(0, 3).map(r => r[0]?.trim() || '')
            const looksLikeWbs = firstVals.filter(v => /^([A-Z](?:\.\d+)*\.?|\d+(?:\.\d+)*)\.?$/i.test(v)).length >= 1
            if (looksLikeWbs) { /* codeIdx stays -1, will use 0 */ } else return null
        }
        if (nomeIdx < 0) {
            // Usa a primeira coluna que não é codeIdx e não é só números
            const candidate = h.findIndex((_, i) => i !== (codeIdx < 0 ? 0 : codeIdx))
            if (candidate >= 0) { /* nomeIdx stays -1, will use candidate */ } else return null
        }
        const resolvedCodeIdx = codeIdx >= 0 ? codeIdx : 0
        const resolvedNomeIdx = nomeIdx >= 0 ? nomeIdx : (resolvedCodeIdx === 0 ? 1 : 0)
        const parseCusto = (raw: string): number | null => {
            if (!raw || raw.trim() === '-') return null
            const num = parseFloat(raw.replace(/[^0-9.]/g, ''))
            if (isNaN(num)) return null
            if (/B/i.test(raw)) return num * 1e9
            if (/M/i.test(raw)) return num * 1e6
            if (/K/i.test(raw)) return num * 1e3
            return num
        }
        return rows
            .filter(row => row[resolvedCodeIdx]?.trim() && row[resolvedNomeIdx]?.trim())
            .map(row => ({
                code: row[resolvedCodeIdx].trim(),
                nome: row[resolvedNomeIdx].trim(),
                duracao: durIdx >= 0 ? (parseInt(row[durIdx]) || null) : null,
                custo: custoIdx >= 0 ? parseCusto(row[custoIdx]?.trim() || '') : null,
                dependencias: depIdx >= 0 && row[depIdx]?.trim() && row[depIdx].trim() !== '-'
                    ? row[depIdx].split(/[,;\s]+/).map((d: string) => d.trim()).filter(Boolean)
                    : []
            }))
    }

    const handleProcessTable = () => {
        const rows = parseImportTable(tableTextRef.current?.value ?? '')
        if (!rows || rows.length === 0) {
            setMsg({ type: 'error', text: 'Formato não reconhecido. Use Markdown (|), TSV (tab) ou CSV. Colunas mínimas: Cód. e Pacote.' })
            return
        }
        const preview: MergePreviewRow[] = rows.map(row => {
            const nodeId = codeToNodeId.get(row.code)
            if (nodeId) {
                const node = nodes.find(n => n.id === nodeId)
                return { row, status: 'match' as const, nodeId, existingNome: node?.nome }
            }
            return { row, status: 'new' as const }
        })
        setMergePreview(preview)
    }

    const handleConfirmMerge = () => {
        if (!mergePreview) return
        const newCustos = { ...custos }
        const newNodes = [...nodes]
        const rowsToStore: ImportedRow[] = []
        // Start with existing code→id map, accumulate new IDs during loop
        const localCodeMap = new Map(codeToNodeId)
        // Sort by WBS depth so parents are always created before children
        const sorted = [...mergePreview].sort((a, b) =>
            a.row.code.split('.').length - b.row.code.split('.').length
        )
        for (const result of sorted) {
            rowsToStore.push(result.row)
            if (result.status === 'match' && result.nodeId) {
                if (result.row.custo) newCustos[result.nodeId] = result.row.custo
            } else if (result.status === 'new') {
                const level = result.row.code.split('.').length
                const parentCode = result.row.code.split('.').slice(0, -1).join('.')
                const parentId = parentCode ? (localCodeMap.get(parentCode) ?? null) : null
                const newNode: WBSNode = {
                    id: `WBS-${safeGUID()}`,
                    nome: result.row.nome,
                    descricao: '',
                    duracao: result.row.duracao ?? undefined,
                    pai_id: parentId,
                    nivel: level
                }
                newNodes.push(newNode)
                localCodeMap.set(result.row.code, newNode.id) // accumulate so children resolve parents
                if (result.row.custo) newCustos[newNode.id] = result.row.custo
            }
        }
        setNodes(newNodes)
        setCustos(newCustos)
        setImportedRows(rowsToStore)
        setIsDirty(true)
        setSaveStatus('idle')
        setMergePreview(null)
        if (tableTextRef.current) tableTextRef.current.value = ''
        setHasTableText(false)
        setLocalStorage(`aura_eap_custos_${projetoId}`, newCustos)
        setLocalStorage(`aura_eap_tabela_${projetoId}`, rowsToStore)
        const matches = mergePreview.filter(r => r.status === 'match').length
        const news = mergePreview.filter(r => r.status === 'new').length
        setMsg({ type: 'success', text: `Smart Merge: ${matches} match(es), ${news} novo(s) adicionados à hierarquia. Clique "Salvar Estrutura" para persistir, depois "Exportar para CPM".` })
        setActiveEapTab('hierarquia')
    }

    const handleExportAll = () => {
        // B3: Clear dismissed flag so the CPM banner shows for the new export
        localStorage.removeItem(`aura_eap_banner_dismissed_${projetoId}`)
        setLocalStorage(`aura_eap_custos_${projetoId}`, custos)
        setLocalStorage(`aura_eap_tabela_${projetoId}`, importedRows)
        setExportStatus('success')
        setMsg({ type: 'success', text: 'Exportado: custos e predecessoras disponíveis no CPM (Camada 1 + Gerar Predecessoras).' })
        setTimeout(() => setExportStatus('idle'), 3000)
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
            pai_id: d.pai_id,
            nivel: d.nivel
        }))
    }

    // 2. Sync nodes if eap_nodes is empty but tasks are available (Cascata TAP)
    // P3: cascadeAttemptedRef garante que a cascata roda no máximo uma vez por projeto
    useEffect(() => {
        const isCorrectProject = tap?.projeto_id === projetoId
        const alreadyAttempted = cascadeAttemptedRef.current === projetoId

        if (!loading && isCorrectProject && nodes.length === 0 && tarefas.length > 0 && !alreadyAttempted) {
            cascadeAttemptedRef.current = projetoId ?? null
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
        const localDraft = getLocalStorage<WBSNode[]>(localKey)
        if (localDraft && Array.isArray(localDraft) && localDraft.length > 0) {
            setNodes(localDraft)
            setIsDirty(true) // Mark as dirty since it's local
        }

        try {
            const { data, error } = await supabase
                .from('eap_nodes')
                .select('*')
                .eq('projeto_id', projetoId)
                .order('criado_em', { ascending: true })

            if (error) throw error

            if (data && data.length > 0) {
                setNodes(data)
                setDbNodes(data) // Reference for diff
                setIsDirty(false)
                localStorage.removeItem(localKey) // Cloud is source of truth now
            } else if (!localDraft) {
                setNodes([])
                setDbNodes([])
            }
        } catch (err) {
            console.error('[EAP] Erro fatal ao carregar:', err)
        } finally {
            setLoading(false)
        }
    }

    // ── Smart Table Parser ────────────────────────────────────────────────
    // Aceita: Markdown (|), TSV (\t), CSV (,), espaços múltiplos (PDF/Word), WBS simples
    const parseTableText = (text: string): { header: string[]; rows: string[][] } | null => {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
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
            // Markdown: filtra separadores |---|
            const validLines = lines.filter(l => !/^[-|: ]+$/.test(l))
            if (validLines.length < 2) return null
            const split = (l: string) => l.split('|').map(c => c.trim()).filter(Boolean)
            header = split(validLines[0])
            dataRows = validLines.slice(1).map(split).filter(r => r.length > 0)
        } else if (isTSV) {
            const split = (l: string) => l.split('\t').map(c => c.trim())
            header = split(lines[0])
            dataRows = lines.slice(1).map(split)
        } else if (isSpaceAligned) {
            // Tabela com colunas separadas por 2+ espaços (cópia de PDF/Word)
            const split = (l: string) => l.split(/\s{2,}/).map(c => c.trim()).filter(Boolean)
            const firstCols = split(lines[0])
            if (firstCols.length < 2) return null
            header = firstCols
            dataRows = lines.slice(1).map(split).filter(r => r.length > 0)
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
        const nomeKw = /nome|task|tarefa|pacote|atividade|descri|work/i
        const durKw = /dur|dias|days|tempo|prazo/i
        const nomeIdx = header.findIndex(h => nomeKw.test(h))
        const durIdx = header.findIndex(h => durKw.test(h))
        setColNome(nomeIdx >= 0 ? nomeIdx : 0)
        setColDuracao(durIdx >= 0 ? durIdx : null)
    }

    const handleTableTextChange = (text: string) => {
        setBulkText(text)
        const parsed = parseTableText(text)
        setTablePreview(parsed)
        if (parsed) autoDetectColumns(parsed.header)
    }

    const handleBulkImport = async () => {
        if (bulkMode === 'table' && tablePreview) {
            // Modo Tabela: importa da coluna Nome, com duração inline se detectada
            const importedNodes: WBSNode[] = tablePreview.rows
                .filter(row => row[colNome]?.trim())
                .map((row) => {
                    const nome = row[colNome].trim()
                    const dur = colDuracao !== null ? parseInt(row[colDuracao] || '0') : 0
                    return {
                        id: `WBS-${safeGUID()}`,
                        nome,
                        descricao: '',
                        duracao: dur > 0 ? dur : undefined,
                        pai_id: null,
                        nivel: 1,
                    }
                })

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
                    setImportedRows([])
                    setCustos({})
                }
                setNodes([...base, ...importedNodes])
                setIsDirty(true)
                setSaveStatus('idle')
                setBulkText('')
                setTablePreview(null)
                setShowBulkModal(false)
                setMsg({ type: 'success', text: `${importedNodes.length} pacotes importados da tabela!${colDuracao !== null ? ' Durações salvas por pacote.' : ''}` })
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
                if (pid && tenantId) {
                    await supabase.from('eap_nodes').delete().eq('projeto_id', pid).eq('tenant_id', tenantId)
                    await supabase.from('tarefas').delete().eq('projeto_id', pid).eq('tenant_id', tenantId)
                    setDbNodes([])
                }
                localStorage.removeItem(`aura_eap_tabela_${projetoId}`)
                localStorage.removeItem(`aura_eap_custos_${projetoId}`)
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
        setNodes([])
        setDbNodes([])
        setCustos({})
        setImportedRows([])
        setEapCount(0)
        setIsDirty(false)
        setSaveStatus('idle')
        setMsg({ type: 'success', text: 'EAP limpa com sucesso.' })
    }

    const addNode = (paiId: string | null = null) => {
        const parent = nodes.find(n => n.id === paiId)
        const newNode: WBSNode = {
            id: `WBS-${safeGUID()}`,
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

        const cloneRecursive = (originalId: string, newPaiId: string | null) => {
            const original = nodes.find(n => n.id === originalId)
            if (!original) return

            const newId = `WBS-${safeGUID()}`

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
        // Update UI immediately (optimistic)
        setNodes(nodes.filter(n => !idsToRemove.has(n.id)))
        setIsDirty(true)
        setSaveStatus('idle')
        // Persist delete to DB immediately so refresh doesn't restore nodes
        const ids = Array.from(idsToRemove)
        await supabase.from('eap_nodes').delete().in('id', ids)
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
            setLocalStorage(`aura_eap_draft_${projetoId}`, nodes)

            if (attempt > 1) {
                setMsg({ type: 'info', text: `Conexão instável... Tentando reconectar (${attempt}/${MAX_RETRIES})` })
                await new Promise(r => setTimeout(r, 1000 * attempt)) 
            }

            // 1. Session & Identity check
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Sessão expirada.')
            if (!tenantId) throw new Error('TenantID ausente.')

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
                const deleteIds = nodesToDelete.map(n => n.id).filter(id => id && id.startsWith('WBS-'))
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
                            tenant_id: tenantId,
                            nome: n.nome,
                            descricao: n.descricao,
                            duracao: n.duracao ?? null,
                            pai_id: n.pai_id,
                            nivel: n.nivel,
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
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        .map((t: any) => t.id)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        .filter((id: any) => !leafIds.has(id))
                    
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const existingDuracoes = new Map((existingTasks || []).map((t: any) => [t.id, t.duracao_estimada]))

                for (let i = 0; i < leafNodes.length; i += BATCH_SIZE) {
                    const chunk = leafNodes.slice(i, i + BATCH_SIZE)
                    const { error: tErr } = await supabase.from('tarefas').upsert(
                        chunk.map(n => ({
                            id: n.id,
                            projeto_id: projetoId,
                            tenant_id: tenantId,
                            nome: n.nome,
                            duracao_estimada: n.duracao || existingDuracoes.get(n.id) || 1,
                            status: 'planejado'
                        })),
                        { onConflict: 'id' }
                    )
                    if (tErr) throw new Error(`Falha na integração CDT: ${tErr.message}`)
                    await delay(200)
                }
            }

            // Finalizing: Update dbNodes reference and refresh from cloud
            setDbNodes([...nodes])
            localStorage.removeItem(`aura_eap_draft_${projetoId}`)
            
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

                        {/* Tabs */}
                        <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 mb-4">
                            <button
                                onClick={() => { setBulkMode('text'); setTablePreview(null); setBulkText('') }}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${bulkMode === 'text' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Texto Hierárquico
                            </button>
                            <button
                                onClick={() => { setBulkMode('table'); setTablePreview(null); setBulkText('') }}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${bulkMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                Tabela (Markdown / CSV)
                            </button>
                        </div>

                        {bulkMode === 'text' ? (
                            <>
                                <p className="text-sm text-slate-400 mb-3">Cole uma EAP hierárquica com numeração PMBOK (1.1, 1.1.1) ou indentação. Tabelas embutidas são ignoradas automaticamente.</p>
                                <textarea
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    className="w-full h-56 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-200 focus:border-blue-500 outline-none resize-none font-mono text-sm"
                                    placeholder={`1. Infraestrutura\n1.1 Fundação\n1.1.1 Escavação\n1.2 Estrutura\n2. Instalações`}
                                />
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-slate-400 mb-3">Cole uma tabela no formato Markdown (<code className="text-blue-400 text-xs">| Código | Nome | Duração | Custo |</code>), TSV ou CSV. O sistema detecta as colunas automaticamente.</p>
                                <textarea
                                    value={bulkText}
                                    onChange={(e) => handleTableTextChange(e.target.value)}
                                    className="w-full h-40 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-200 focus:border-blue-500 outline-none resize-none font-mono text-sm"
                                    placeholder={`| Código | Nome | Duração | Custo |\n|--------|------|---------|-------|\n| T01 | Fundação | 30 | 50000 |`}
                                />

                                {tablePreview && (
                                    <div className="mt-4 animate-in fade-in duration-200">
                                        <p className="text-xs text-emerald-400 font-semibold mb-2">✓ Tabela detectada — {tablePreview.rows.length} linha(s). Mapeie as colunas:</p>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div>
                                                <label className="text-xs text-slate-400 font-medium block mb-1">Coluna: Nome do Pacote *</label>
                                                <select
                                                    value={colNome}
                                                    onChange={(e) => setColNome(Number(e.target.value))}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:border-blue-500 outline-none"
                                                >
                                                    {tablePreview.header.map((h, i) => (
                                                        <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400 font-medium block mb-1">Coluna: Duração (dias) — opcional</label>
                                                <select
                                                    value={colDuracao ?? ''}
                                                    onChange={(e) => setColDuracao(e.target.value === '' ? null : Number(e.target.value))}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:border-blue-500 outline-none"
                                                >
                                                    <option value="">— Ignorar —</option>
                                                    {tablePreview.header.map((h, i) => (
                                                        <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="bg-slate-950 rounded-xl overflow-auto max-h-36">
                                            <table className="w-full text-[11px]">
                                                <thead>
                                                    <tr>
                                                        {tablePreview.header.map((h, i) => (
                                                            <th key={i} className={`px-3 py-2 text-left font-semibold border-b border-slate-800 ${i === colNome ? 'text-blue-400' : i === colDuracao ? 'text-amber-400' : 'text-slate-500'}`}>
                                                                {h}
                                                                {i === colNome && <span className="ml-1 text-[9px] bg-blue-500/20 text-blue-400 rounded px-1">Nome</span>}
                                                                {i === colDuracao && <span className="ml-1 text-[9px] bg-amber-500/20 text-amber-400 rounded px-1">Dur.</span>}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {tablePreview.rows.slice(0, 5).map((row, ri) => (
                                                        <tr key={ri} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                                            {row.map((cell, ci) => (
                                                                <td key={ci} className={`px-3 py-1.5 ${ci === colNome ? 'text-slate-200 font-medium' : ci === colDuracao ? 'text-amber-300/80 font-mono' : 'text-slate-500'}`}>{cell}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {tablePreview.rows.length > 5 && (
                                                <p className="text-center text-[10px] text-slate-600 py-1">...e mais {tablePreview.rows.length - 5} linha(s)</p>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-2">
                                            Custo e predecessoras devem ser configurados nas etapas Orçamento e CPM.
                                        </p>
                                    </div>
                                )}
                                {bulkText.length > 5 && !tablePreview && (
                                    <p className="text-xs text-amber-400 mt-2">Formato de tabela não detectado. Verifique se há colunas separadas por | ou tabulação.</p>
                                )}
                            </>
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
                                disabled={bulkMode === 'table' && !tablePreview}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all"
                            >
                                {bulkMode === 'table' ? `Importar ${tablePreview?.rows.length ?? 0} linhas` : 'Importar'}
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

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-3 space-y-4">

                    {/* Tab Navigation */}
                    <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800 w-fit">
                        {([
                            { id: 'hierarquia' as const, label: 'Hierarquia do Escopo', icon: Layers },
                            { id: 'custos' as const, label: 'Tabela de Custos', icon: DollarSign },
                        ]).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveEapTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                                    activeEapTab === tab.id ? 'bg-slate-800 text-white shadow-lg border border-slate-700' : 'text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ─── Tab: Hierarquia ─── */}
                    {activeEapTab === 'hierarquia' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-semibold text-slate-200">Hierarquia do Escopo</h3>
                            <div className="flex gap-2">
                               <button onClick={() => addNode(null)} className="text-xs bg-blue-600/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-lg hover:bg-blue-600/20 transition-colors">
                                    + Nível 1
                                </button>
                                {nodes.length > 0 && (
                                    <button onClick={handleClearAll} className="text-xs bg-rose-600/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-lg hover:bg-rose-600/20 transition-colors">
                                        Limpar Tudo
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
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
                                    ctaHref={tarefas.length === 0 ? `/${projetoId}/setup/tap` : `/${projetoId}/setup/eap`}
                                    zona={tarefas.length === 0 ? 'risco' : 'info'}
                                />
                            )}
                            {nodes.map(node => (
                                <div
                                    key={node.id}
                                    className="group flex items-center gap-2 p-2 bg-slate-800/30 border border-slate-700/50 rounded-xl hover:border-blue-500/50 transition-all shadow-sm"
                                    style={{ marginLeft: `${(node.nivel - 1) * 2}rem` }}
                                >
                                    <div className="text-slate-500 group-hover:text-blue-400 transition-colors shrink-0">
                                        {nodes.some(n => n.pai_id === node.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 opacity-50" />}
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-500 w-10 shrink-0">{eapCodes.get(node.id) || '—'}</span>
                                    {/* Nome */}
                                    <input
                                        type="text"
                                        value={node.nome}
                                        onChange={(e) => updateNode(node.id, 'nome', e.target.value)}
                                        className={`flex-1 min-w-0 bg-transparent border-none focus:outline-none text-sm font-medium focus:ring-1 rounded px-2 py-1 transition-colors ${
                                            node.nome.trim() === '' ? 'text-slate-500 italic' :
                                            isDirty ? 'text-amber-400 focus:ring-amber-500/30' :
                                            'text-slate-200 focus:ring-blue-500/30'
                                        }`}
                                        placeholder="Nome do pacote..."
                                    />
                                    {/* Duração */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        <input
                                            type="number"
                                            min="0"
                                            value={node.duracao ?? ''}
                                            onChange={(e) => updateNode(node.id, 'duracao', e.target.value === '' ? undefined : parseInt(e.target.value) || 0)}
                                            className="w-14 text-right bg-slate-800 border border-slate-700 focus:border-amber-500 rounded px-1.5 py-1 text-amber-300 font-mono text-xs outline-none"
                                            placeholder="0"
                                            title="Duração (dias)"
                                        />
                                        <span className="text-[10px] text-slate-600 font-mono">d</span>
                                    </div>
                                    {/* Descrição */}
                                    <input
                                        type="text"
                                        value={node.descricao}
                                        onChange={(e) => updateNode(node.id, 'descricao', e.target.value)}
                                        className="w-36 xl:w-48 bg-transparent border-none focus:outline-none text-xs text-slate-500 focus:ring-1 focus:ring-slate-600/40 rounded px-2 py-1 transition-colors placeholder-slate-700 focus:placeholder-slate-600"
                                        placeholder="Descrição..."
                                        title="Descrição do pacote"
                                    />
                                    <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                                        <button onClick={() => duplicateNode(node.id)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Duplicar Ramo">
                                            <Plus className="h-3.5 w-3.5 rotate-45" />
                                        </button>
                                        <button onClick={() => addNode(node.id)} className="p-1.5 hover:bg-blue-500/20 rounded text-blue-400" title="Adicionar Sub-nível">
                                            <Plus className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={() => removeNode(node.id)} className="p-1.5 hover:bg-rose-500/20 rounded text-rose-500" title="Excluir">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    )}

                    {/* ─── Tab: Custos ─── */}
                    {activeEapTab === 'custos' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl animate-in fade-in duration-300 space-y-5">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-slate-200">Tabela de Custos e Predecessoras</h3>
                                <p className="text-xs text-slate-500 mt-1">Cole a tabela no formato da documentação do projeto. O sistema detecta automaticamente as colunas <span className="text-blue-400">Cód.</span>, <span className="text-slate-300">Pacote</span>, <span className="text-amber-400">Duração</span>, <span className="text-emerald-400">Custo</span> e <span className="text-indigo-400">Dependência</span>.</p>
                            </div>
                            {importedRows.length > 0 && (
                                <button
                                    onClick={handleExportAll}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all border shrink-0 ml-4 active:scale-95 ${exportStatus === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-green-600 hover:bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20'}`}
                                >
                                    {exportStatus === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                                    {exportStatus === 'success' ? 'Exportado!' : 'Exportar para CPM'}
                                </button>
                            )}
                        </div>

                        {/* ── Input area (show when no data yet, or reimporting) ── */}
                        {mergePreview === null && importedRows.length === 0 && (
                            <div className="space-y-3">
                                <textarea
                                    ref={tableTextRef}
                                    defaultValue=""
                                    onChange={handleTableInputChange}
                                    className="w-full h-40 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-200 focus:border-blue-500 outline-none resize-none font-mono text-sm"
                                    placeholder={`| Cód. | Pacote de Trabalho | Duração (Meses) | Custo Est. (US$) | Dependência |\n|------|-------------------|-----------------|-----------------|-------------|\n| 1.1  | Licenciamento e Setup | 12 | 150M | - |\n| 2.1  | Geologia e Utilidades | 18 | 200M | 1.1 |\n| 3.1  | Ted Williams Tunnel   | 36 | 600M | 2.1 |`}
                                />
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleProcessTable}
                                        disabled={!hasTableText}
                                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
                                    >
                                        <Layers className="h-4 w-4" />
                                        Processar Tabela
                                    </button>
                                    <p className="text-xs text-slate-500">Aceita Markdown (<code className="text-blue-400">|</code>), TSV (tab) ou CSV. Colunas mínimas: Cód. + Pacote.</p>
                                </div>
                            </div>
                        )}

                        {/* ── Merge Preview ── */}
                        {mergePreview !== null && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold text-slate-300 flex items-center gap-3">
                                        Preview — {mergePreview.length} linha(s)
                                        <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">{mergePreview.filter(r => r.status === 'match').length} match</span>
                                        <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">{mergePreview.filter(r => r.status === 'new').length} novo</span>
                                    </p>
                                    <button onClick={() => setMergePreview(null)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">← Voltar</button>
                                </div>
                                <div className="overflow-auto rounded-2xl border border-slate-800">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-slate-950 border-b border-slate-800">
                                                <th className="px-3 py-2.5 text-left text-slate-500 w-10">Status</th>
                                                <th className="px-3 py-2.5 text-left text-slate-500 w-16">Cód.</th>
                                                <th className="px-3 py-2.5 text-left text-slate-500">Pacote de Trabalho</th>
                                                <th className="px-3 py-2.5 text-right text-amber-400 w-24">Duração</th>
                                                <th className="px-3 py-2.5 text-right text-emerald-400 w-28">Custo</th>
                                                <th className="px-3 py-2.5 text-left text-indigo-400 w-32">Predecessora(s)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mergePreview.map((result, idx) => (
                                                <tr key={idx} className="border-b border-slate-800/40 hover:bg-slate-800/20">
                                                    <td className="px-3 py-2 text-center text-base">
                                                        <span title={result.status === 'match' ? `Nó EAP encontrado: "${result.existingNome}"` : 'Novo nó será criado na EAP'}>
                                                            {result.status === 'match' ? '✅' : '⚠️'}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 font-mono text-slate-400 font-bold">{result.row.code}</td>
                                                    <td className="px-3 py-2 text-slate-200">
                                                        {result.row.nome}
                                                        {result.status === 'match' && result.existingNome && result.existingNome !== result.row.nome && (
                                                            <span className="ml-2 text-[10px] text-amber-400/70">(EAP: {result.existingNome})</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-slate-400 font-mono">{result.row.duracao ? `${result.row.duracao}m` : '—'}</td>
                                                    <td className="px-3 py-2 text-right text-emerald-300 font-mono font-bold">{result.row.custo ? formatCostShort(result.row.custo) : '—'}</td>
                                                    <td className="px-3 py-2 text-indigo-300 font-mono">{result.row.dependencias.length > 0 ? result.row.dependencias.join(', ') : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={handleConfirmMerge} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all">
                                        <CheckCircle2 className="h-4 w-4" /> Confirmar Smart Merge
                                    </button>
                                    <button onClick={() => setMergePreview(null)} className="px-4 py-2.5 text-slate-400 hover:text-white text-sm transition-colors">Cancelar</button>
                                </div>
                            </div>
                        )}

                        {/* ── Result table (after merge) ── */}
                        {mergePreview === null && importedRows.length > 0 && (
                            <div className="space-y-3">
                                <div className="overflow-auto rounded-2xl border border-slate-800">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-slate-950 border-b border-slate-800">
                                                <th className="px-3 py-2.5 text-center text-slate-500 w-8"></th>
                                                <th className="px-3 py-2.5 text-left text-slate-500 w-14">Cód.</th>
                                                <th className="px-3 py-2.5 text-left text-slate-500">Pacote de Trabalho</th>
                                                <th className="px-3 py-2.5 text-right text-amber-400 w-20">Duração</th>
                                                <th className="px-3 py-2.5 text-right text-emerald-400 w-32">Custo Total</th>
                                                <th className="px-3 py-2.5 text-left text-indigo-400 w-28">Predecessora(s)</th>
                                                <th className="px-3 py-2.5 text-center text-slate-500 w-20">Sub</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importedRows.map((row, idx) => {
                                                const isExpanded = expandedCostRows.has(row.code)
                                                const subs = subCosts[row.code] || []
                                                const subTotal = subs.reduce((s, r) => s + r.custo, 0)
                                                const overBudget = row.custo !== null && subTotal > row.custo && subs.length > 0
                                                return (
                                                    <React.Fragment key={row.code}>
                                                        <tr className={`border-b border-slate-800/40 hover:bg-slate-800/20 ${idx % 2 === 0 ? '' : 'bg-slate-900/20'}`}>
                                                            <td className="px-3 py-2 text-center">
                                                                <button onClick={() => { const next = new Set(expandedCostRows); if (isExpanded) { next.delete(row.code) } else { next.add(row.code) } setExpandedCostRows(next) }} className="text-slate-500 hover:text-slate-200 transition-colors">
                                                                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                                                </button>
                                                            </td>
                                                            <td className="px-3 py-2 font-mono text-slate-400 font-bold">{row.code}</td>
                                                            <td className="px-3 py-2 text-slate-200 font-medium">{row.nome}</td>
                                                            <td className="px-3 py-2 text-right text-slate-400 font-mono">{row.duracao ? `${row.duracao}m` : '—'}</td>
                                                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-300">
                                                                {row.custo ? formatCostShort(row.custo) : '—'}
                                                                {subs.length > 0 && <span className={`ml-1 text-[10px] ${overBudget ? 'text-rose-400' : 'text-slate-500'}`}>({formatCostShort(subTotal)})</span>}
                                                            </td>
                                                            <td className="px-3 py-2 text-indigo-300 font-mono">{row.dependencias.length > 0 ? row.dependencias.join(', ') : '—'}</td>
                                                            <td className="px-3 py-2 text-center">
                                                                <button onClick={() => { const next = new Set(expandedCostRows); next.add(row.code); setExpandedCostRows(next); if (!subCosts[row.code]?.length) { setSubCosts(prev => ({ ...prev, [row.code]: [{ code: `${row.code}.1`, nome: '', custo: 0 }] })) } }} className="text-xs text-blue-400 hover:text-blue-300 transition-colors px-2 py-0.5 border border-blue-500/20 rounded hover:bg-blue-500/10">+ Sub</button>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <>
                                                                {overBudget && (
                                                                    <tr><td colSpan={7} className="px-6 py-1.5 bg-rose-500/10 border-b border-rose-500/20"><span className="text-rose-400 text-[11px] font-semibold">⚠️ Soma das sub-tarefas ({formatCostShort(subTotal)}) excede o total do grupo ({formatCostShort(row.custo!)})</span></td></tr>
                                                                )}
                                                                {subs.map((sub, si) => (
                                                                    <tr key={sub.code} className="bg-slate-800/20 border-b border-slate-800/30">
                                                                        <td className="px-3 py-1.5"></td>
                                                                        <td className="px-3 py-1.5 font-mono text-slate-500 text-[10px] pl-6">{sub.code}</td>
                                                                        <td className="px-3 py-1.5">
                                                                            <input type="text" value={sub.nome} onChange={(e) => { const u = [...subs]; u[si] = { ...u[si], nome: e.target.value }; setSubCosts(prev => ({ ...prev, [row.code]: u })) }} placeholder="Nome da sub-tarefa..." className="w-full bg-transparent border-none outline-none text-xs text-slate-300 placeholder-slate-600" />
                                                                        </td>
                                                                        <td className="px-3 py-1.5 text-right text-slate-600 text-[10px]">—</td>
                                                                        <td className="px-3 py-1.5">
                                                                            <div className="flex items-center justify-end gap-1">
                                                                                <span className="text-slate-500 text-[10px]">US$</span>
                                                                                <input type="number" min="0" value={sub.custo || ''} onChange={(e) => { const u = [...subs]; u[si] = { ...u[si], custo: Number(e.target.value) || 0 }; setSubCosts(prev => ({ ...prev, [row.code]: u })) }} placeholder="0" className="w-24 text-right bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded px-2 py-0.5 text-emerald-300 font-mono text-xs outline-none" />
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-3 py-1.5 text-slate-600 text-[10px]">—</td>
                                                                        <td className="px-3 py-1.5 text-center"><button onClick={() => { const u = subs.filter((_, i) => i !== si); setSubCosts(prev => ({ ...prev, [row.code]: u })) }} className="text-rose-500 hover:text-rose-400"><Trash2 className="h-3 w-3" /></button></td>
                                                                    </tr>
                                                                ))}
                                                                <tr className="bg-slate-800/10 border-b border-slate-800/20">
                                                                    <td colSpan={7} className="px-3 py-1.5 text-center">
                                                                        <button onClick={() => { const nextIdx = subs.length + 1; setSubCosts(prev => ({ ...prev, [row.code]: [...(prev[row.code] || []), { code: `${row.code}.${nextIdx}`, nome: '', custo: 0 }] })) }} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">+ Adicionar sub-tarefa</button>
                                                                    </td>
                                                                </tr>
                                                            </>
                                                        )}
                                                    </React.Fragment>
                                                )
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t border-slate-700 bg-slate-950">
                                                <td colSpan={4} className="px-3 py-2.5 text-xs font-bold text-slate-400 uppercase">Total</td>
                                                <td className="px-3 py-2.5 text-right font-bold font-mono text-emerald-400">{formatCostShort(importedRows.reduce((s, r) => s + (r.custo || 0), 0))}</td>
                                                <td colSpan={2}></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                                <div className="flex justify-between items-center">
                                    <button onClick={() => { setImportedRows([]); if (tableTextRef.current) tableTextRef.current.value = ''; setHasTableText(false) }} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">↩ Reimportar tabela</button>
                                    <p className="text-[10px] text-slate-600">{importedRows.length} grupo(s) · {importedRows.filter(r => r.dependencias.length > 0).length} com predecessoras · Clique &quot;Exportar para CPM&quot; para ativar Camada 1</p>
                                </div>
                            </div>
                        )}
                    </div>
                    )}

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
                            <li>• Use <strong>Colar Estrutura</strong> para importar listas de tarefas prontas.</li>
                            <li>• O botão de <strong>Duplicar</strong> clona o item e todos os seus filhos.</li>
                            <li>• As &quot;Folhas&quot; (nodes finais) compõem o cronograma matemático.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
