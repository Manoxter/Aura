# Story FIX-A3 — diaAtualProjeto: Guard contra zero no TM

**Épico:** FIX — Correções Sprint A (25-26/03/2026)
**Status:** Done
**Prioridade:** P0 — Crítico
**Deadline:** 26/03/2026
**Assignee:** @dev (Dex)
**QA:** @qa (Quinn)
**Valida:** @aura-math + @aura-production

---

## Contexto

No Triângulo Matriz (`triangulo-matriz/page.tsx`), quando não há `dataInicio` configurado:
```typescript
if (!dataInicio) return Math.floor(projectDuration * 0.5)
```

Se `projectDuration = 0`, retorna 0. Com `diaAtual = 0`, o CDT calculado é idêntico ao baseline → triângulo equilátero fixo, sem deformação visual, parecendo "bugado" ou "sem efeito".

---

## User Story

Como PM visualizando o Triângulo Matriz, quero que o triângulo sempre mostre alguma deformação do baseline (mesmo que mínima) quando o projeto está em execução, para que o estado atual seja sempre distinguível do estado inicial.

---

## Acceptance Criteria

- [ ] **AC-1:** `diaAtualProjeto` nunca retorna 0 quando o projeto tem tarefas
- [ ] **AC-2:** Default sem `dataInicio`: `Math.max(Math.floor(projectDuration * 0.5), 1)`
- [ ] **AC-3:** Projetos novos sem `dataInicio` e sem CPM: `diaAtual = 1` (mínimo absoluto)
- [ ] **AC-4:** Quando `dataInicio` está configurado, cálculo real é mantido (dias desde início até hoje)
- [ ] **AC-5:** `gerarTrianguloCDT` nunca recebe `diaAtual = 0` (resulta em triângulo igual ao baseline)

---

## Implementação

**Arquivo:** `src/app/(dashboard)/[projetoId]/motor/triangulo-matriz/page.tsx`

**Linha ~209 — corrigir useMemo:**
```typescript
const diaAtualProjeto = useMemo(() => {
    if (!dataInicio) {
        return Math.max(Math.floor(projectDuration * 0.5), 1)  // mínimo 1
    }
    const inicio = new Date(dataInicio)
    const hoje = new Date()
    const diffMs = hoje.getTime() - inicio.getTime()
    const diaAtual = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const maxEf = Math.max(...tarefas.map((t: any) => t.ef || 0), 0)
    return Math.max(Math.min(diaAtual, maxEf || prazoBase || Infinity), 1)
}, [dataInicio, prazoBase, projectDuration, tarefas])
```

---

## Definition of Done

- [ ] Typecheck zero erros
- [ ] `cdt-v2.test.ts` — todos passando
- [ ] Big Dig simulation — timeline correta (equilátero só em 1991)
- [ ] Projeto novo sem dataInicio → TM mostra triângulo levemente deformado
- [ ] @aura-math assinou: diaAtual=1 não quebra invariante CEt
- [ ] Commit + Push via Nexus

## Files Modified
- `src/app/(dashboard)/[projetoId]/motor/triangulo-matriz/page.tsx`
