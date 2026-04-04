# Story FERR-1 — FERRAMENTAS: Caixa de Ferramentas em Gerenciamento e Gabinete de Crise
**Épico:** EP-05 Execução
**Sprint:** FERRAMENTAS
**Status:** Done
**Agentes:** @dev (Dex)

## User Story
Como PM, quero uma "Caixa de Ferramentas" nas páginas de Gerenciamento e Gabinete de Crise, para que eu tenha acesso imediato a ferramentas de gestão (5W2H, Ishikawa, PDCA, EOQ, Simplex; Árvore de Decisão, FTA, Monte Carlo, FMEA, 5 Porquês) com guias de aplicação em contexto CDT — e o Klauss destaca automaticamente a ferramenta mais adequada à zona atual.

## Acceptance Criteria
- [x] AC-1: Componente `CaixaFerramentas` aceita lista de ferramentas + ID da ferramenta recomendada pelo Klauss
- [x] AC-2: Ferramenta recomendada pelo Klauss exibe badge "⭐ Klauss" em âmbar
- [x] AC-3: Clicar em uma ferramenta abre modal com guia de aplicação passo-a-passo
- [x] AC-4: Gerenciamento page inclui 5 ferramentas de diagnóstico: 5W2H, Ishikawa, PDCA, EOQ, Simplex
- [x] AC-5: Gabinete de Crise inclui 5 ferramentas de resposta: Árvore de Decisão, FTA, Monte Carlo, FMEA, 5 Porquês
- [x] AC-6: Klauss sugere baseado em zona_mated: OTIMO→PDCA, SEGURO→5W2H, RISCO→Ishikawa, CRISE→Simplex (Gerenciamento); em crise→FTA, saudável→5Porquês (Gabinete)
- [x] AC-7: TypeCheck: 0 erros

## Tasks
- [x] 1. Criar componente `CaixaFerramentas` com grid de cards + modal de guia
- [x] 2. Definir 5 ferramentas de diagnóstico para Gerenciamento com guias
- [x] 3. Adicionar CaixaFerramentas ao gerenciamento/page.tsx com lógica de recomendação
- [x] 4. Definir 5 ferramentas de crise para Gabinete com guias
- [x] 5. Adicionar CaixaFerramentas ao gabinete/page.tsx com lógica de recomendação

## File List
- `src/components/aura/CaixaFerramentas.tsx` *(novo)*
- `src/app/(dashboard)/[projetoId]/governanca/gerenciamento/page.tsx` *(modificado)*
- `src/app/(dashboard)/[projetoId]/governanca/gabinete/page.tsx` *(modificado)*

## Definition of Done
- [x] Caixa de Ferramentas em ambas as páginas
- [x] Modal com guias passo-a-passo
- [x] Klauss recomenda baseado na zona atual
- [x] TypeCheck: 0 erros

## QA Results
```yaml
storyId: FERR-1
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-18 | @dev (Dex) | Story criada e implementada — Sprint FERRAMENTAS |
