# CASO DE TESTE: Boston Big Dig (Central Artery/Tunnel Project)
## Dados Reais para Validacao do Metodo Aura
**Fontes:** PMI, Mass.gov, FHWA, GAO
**Preparado por:** Squad Aura | 2026-03-14

---

## 1. TAP — TERMO DE ABERTURA (Dados Baseline)

### 1.1 Identificacao
- **Nome:** Central Artery/Tunnel Project (Big Dig)
- **Localizacao:** Boston, Massachusetts, EUA
- **Sponsor:** Massachusetts Turnpike Authority
- **Gestor:** Bechtel/Parsons Brinckerhoff (JV)
- **Tipo:** Megaprojeto de infraestrutura rodoviaria

### 1.2 Justificativa
A elevada Central Artery (I-93) transportava 75.000 veiculos/dia na inauguracao (1959). No inicio dos anos 1990, o trafego atingiu 200.000+ veiculos/dia. A taxa de acidentes era 4x a media nacional. Sem intervencao, projecoes indicavam engarrafamento de 16 horas/dia ate 2010, com custo anual de congestionamento de US$500 milhoes para motoristas.

### 1.3 Objetivo SMART
Substituir a Central Artery elevada de 6 faixas por uma via expressa subterranea de 8-10 faixas, estender a I-90 ate o Logan Airport, construir a ponte Leonard P. Zakim sobre o Charles River, e reconectar o centro de Boston ao waterfront, gerando 300+ acres de espaco publico.

### 1.4 Escopo Sintetizado
- 7.8 milhas de rodovia (161 lane-miles, ~50% em tuneis)
- 4 grandes intercambios em corredor de 7.5 milhas
- Ted Williams Tunnel (travessia do porto, 90 pes de profundidade)
- Zakim Bunker Hill Bridge (10 faixas, maior ponte estaiada do mundo)
- 7 edificios de ventilacao (entre os maiores do mundo para tuneis)
- Reducao de 27 para 14 rampas de acesso
- 45 parques e pracas publicas (Rose Kennedy Greenway)

### 1.5 Dados Quantitativos Baseline (TAP)

| Metrica | Valor Original (Baseline) |
|---------|--------------------------|
| **Orcamento Aprovado (1987)** | US$ 2.8 bilhoes (estimativa original do Congresso) |
| **Orcamento Aprovado (1990)** | US$ 5.8 bilhoes (estimativa revisada) |
| **Alocacao Federal Inicial (1990)** | US$ 755 milhoes |
| **Prazo Planejado** | 1991-2004 (13 anos de construcao) |
| **Inicio Planejamento** | 1982 |
| **Inicio Construcao** | 1991 |
| **Conclusao Planejada** | 2004 |

### 1.6 Restricoes
- Construcao em area urbana densa sem interromper trafego existente
- 29 milhas de linhas de utilidades de 31 empresas a serem relocadas
- Profundidade maxima: 120 pes (abaixo da Red Line no Dewey Square)
- Requisitos ambientais rigorosos (FEIS/R aprovado em 1985)
- Mitigacao ambiental representou >25% do orcamento

---

## 2. WBS / EAP — ESTRUTURA ANALITICA DO PROJETO

### Nivel 1: Pacotes Principais

```
1. PLANEJAMENTO E APROVACAO
   1.1 Estudo de Impacto Ambiental (FEIS/R) — 1982-1985
   1.2 Aprovacao do Congresso — 1987
   1.3 Design e Engenharia — 1985-1994

2. INFRAESTRUTURA SUBTERRANEA
   2.1 Escavacao (16M yd³) — 541.000 cargas de caminhao
   2.2 Paredes de lama (slurry walls) — 26.000+ pes lineares, 5 milhas
   2.3 Relocacao de utilidades — 29 milhas, 31 empresas
   2.4 Perfuracao geotecnica — 26 contratos separados

3. TUNEIS
   3.1 Ted Williams Tunnel (I-90 ate Logan) — aberto 1995 (comercial)
   3.2 I-93 Northbound Tunnel — aberto marco 2003
   3.3 I-93 Southbound Tunnel — aberto dezembro 2003
   3.4 I-90 Connector — aberto janeiro 2003
   3.5 Silver Line Transit Tunnel

4. PONTES
   4.1 Leonard P. Zakim Bunker Hill Bridge — 10 faixas, 1.820 milhas de cabo
   4.2 Charles River Crossing

5. INTERCAMBIOS
   5.1 Intercambio I-90/I-93
   5.2 Intercambio South Boston
   5.3 Intercambio Leverett Circle
   5.4 Intercambio Airport

6. SISTEMAS
   6.1 Ventilacao — 7 edificios
   6.2 Fibra optica — 5.000 milhas de cabo
   6.3 Telefonia — 200.000 milhas de cabo de cobre
   6.4 Sinalizacao e controle de trafego

7. MITIGACAO AMBIENTAL
   7.1 Rose Kennedy Greenway — 45 parques
   7.2 Spectacle Island Park — 100 acres
   7.3 Plantio — 4.800 arvores + 33.000 arbustos
   7.4 Reducao de CO — meta: 12% citywide

8. GESTAO E OVERHEAD
   8.1 Gestao de Construcao (Bechtel/Parsons)
   8.2 118 contratos de construcao separados
   8.3 Supervisao governamental
```

