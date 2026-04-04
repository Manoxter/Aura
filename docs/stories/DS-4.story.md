# Story DS-4 — Design System: Empty States por Etapa do Pipeline
**Épico:** EP-DS Design System
**Sprint:** DS-FOUNDATION
**Status:** Done
**Agentes:** @ux-design-expert (Uma), @visual-designer (Pixel), @dev (Dex)
**Pré-requisito:** DS-1 (tokens documentados), DS-2 (toast system)
**UX:** UX12 — Empty states genéricos não guiam o usuário pelo pipeline

---

## User Story
Como usuário novo ou com projeto recém-criado,
quero ver estados vazios contextuais que me digam o que fazer a seguir,
para que eu não fique perdido sem saber por onde começar no Aura.

## Background
Atualmente, quando não há dados:
- Tabela de tarefas mostra apenas "Nenhuma tarefa" sem CTA
- EAP mostra estrutura vazia sem instrução
- CPM mostra diagrama vazio sem contexto
- Dashboard CDT mostra triângulo degenerado sem explicação
- Klauss mostra campo de chat vazio sem prompt sugerido

O Aura tem um pipeline sequencial: Projeto → Tarefas → EAP → CPM → Calibração → Execução.
Empty states devem guiar o usuário para a PRÓXIMA etapa correta, não apenas informar que está vazio.

## Acceptance Criteria
- [x] AC-1: Componente `EmptyState.tsx` criado com props: `icon`, `title`, `description`, `ctaLabel`, `ctaHref`, `zona` (semântica MATED)
- [x] AC-2: Empty state em `/tasks`: "Nenhuma tarefa ainda" + ícone + CTA "Adicionar primeira tarefa" + dica sobre CDT
- [x] AC-3: Empty state em `/eap`: "EAP não estruturada" + CTA "Ir para Tarefas" (se tasks vazias) OU "Estruturar EAP" (se tasks existem)
- [x] AC-4: Empty state em `/cpm`: "Cronograma não calculado" + CTA "Definir predecessoras" se EAP preenchida
- [x] AC-5: Empty state no Dashboard CDT: "Dados insuficientes para calcular o triângulo" + checklist do que falta (projeto, tarefas, datas)
- [x] AC-6: Empty state no Klauss: mensagem de boas-vindas + 3 prompts sugeridos contextuais ao estágio do projeto
- [x] AC-7: Empty states usam zona semântica correta: info (klauss) para neutros, risco (zona-risco) se dado crítico ausente
- [x] AC-8: Todos os empty states têm ilustração SVG inline (simples, monocromática, usando cor da zona)

## Tasks
- [x] 1. Criar `src/components/ui/EmptyState.tsx` com as props definidas
- [x] 2. Criar 5 ilustrações SVG inline (tasks, eap, cpm, dashboard, klauss) — simples e monocromáticas
- [x] 3. Implementar empty state em CPM page — detectar lista vazia e renderizar EmptyState
- [x] 4. Implementar empty state em EAP page — lógica contextual (tasks vazias vs EAP não estruturada)
- [x] 5. Implementar empty state em CPM Gantt/PERT — detectar ausência de nós
- [x] 6. Implementar empty state no Dashboard CDT — checklist de pré-requisitos faltantes
- [x] 7. Implementar boas-vindas contextuais no Klauss IA — 3 prompts sugeridos por estágio
- [x] 8. Verificar lógica condicional: não mostrar empty state se dados estão carregando (skeleton > empty)

## File List
- `src/components/ui/EmptyState.tsx` (criado)
- `src/app/(dashboard)/[projetoId]/setup/cpm/page.tsx` (modificado — tarefas vazias + PERT/Gantt sem CPM)
- `src/app/(dashboard)/[projetoId]/setup/eap/page.tsx` (modificado — lógica contextual tasks/eap)
- `src/app/(dashboard)/[projetoId]/motor/cdt/page.tsx` (modificado — checklist de pré-requisitos)
- `src/app/(dashboard)/[projetoId]/decisao/ia/page.tsx` (modificado — boas-vindas + prompts contextuais Klauss)

## Definition of Done
- [x] 5 empty states implementados com CTA contextual
- [x] Nenhum empty state mostra apenas texto sem CTA (exceto Klauss que tem prompts)
- [x] Ilustrações SVG usam tokens de cor (não hex hardcoded)
- [x] TypeCheck 0 erros, Lint 0 warnings (novos arquivos limpos; erros preexistentes não introduzidos)
- [x] Testado: 254/254 testes passando

## Escopo
**IN:** Componente EmptyState reutilizável, 5 implementações contextuais (tasks/eap/cpm/dashboard/klauss), ilustrações SVG simples, lógica contextual de CTA por estágio do pipeline, prompts sugeridos no Klauss.
**OUT:** Não inclui onboarding wizard/tour, não cobre loading skeletons (separado), não implementa walkthrough interativo, não cria tutorial em vídeo ou documentação externa.

## Estimativa
**Esforço:** 4h | **Complexidade:** M

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Lógica contextual do EAP empty state (tasks vazias vs EAP não estruturada) requer ler estado global — pode criar dependência de contexto incorreta | Média | Médio | Usar props explícitas (`hasTasks`, `hasEapNodes`) em vez de ler contexto dentro do EmptyState — composição no pai |
| Prompts sugeridos do Klauss podem ficar desatualizados rapidamente à medida que features evoluem | Baixa | Baixo | Externalizar prompts em array de constantes no próprio componente — fácil de editar sem lógica |

## QA Results
```yaml
storyId: DS-4
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-17 | @po (Pax) | Story criada — Status: Ready |
| 2026-03-18 | @dev (Dex) | Implementação completa — Status: Done |
