# Story FIX-A1 — Gantt Prazo: Fallback quando prazoEfetivo=0

**Épico:** FIX — Correções Sprint A (25-26/03/2026)
**Status:** Done
**Prioridade:** P0 — Crítico
**Deadline:** 26/03/2026
**Assignee:** @dev (Dex)
**QA:** @qa (Quinn)
**Push:** @devops (Nexus)
**Valida:** @aura-production

---

## Contexto

O mini-Gantt de paralelismo de tarefas na aba Prazo (funcoes/page.tsx) não renderiza quando `prazoEfetivo` é null ou zero. Isso ocorre quando:
1. CPM não foi rodado → `prazoBase = 0`
2. TAP não tem `prazo_total` → `prazoLimiteSuperior = null`
3. `dataBaseline` não configurado

O resultado é que o usuário vê o gráfico de burndown, mas o Gantt abaixo fica invisível mesmo com tarefas carregadas.

---

## User Story

Como PM visualizando a aba Prazo, quero ver o Gantt CPM de paralelismo de tarefas mesmo quando o prazo oficial ainda não foi configurado, para entender a distribuição temporal das tarefas no CPM.

---

## Acceptance Criteria

- [ ] **AC-1:** Gantt aparece quando `tarefas.length > 0` e pelo menos uma tarefa tem `ef > 0` (CPM rodado)
- [ ] **AC-2:** Gantt aparece quando `tarefas.length > 0` e `prazoBase > 0` (CPM calculou duração)
- [ ] **AC-3:** Gantt aparece quando TAP tem `prazo_total > 0` mesmo sem CPM
- [ ] **AC-4:** Gantt **não** aparece quando `tarefas = []`
- [ ] **AC-5:** O denominador `ganttPrazoDenom` nunca é 0 dentro do bloco de renderização
- [ ] **AC-6:** Barras não excedem 100% de largura (cap com `Math.min`)
- [ ] **AC-7:** Largura mínima de barra = 0.5% (legibilidade para tarefas curtas)

---

## Implementação

**Arquivo:** `src/app/(dashboard)/[projetoId]/setup/funcoes/page.tsx`

**Linha ~96 — adicionar denominador de emergência após `prazoEfetivo`:**
```typescript
// Denominador para o Gantt — usa prazoEfetivo ou ef máximo das tarefas
const ganttPrazoDenom = prazoEfetivo
  || Math.max(...tarefas.map((t: any) => t.ef || 0), 0)
  || prazoBase
  || 0
```

**Linha ~494 — trocar condição de renderização:**
```typescript
// DE:
{tarefas.length > 0 && !!prazoEfetivo && prazoEfetivo > 0 && (
// PARA:
{tarefas.length > 0 && ganttPrazoDenom > 0 && (
```

**Dentro do bloco — trocar referências de `prazoEfetivo` para `ganttPrazoDenom`:**
```typescript
// left: `${(Math.min(t.es || 0, ganttPrazoDenom) / ganttPrazoDenom) * 100}%`
// width: `${Math.max(Math.min((t.duracao_estimada / ganttPrazoDenom) * 100, 100), 0.5)}%`
// span de label: {ganttPrazoDenom}d
```

---

## Definition of Done

- [ ] Typecheck zero erros
- [ ] `npm test` — 568+ testes passando
- [ ] Testado no browser: projeto sem TAP → Gantt visível
- [ ] Testado no browser: projeto com CPM rodado → Gantt visível com barras corretas
- [ ] @aura-production revisou e aprovou
- [ ] Commit com mensagem convencional referenciando FIX-A1
- [ ] Push feito por Nexus

## Files Modified
- `src/app/(dashboard)/[projetoId]/setup/funcoes/page.tsx`