---

## 3. DADOS DE EXECUCAO (Para Simulacao CDT Dinamica)

### 3.1 Cronograma Real vs Planejado

| Marco | Planejado | Real | Desvio |
|-------|----------|------|--------|
| Inicio Planejamento | 1982 | 1982 | 0 |
| FEIS/R Aprovado | 1984 | 1985 | +1 ano |
| Aprovacao Congresso | 1986 | 1987 | +1 ano |
| Inicio Construcao | 1990 | 1991 | +1 ano |
| Ted Williams Tunnel (comercial) | 1995 | 1995 | 0 |
| I-90 Connector aberto | 2001 | Jan 2003 | +2 anos |
| I-93 NB aberto | 2001 | Mar 2003 | +2 anos |
| I-93 SB aberto | 2002 | Dez 2003 | +1 ano |
| Conclusao Majoritaria | 2004 | Jan 2006 | +2 anos |
| Conclusao Total | 2004 | 2007 | +3 anos |

**Prazo Total Real:** 1991-2007 = **16 anos** (vs 13 planejados = **+23% de desvio**)

### 3.2 Custo Real vs Planejado

| Marco Temporal | Estimativa | Variacao |
|---------------|-----------|----------|
| 1985 (concepcao) | US$ 2.8 bilhoes | Baseline original |
| 1990 (revisao) | US$ 5.8 bilhoes | +107% vs 1985 |
| 1992 | US$ 7.7 bilhoes | +175% vs 1985 |
| 2000 | US$ 10.8 bilhoes | +286% vs 1985 |
| 2003 | US$ 14.6 bilhoes | +421% vs 1985 |
| **Final (com juros)** | **US$ 24.3 bilhoes** | **+768% vs baseline** |
| **Final (sem juros)** | **US$ 14.8 bilhoes** | **+429% vs baseline** |

**Fontes de Financiamento Final:**
- Federal: US$ 7.0 bilhoes
- State Bonds: US$ 7.8 bilhoes (pagamento via pedagios ate 2038)

### 3.3 Burn Rate (Para Calculo de Tangentes)

| Periodo | Investimento Diario | Observacao |
|---------|-------------------|-----------|
| 1991-1998 | ~US$ 1.5M/dia | Fase inicial, escavacao |
| 1999-2002 (pico) | **US$ 3.0M/dia** | Pico de construcao |
| 2003-2007 | ~US$ 1.0M/dia | Finalizacao e comissionamento |
| **Forca de trabalho pico** | **5.000 trabalhadores** | 150 guindastes |

### 3.4 Resultados Obtidos (Beneficios)

| Metrica | Valor |
|---------|-------|
| Reducao tempo viagem I-90/I-93→Logan | -42% a -74% |
| Reducao horas-veiculo nas vias do projeto | -62% (1995-2003) |
| Economia anual tempo/custo | US$ 168 milhoes/ano |
| Reducao CO citywide | -12% |
| Investimento privado atraido | US$ 7 bilhoes |
| Empregos gerados | 43.000+ |
| Unidades habitacionais | 7.700 (1.000 acessiveis) |
| Espaco comercial | 10M ft² escritorios + retail |

---

## 4. PARAMETROS PARA SIMULACAO Aura

### 4.1 TAP Input (Baseline 1987)

```json
{
  "nome_projeto": "Boston Central Artery/Tunnel Project (Big Dig)",
  "justificativa": "Substituir I-93 elevada deteriorada. Trafego 4x capacidade, acidentes 4x media nacional. Projecao: 16h/dia de congestionamento ate 2010, custo US$500M/ano.",
  "objetivo_smart": "Construir 7.8mi de rodovia subterranea (161 lane-miles), 2 pontes, 4 intercambios, conectar I-90 ao Logan Airport, gerar 300+ acres de espaco publico ate 2004.",
  "escopo_sintetizado": "Megaprojeto de infraestrutura: substituicao de elevada por tuneis, pontes e parques em area urbana densa.",
  "orcamento_total": 2800000000,
  "prazo_total": 4745,
  "restricoes": "Construcao urbana sem interromper trafego. 29mi utilidades. Mitigacao ambiental >25% budget. Profundidade max 120ft."
}
```

**Nota:** `prazo_total = 4745 dias` (1991-2004, 13 anos × 365)

