# Story KLAUSS-1 — KLAUSS-MATED: Conectar UI ao endpoint klauss-to-mated
**Épico:** EP-05 Execução
**Sprint:** KLAUSS-MATED
**Status:** Done
**Agentes:** @dev (Dex)

## User Story
Como PM, quero que o botão "Analisar Impacto" no Diário PM/PO chame o endpoint real `/api/ai/klauss-to-mated`, para que as análises de impacto no CDT sejam geradas pelo Klauss com IA real (Groq/LLM) ao invés de um mock estático.

## Acceptance Criteria
- [x] AC-1: `handleKlaussAnalysis` chama `POST /api/ai/klauss-to-mated` com `{ descricao: note, projetoId, taAtual, tmAtual }`
- [x] AC-2: O insight exibido usa `resultado.justificativa` e `resultado.zona_estimada` da resposta real
- [x] AC-3: Bug fix: remover `tenant_id` do insert em `decisoes_mated` (coluna não existe na tabela)
- [x] AC-4: Fallback offline: quando API retorna erro 5xx ou rede falha, exibe mensagem de erro amigável
- [x] AC-5: TypeCheck: 0 erros

## Tasks
- [x] 1. Fix bug tenant_id no insert de decisoes_mated em route.ts
- [x] 2. Conectar handleKlaussAnalysis ao endpoint real com fetch
- [x] 3. Mapear resposta real para formato do klaussInsight state

## File List
- `src/app/api/ai/klauss-to-mated/route.ts` *(bug fix)*
- `src/app/(dashboard)/[projetoId]/governanca/gerenciamento/page.tsx` *(modificado)*

## Definition of Done
- [x] Botão "Analisar Impacto" chama API real
- [x] Bug tenant_id corrigido
- [x] TypeCheck: 0 erros

## QA Results
```yaml
storyId: KLAUSS-1
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-18 | @dev (Dex) | Story criada e implementada — Sprint KLAUSS-MATED |
