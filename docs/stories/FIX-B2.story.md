# Story FIX-B2 — Prometeu + Síntese de Clairaut no Fluxo Funções

**Épico:** FIX — Correções Sprint B (27-29/03/2026)
**Status:** Done
**Prioridade:** P1 — Alto
**Deadline:** 29/03/2026
**Assignee:** @dev (Dex)
**QA:** @qa (Quinn)
**Valida:** @aura-math + @roberta + @aura-production
**Pré-requisito:** Story 2.0-engine (Done), FIX-A1, FIX-A2

---

## Contexto

A Síntese de Clairaut (SC) está implementada em `clairaut.ts` e consumida no Triângulo Matriz via `useSinteseClairaut`. O Prometeu Intrínseco (IR, Rα, Rω) está calculado dentro do engine SC.

O usuário definiu a **sequência canônica obrigatória de exibição**:
```
Funções → Retas Tangentes → CEt (máximos/mínimos)
  → Síntese de Clairaut (define formato triangulo + sentidos)
  → Formação TM + Triângulo Órtico + Baricentro
  → Estabelecimento da Área
```

Atualmente essa sequência **não está visível na aba Funções** (`funcoes/page.tsx`). O usuário passa da aba Funções direto para o TM sem ver os resultados intermediários de SC.

---

## User Story

Como PM usando a aba Funções, quero ver após os gráficos de prazo e custo: (1) o resultado da CEt com os valores atuais dos lados, (2) a classificação de Clairaut (agudo/singular/β/γ), (3) os índices Prometeu (IR, Rα, Rω) e (4) a indicação do sentido de contagem dos lados — para entender o estado geométrico do triângulo ANTES de ir para o TM.

---

## Acceptance Criteria

### Bloco CEt (máximos/mínimos)
- [ ] **AC-1:** Após os dois gráficos (prazo + custo), exibir painel "Estado Geométrico CDT"
- [ ] **AC-2:** Mostrar os 3 lados atuais: E, P (OLS prazo), O (OLS custo) com valores numéricos
- [ ] **AC-3:** CEt pré-normalização: `|P-O| < E < P+O` — mostrar como equação visual com ✅/❌
- [ ] **AC-4:** Faixas de contingência e zona operacional (verde/amarela/vermelha) derivadas de Story 3.0

### Bloco Síntese de Clairaut
- [ ] **AC-5:** Classificação atual: `agudo | singular | obtuso_β | obtuso_γ` com ícone/cor
- [ ] **AC-6:** Ângulos α, ω, ε em graus com descrição:
  - α = vértice E-O (oposto a P) = "ângulo do prazo"
  - ω = vértice E-P (oposto a O) = "ângulo do custo"
  - ε = vértice P-O (oposto a E) = "ângulo do escopo"
- [ ] **AC-7:** Sentidos de contagem indicados visualmente:
  - Protocolo β (obtuso em E-O): função custo refletida (m → -m)
  - Protocolo γ (obtuso em E-P): função prazo transladada
  - Agudo: sentidos normais

### Bloco Prometeu Intrínseco
- [ ] **AC-8:** IR (Índice de Risco Intrínseco) = `1 − (ε / 90°)` exibido como barra 0-100%
- [ ] **AC-9:** Rα (risco orçamentário) = `max(0, α − 45°) / 45°` — barra com cor por nível
- [ ] **AC-10:** Rω (risco de prazo) = `max(0, ω − 45°) / 45°` — barra com cor por nível
- [ ] **AC-11:** Estado Singular destacado em laranja com texto explicativo

### Condicionalidade
- [ ] **AC-12:** Bloco só aparece quando `cdtAtual !== null` e `curvaPrazo.length >= 2`
- [ ] **AC-13:** Quando CEt inválida, mostrar apenas diagnóstico de falha (sem SC)
- [ ] **AC-14:** Valores usados: lados do CDT calculado pela aba Funções (não do TM)

---

## Implementação

**Arquivo:** `src/app/(dashboard)/[projetoId]/setup/funcoes/page.tsx`

Após o bloco do gráfico de custo (aba `tarefas`), adicionar seção:
```tsx
{cdtAtual && (
  <div className="mt-6 rounded-2xl bg-slate-900/60 border border-slate-800/60 p-4 space-y-4">
    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
      Estado Geométrico — CEt + Clairaut + Prometeu
    </h3>
    {/* CEt visual */}
    {/* SC classificação */}
    {/* Prometeu IR/Rα/Rω */}
  </div>
)}
```

Reutilizar `useSinteseClairaut` já existente, passando os lados do CDT da aba Funções.

---

## Definition of Done

- [ ] Typecheck zero erros
- [ ] Seção visível na aba Funções após os gráficos
- [ ] Big Dig 1993: SC classifica como obtuso_β (C domina), IR > 0.5
- [ ] @roberta revisou: sequência Funções→CEt→SC→Prometeu está correta
- [ ] @aura-production aprovou layout
- [ ] Commit + Push via Nexus

## Files Modified
- `src/app/(dashboard)/[projetoId]/setup/funcoes/page.tsx`

---

## Resolução @aura-math + @roberta + @aura-production (2026-03-25)

**Conflito C-04 resolvido.** Painel "Estado Geométrico — CEt + Clairaut + Prometeu" implementado em `funcoes/page.tsx` após os gráficos de custo. Exibe: 3 lados brutos (E/P/O), CEt Dupla ✅/❌, protocolo Clairaut (agudo/singular/obtuso_β/obtuso_γ), ângulos α/ω/ε, barras IR/Rα/Rω, nota direcional β/γ. Usa `buildCurvaCusto(useSeed=false)` e `gerarTrianguloCDT` do math engine. Bloco condicional a `ganttPrazoDenom > 0`.

**@roberta:** Sequência Funções → CEt → SC → Prometeu correta e visível antes do TM. ✅