### 4.2 Pontos de Simulacao CDT (Anuais)

Para simular o CDT dinamico, usamos os dados de custo acumulado e prazo consumido:

| Ano | Dia (desde 1991) | Custo Acumulado (US$B) | % BAC Consumido | % Prazo Consumido | Evento |
|-----|------------------|----------------------|-----------------|-------------------|--------|
| 1991 | 0 | 0.0 | 0% | 0% | Baseline (triangulo equilatero) |
| 1993 | 730 | 1.5 | 10% | 15% | Escavacao inicial |
| 1995 | 1460 | 3.0 | 20% | 31% | Ted Williams Tunnel abre |
| 1997 | 2190 | 5.0 | 34% | 46% | Revisao de custo para $7.7B |
| 1999 | 2920 | 7.0 | 47% | 62% | Inicio pico US$3M/dia |
| 2001 | 3650 | 9.5 | 64% | 77% | Atraso critico, revisao $10.8B |
| 2003 | 4380 | 12.0 | 81% | 92% | Aberturas I-90/I-93, custo $14.6B |
| 2004 | 4745 | 13.5 | 91% | 100% | Prazo original esgotado |
| 2006 | 5475 | 14.5 | 98% | 115% | Conclusao majoritaria |
| 2007 | 5840 | 14.8 | 100% | 123% | Conclusao final |

### 4.3 O que Esperar do CDT em Cada Ponto

**@aura-production analisa:**

| Ponto | CEt | Triangulo Esperado | MATED Esperado | Narrativa @aura-klauss |
|-------|-----|-------------------|----------------|----------------------|
| 1991 | Valida | Equilatero (E=C=P=1) | d=0 (otimo) | "Projeto no plano." |
| 1995 | Valida | Ligeiramente deformado (custo proporcional) | d<0.05 | "Dentro da ZRE." |
| 1997 | Valida | C cresce (custo acelerando) | d≈0.08 | "Atencao: burn rate acima do baseline." |
| 1999 | Valida | C>>P (custo dispara, prazo atrasando) | d≈0.12 | "ALERTA: Aproximando threshold. Custo a US$3M/dia." |
| 2001 | **MARGINAL** | Obtusangulo (C domina) | d≈0.18 | "**CRISE GEOMETRICA**: Custo 3.4x baseline. Recomendo War Room." |
| 2003 | **MARGINAL** | Fortemente deformado | d≈0.22 | "Crise mantida. CEt quase violada." |
| 2004 | Violada? | Prazo esgotado, custo continua | d>0.25 | "Prazo original expirou. Projeto em re-ancoragem forcada." |
| 2007 | Pos-reancoragem | Novo baseline necessario | — | "Conclusao com 429% de estouro." |

---

## 5. CRITERIOS DE AFERIMENTO DO METODO

### 5.1 O Aura Teria Alertado?

Se o metodo funcionar corretamente, o sistema deveria:

| Ano | O que Aconteceu na Realidade | O que o Aura Deveria Ter Alertado |
|-----|------------------------------|----------------------------------|
| 1997 | Revisao silenciosa de US$5.8B→$7.7B | CEt estavel MAS Desvio de Qualidade caindo (~70%). MATED d≈0.08 → alerta amarelo |
| 1999 | Burn rate dispara para US$3M/dia | Tangente de custo muda drasticamente. CEt ainda valida mas triangulo deformando. MATED d>0.10 → alerta laranja |
| 2001 | Custo revisado para US$10.8B (+286%) | **CEt marginal. Triangulo obtusangulo. MATED d>0.15 → CRISE. War Room acionado.** |
| 2003 | Custo em US$14.6B | Area do triangulo <30% do original. Desvio de Qualidade critico. Klauss recomenda re-ancoragem |

### 5.2 Metricas de Eficiencia do Metodo

| Metrica | Como Medir | Valor de Referencia |
|---------|-----------|-------------------|
| **Antecipacao de Crise** | Anos entre alerta Aura e reconhecimento publico | Se Aura alerta em 1997 e crise reconhecida em 2001 → 4 anos de antecipacao |
| **Precisao CEt** | CEt violada quando projeto ficou inviavel na realidade? | Validar contra decisao de re-baseline |
| **Desvio de Qualidade** | A_atual/A_original correlaciona com custo overrun real? | 429% overrun deveria refletir area <<100% |
| **Direcao MATED** | MATED indica corretamente CUSTO como dimensao critica? | Big Dig foi primariamente estouro de custo |
| **Prescricao Klauss** | Rotas de escape sao viaveisna retrospectiva? | "Reduzir escopo" vs "injetar capital" vs "estender prazo" |

---

*Dados compilados pelo Squad Aura para validacao do MetodoAura | 2026-03-14*
*Fontes: Mass.gov, FHWA, PMI Learning Library, GAO Reports*
