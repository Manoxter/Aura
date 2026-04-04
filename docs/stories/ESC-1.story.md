# Story ESC-1 — Normalizacao em Espaco Geometrico Comum

**Epic:** EP-ESCALENO
**Sprint:** G1 — Fundacao Matematica Escalena
**Status:** Done
**Data:** 2026-03-29
**Criado por:** @sm (River) | **Validado por:** @po (Pax)
**Squad:** @aura-math, @roberta, @dev (Dex)
**Complexidade:** XL | **Prioridade:** CRITICA

---

## Contexto

A formula atual `mc_norm = |slope| / avgRate` normaliza cada curva pelo seu proprio espaco [0,1], eliminando a diferenca de forma entre custo e prazo. O resultado e C ≈ P → isosceles artificial.

A nova formula mede C e P no MESMO espaco geometrico, com E como denominador comum, permitindo triangulos escalenos naturais.

---

## Acceptance Criteria

### AC-1: Nova formula de normalizacao
- [ ] `mc_norm` e `mp_norm` computados no MESMO espaco normalizado
- [ ] Formula: `mc_[01] = slope_reta_mestra_custo / (custoRange / prazoBase)` e `mp_[01] = slope_reta_mestra_burndown / (burndownRange / prazoBase)`
- [ ] Ambos divididos pela mesma referencia temporal (E = prazoBase normalizado)
- [ ] C = sqrt(1 + mc_[01]^2), P = sqrt(1 + mp_[01]^2) no espaco comum

### AC-2: E como ancora geometrica
- [ ] E permanece como ancora constante = 1.0 (ou n_tarefas_atual/n_tarefas_baseline)
- [ ] C e P sao expressos como proporcao do espaco comum, nao do proprio espaco
- [ ] Normalizacao pos-calculo: En=1.0, Cn=C_raw/E, Pn=P_raw/E (mantida)

### AC-3: Escaleno no baseline
- [ ] Projeto Aurora v2 com 15 tarefas CPM produz C != P no dia 0
- [ ] Diferenca |C - P| > 0.01 para qualquer projeto com curvas de forma diferente
- [ ] Isosceles (C ≈ P) so ocorre quando curvas tem forma IDENTICA

### AC-4: CEt preservada
- [ ] CEt dupla (pre + pos normalizacao) validada com novos valores
- [ ] Nenhum projeto existente que passava na CEt deve falhar com a nova formula
- [ ] Se falhar: registrar e investigar (pode ser bug pre-existente revelado)

### AC-5: Coerencia com MetodoAura
- [ ] Formula alinhada com MetodoAura.md §2.2.3
- [ ] Atualizar MetodoAura.md se a formula difere da descricao atual
- [ ] R² permanece como metadado (nao afeta os lados)

---

## Scope

### IN
- `src/lib/engine/math.ts`: refatorar `gerarTrianguloCDT()` v2 path (linhas 560-633)
- `src/lib/engine/math.ts`: ajustar `buildRetaMestra()` se necessario
- MetodoAura.md §2.2.3: atualizar formula se diferir

### OUT
- Visualizacao (ESC-4)
- Mapeamento inverso (ESC-6)
- Testes (ESC-3 — sprint dedicado)
- Qualquer mudanca no setup ou forma de preencher dados

---

## Notas Tecnicas (@aura-math)

A chave e usar o MESMO denominador para ambas as curvas:

```typescript
// ANTES (espaco proprio — gera isosceles):
const avgCustoRate = custoRange / totalDiasCusto     // ← denominador proprio
const avgPrazoRate = burndownRange / totalDiasPrazo   // ← denominador proprio

// DEPOIS (espaco comum — gera escaleno):
// O espaco comum e [0, T] × [0, 1] onde T = prazoBase
// custoRange e burndownRange ja normalizam o eixo Y para [0,1]
// A diferenca esta em que agora AMBOS usam o mesmo T como referencia temporal
const T = Math.max(totalDiasCusto, totalDiasPrazo)    // ← denominador comum
const avgCustoRate = custoRange / T
const avgPrazoRate = burndownRange / T
```

O time matematico tem liberdade para ajustar a formulacao desde que respeite:
1. Espaco geometrico comum
2. E como ancora
3. Escaleno emergente natural

---

## Arquivos Afetados

| Arquivo | Mudanca |
|---------|---------|
| `src/lib/engine/math.ts` | Refatorar normalizacao em `gerarTrianguloCDT()` |
| `MetodoAura.md` | Atualizar §2.2.3 se necessario |

---

## Change Log

| Data | Agente | Mudanca |
|------|--------|---------|
| 2026-03-29 | @sm | Story criada |
| 2026-03-29 | @po | Validada → Ready |
| 2026-03-29 | @dev | Implementado — commit 77b2a8e |
