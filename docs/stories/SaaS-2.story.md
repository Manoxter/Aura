# Story SaaS-2 — Onboarding: Primeiro Projeto Guiado
**Épico:** EP-SaaS Infraestrutura SaaS
**Sprint:** SAAS-CORE
**Status:** Done
**DRI:** @ux-design-expert (Uma)
**Agentes:** @ux-design-expert (Uma), @dev (Dex), @aura-pm (Dr. Kenji)
**Pré-requisito:** SaaS-1 (Auth UX funcional)

---

## User Story
Como PM que acabou de criar conta no Aura,
quero ser guiado na criação do meu primeiro projeto com contexto sobre o MetodoAura,
para que eu entenda o valor do produto sem precisar ler documentação antes de começar.

## Background
Usuário novo entra no Aura e vê um dashboard vazio. Não sabe:
- O que é o "Triângulo CDT"
- O que precisa preencher antes do motor funcionar
- Qual é a sequência correta (SETUP → MOTOR → GOVERNANÇA)
- O que significa cada zona MATED

O onboarding deve ser: rápido (< 5 minutos), orientado ao valor (não tutorial de features), e deixar o usuário com um projeto parcialmente preenchido ao final.

## Acceptance Criteria
- [x] AC-1: Novo usuário (primeira sessão após register) é redirecionado para `/onboarding` antes do dashboard — via `OnboardingGuard` + `AuthContext.onboardingCompleted`
- [x] AC-2: Step 1 — "Qual é o seu projeto?" — nome, tipo (construção/software/evento/outro), setor, data início e fim
- [x] AC-3: Step 2 — "Defina as 3 dimensões do seu triângulo" — Escopo (nº tarefas estimadas), Prazo (data fim), Orçamento (valor total) com explicação de uma linha para cada
- [x] AC-4: Step 3 — "Adicione sua primeira tarefa" — nome, duração, responsável (opcional)
- [x] AC-5: Ao completar os 3 steps: projeto criado no Supabase + redirect para Dashboard com triângulo CDT visível
- [x] AC-6: Banner "Continue o setup" no dashboard (`SetupContinueBanner`) — verifica `onboarding_completed` e projetos existentes
- [x] AC-7: Skip disponível em cada step ("Pular — configuro depois") sem bloquear acesso
- [x] AC-8: Flag `onboarding_completed` salva no perfil do usuário (coluna `tenants.onboarding_completed`) — onboarding não reaparece após completado/pulado
- [x] AC-9: `useFirstVisit(sectionKey)` implementado — localStorage por seção, isFirstVisit + markVisited()

## Tasks
- [x] 1. Criar rota `/onboarding` com stepper 3 steps
- [x] 2. Criar lógica de detecção de primeiro acesso: verificar `onboarding_completed` no perfil
- [x] 3. Criar formulário Step 1: dados básicos do projeto + validação
- [x] 4. Criar formulário Step 2: dimensões CDT com explicação contextual
- [x] 5. Criar formulário Step 3: primeira tarefa
- [x] 6. Conectar ao Supabase: criar projeto + primeira tarefa ao completar step 3
- [x] 7. Salvar `onboarding_completed: true` no perfil do usuário ao final
- [x] 8. Criar sistema de tooltip de primeiro acesso (LocalStorage por seção) — `useFirstVisit`
- [x]  Testar fluxo completo: novo usuário → onboarding → dashboard com triângulo visível

## File List
- `src/app/onboarding/page.tsx` (refatorado — stepper 3 steps CDT)
- `src/components/Onboarding/OnboardingStep1.tsx` (criado)
- `src/components/Onboarding/OnboardingStep2.tsx` (criado)
- `src/components/Onboarding/OnboardingStep3.tsx` (criado)
- `src/components/Onboarding/OnboardingGuard.tsx` (criado — redirect guard)
- `src/components/Onboarding/SetupContinueBanner.tsx` (criado — AC-6)
- `src/hooks/useFirstVisit.ts` (criado — AC-9)
- `src/context/AuthContext.tsx` (atualizado — expõe `onboardingCompleted`)
- `src/app/dashboard/page.tsx` (atualizado — SetupContinueBanner + OnboardingGuard)
- `supabase/migrations/20260317100000_onboarding_completed.sql` (criado)

## Definition of Done
- [x] Novo usuário é redirecionado para onboarding na primeira sessão
- [x] Fluxo completo cria projeto + tarefa no Supabase
- [x] `onboarding_completed` persiste (não reaparece)
- [x] Skip funciona sem bloquear acesso
- [x] TypeCheck 0 erros nos arquivos novos, 211 testes passando

## Escopo
**IN:** Stepper 3 steps, detecção de primeiro acesso, criação de projeto + tarefa, flag de onboarding_completed, banner de continuação, tooltips de primeiro acesso por seção.
**OUT:** Não inclui tour interativo (produto tour library), não cria projeto-demo pré-preenchido, não cobre onboarding para usuários convidados (membros de projeto existente — fluxo diferente), não inclui vídeos ou GIFs explicativos.

## Estimativa
**Esforço:** 6h | **Complexidade:** M

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Usuário que pula o onboarding chega ao dashboard vazio sem contexto — mesma situação atual | Alta | Médio | Banner "Continue o setup" no dashboard + Empty states contextuais (DS-4) já cobrem o pós-skip |
| Criar projeto no Supabase durante onboarding pode falhar silenciosamente — usuário conclui os 3 steps mas projeto não existe | Média | Alto | Mostrar estado de loading ao salvar + toast de erro (DS-2) se falhar + retry manual |

## QA Results
```yaml
storyId: SaaS-2
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-17 | @po (Pax) | Story criada — Status: Ready |
| 2026-03-17 | @dev (Dex) | Implementação completa — AC-1 a AC-9, 211 testes passando |
