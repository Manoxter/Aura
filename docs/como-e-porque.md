# Aura — Como e Porque
## Registro de Problemas, Soluções e Fundamentações
**Documento institucional para parceiros e investidores**
**Elaborado por:** Orion (@aiox-master) | **Sessão:** P5 — 2026-03-17
**Destinatário:** Gênesis Empreendimentos — Teresópolis, RJ

---

> Este documento registra cada decisão de design do MetodoAura: qual era o problema original, qual solução foi adotada, como funciona na prática, e por que essa abordagem foi escolhida em detrimento de alternativas.

---

## PARTE I — FUNDAMENTOS DO MÉTODO

---

### P01 — Por que um triângulo?

**Problema:** A gestão de projetos tradicional trata Escopo, Prazo e Custo como três variáveis separadas. Quando uma muda, as outras são afetadas, mas não existe uma métrica única que capture o estado do conjunto.

**Solução:** Representar os três lados como as arestas de um triângulo. A área do triângulo se torna o KPI único de qualidade do projeto.

**Como funciona:** Cada lado do triângulo recebe um valor adimensional (sem unidade de medida). O Escopo é fixado em 1.0 (âncora). O Prazo e o Custo são calculados como proporção entre a taxa real e a taxa planejada. Com três lados, a área é calculada pela Fórmula de Heron.

**Por que:** Geometria analítica é uma linguagem universal, auditável e replicável. Uma área menor que o planejado indica projeto comprimido; maior indica expansão. O número não mente e não depende de interpretação subjetiva.

---

### P02 — O que é o Triângulo Matriz (TM)?

**Problema:** Os projetos precisam de uma referência imutável de "como deveria ser" — o contrato original, o baseline. Mas ao longo do projeto, mudanças de escopo, aditivos e revisões de cronograma alteram essa referência. Como registrar o histórico sem perder rastreabilidade?

**Solução:** O TM (Triângulo Matriz) representa o estado ideal planejado. Quando o projeto sofre uma mudança formal aprovada, um novo TM é criado com versão (TM 2.0, TM 3.0...). O TM anterior é arquivado como "Histórico de Pecados" — registro auditável de todas as revisões de baseline.

**Como funciona:** Na interface, o TM original é sempre exibido como sombra semitransparente. O TA (Triângulo Atual) é sobreposto em cima. A diferença visual entre TA e TM é imediata: o PM vê instantaneamente o quanto o projeto desviou do plano original.

**Por que:** Em projetos de engenharia civil, auditorias de TCU e órgãos públicos exigem rastreabilidade de mudanças de baseline. O Histórico de Pecados torna isso automático e visual.

---

### P03 — O que é o MATED?

**Problema:** Saber que o triângulo mudou de área é importante, mas não diz "para onde" o projeto está indo. Um projeto pode ter a mesma área do planejado mas estar em uma geometria completamente deformada (um lado muito longo, outro muito curto).

**Solução:** O MATED (Métrica de Afastamento Triádico no Espaço de Decisão) mede a distância euclidiana entre o ponto de operação atual do projeto e o NVO (Núcleo Viável Ótimo) — o ponto ideal do triângulo.

**Como funciona:** O triângulo atual tem um baricentro (centro de massa). O triângulo contém um triângulo interno chamado Triângulo Órtico. O baricentro desse triângulo interno é o NVO. A distância do ponto de operação ao NVO é o MATED — um número adimensional. Quanto menor, melhor.

**Por que:** Um único número captura distância + direção do desvio, algo que a variação de área não consegue. O MATED lê a "geometria do risco", não apenas a magnitude.

---

## PARTE II — CALIBRAÇÃO E RIGOR ESTATÍSTICO

---

### P04 — Zonas MATED: calibradas em apenas 1 projeto

**Problema:** As zonas de alerta do MATED (ÓTIMO, SEGURO, RISCO, CRISE) foram inicialmente calibradas usando o Boston Big Dig como único caso de referência. Um único projeto, por mais icônico que seja, não é base estatística suficiente para definir limiares universais.

**Como foi descoberto:** Auditoria interna conduzida por @roberta (especialista em probabilidade e metodologia de pesquisa). Ponto E1 da lista de decisões.

**Solução adotada:** Sistema híbrido Bayesiano em três camadas:
- **Camada 1 (antes do lançamento):** Priors baseados em dados históricos publicados — PMI Pulse of the Profession, Flyvbjerg (Oxford), World Bank Project Database, relatórios TCU/AGU de obras públicas brasileiras.
- **Camada 2 (piloto controlado):** Estudo com parceiro real (Gênesis Empreendimentos, Teresópolis RJ) sobre projetos já concluídos com dados completos. Dados alimentados no Aura retroativamente.
- **Camada 3 (produção):** Atualização Bayesiana progressiva — cada projeto arquivado no Aura recalibra as zonas automaticamente, com peso maior para projetos do mesmo setor.

**Por que:** O método Bayesiano permite lançar com credibilidade (priors de 10.000+ projetos publicados) e melhorar continuamente com dados próprios. A interface mostrará ao PM quantos projetos embasam a régua de cada setor.

**Implementação técnica:** Tabela `aura_calibration_events` no banco de dados. Sprint DB-EXEC. Serviço em 3 camadas: Edge Function (Supabase) → serviço dedicado → servidor próprio conforme crescimento.

---

### P05 — Fator 1.5 arbitrário na regressão ponderada

**Problema:** A Função Custo usa Regressão Ponderada para calcular a tendência do orçamento. O peso de cada período é calculado como `Peso_i = (i+1)/n × fator_atividade`. O fator_atividade estava fixado em `1.5` sem base estatística — foi escolhido empiricamente durante o desenvolvimento, usando um projeto fictício (Galpão Industrial) como referência.

**Como foi descoberto:** Auditoria por @roberta. O projeto Galpão Industrial foi desconsiderado como base de validação (fictício = sem valor estatístico).

**Solução adotada:**
1. **Recalibração com dados publicados por setor:** Construção civil brasileira (projetos TCU/Caixa Econômica): fator 1.2–1.3. Infraestrutura (rodovias, portos, aeroportos): fator 1.4–1.6. Energia (usinas, transmissão): fator 1.6–1.8. Software/TI: fator 1.0–1.2.
2. **Piloto controlado com Gênesis Empreendimentos:** projetos concluídos → retroalimentação → validação do fator para construção civil regional.
3. **Decisões que dependem de dados ao vivo são adiadas** até que o piloto forneça dados reais.

**Por que:** Um fator errado deforma a linha de tendência e pode sinalizar crise quando o projeto está saudável, ou vice-versa. Para um documento acadêmico e para parceiros institucionais, cada parâmetro precisa de rastreabilidade estatística.

---

### P06 — Resultado final do projeto declarado pelo PM (subjetividade)

**Problema:** Quando um projeto é arquivado, o Aura precisava de alguém para declarar se o projeto foi um sucesso ou fracasso. Se a declaração vem do PM ou PO, existe conflito de interesse e subjetividade ("meu projeto foi um sucesso porque eu disse que foi").

**Como foi identificado:** Debate durante a sessão P5. O usuário reconheceu o risco de viés humano na avaliação.

**Solução adotada:** SDO — Score de Desfecho Objetivo. Algoritmo de 3 camadas:
- **40% — Desvio de área:** `TA_final / TM_baseline`. Mede expansão ou contração real do projeto versus o plano.
- **35% — Trajetória MATED:** Média ponderada do histórico MATED durante a execução. Não basta chegar bem no final — a trajetória importa.
- **25% — Benchmark setorial:** Comparação com projetos similares arquivados no Aura (mesmo setor, porte similar). Normalização por distribuição acumulada.

**Por que:** O SDO é calculado automaticamente pelo sistema, sem intervenção humana, a partir de dados já registrados no Aura durante toda a execução. Auditável, replicável, sem conflito de interesse.

---

## PARTE III — MONTE CARLO E VARIABILIDADE

---

### P07 — σ = 0.1 subestima a variabilidade real de obras civis

**Problema:** [Ponto 3 de @roberta — a ser registrado após debate]

---

## PARTE IV — ESTRATÉGIA DE LANÇAMENTO

---

### P08 — Como lançar sem dados históricos próprios?

**Problema:** O MetodoAura precisa de dados históricos para calibrar zonas, fatores e benchmarks. Mas dados históricos só existem depois do lançamento. Paradoxo clássico do produto novo.

**Solução adotada:** Estratégia em 3 fases:
1. **Fase Pré-Lançamento:** Importar dados publicados de terceiros (PMI, Flyvbjerg, World Bank, TCU) como priors Bayesianos. Aura nasce com uma régua pré-calibrada, não uma régua vazia.
2. **Fase Piloto Controlado:** Parceria com empresa estabelecida (Gênesis Empreendimentos) para retroalimentar projetos já concluídos. Dados reais, ambiente controlado, sem risco para o parceiro.
3. **Fase Produção:** Cada novo projeto arquivado refina os parâmetros. A plataforma melhora com uso.

**Por que:** É a diferença entre lançar com credibilidade acadêmica versus lançar como "achismo digital". O estudo piloto com Gênesis vira dado de pesquisa → artigo acadêmico → credibilidade para atrair os primeiros clientes pagantes.

---

### P09 — Parceiro estratégico: Gênesis Empreendimentos

**Quem são:** Empresa de construção civil e empreendimentos em Teresópolis, RJ. Parceiro já mapeado pelo fundador do MetodoAura.

**Papel no projeto:** Empresa-laboratório para o estudo piloto. Projetos já concluídos serão retroalimentados no Aura. Os dados gerados embaSarão a publicação acadêmica e a calibração inicial dos parâmetros.

**O que o Aura oferece em troca:** Acesso antecipado à plataforma, co-autoria no artigo de pesquisa (se desejado), histórico visual e auditável de todos os projetos da empresa (KPI de qualidade retroativo).

**Por que Teresópolis:** Projetos de construção civil em região serrana — com características de complexidade logística e variabilidade de prazo que são representativas para o setor. Boa diversidade de casos (residencial, comercial, infraestrutura urbana).

---

## PARTE V — DECISÕES COMPLETAS (Lista E)

| ID | Categoria | Decisão | Sprint |
|----|-----------|---------|--------|
| E1 | Calibração | Zonas MATED — sistema híbrido Bayesiano (priors externos + aprendizado interno) | DB-EXEC |
| E2 | Resultado | SDO algorítmico em 3 camadas (sem declaração humana) | EXEC-MODULE |
| E3 | Resultado | Pesos SDO confirmados: 40% área / 35% MATED / 25% benchmark | EXEC-MODULE |
| E4 | Calibração | Camada 3 (benchmark) não adiada — dados históricos coletados antes do lançamento | DB-EXEC |
| E5 | Calibração | Atualização Bayesiana progressiva — cada projeto arquivado recalibra as zonas | DB-EXEC |
| E6 | UX | Interface transparente — PM vê quantos projetos embasam a régua do seu setor | EXEC-MODULE |
| E7 | Pesquisa | Protocolo formal `*research-protocol calibração-mated` a ser executado por @roberta | — |
| E8 | Banco | Tabela `aura_calibration_events` criada no sprint DB-EXEC | DB-EXEC |
| E9 | Infra | Serviço de calibração em 3 camadas: Edge Function → serviço dedicado → servidor próprio | F-CICD |
| E10 | Dados | Projeto Galpão Industrial desconsiderado (fictício, sem valor estatístico) | — |
| E11 | Parâmetro | Fator `1.5` recalibrado com dados PMI/Flyvbjerg por setor | DB-EXEC |
| E12 | Estratégia | Lançamento com estudo piloto controlado com parceiro real | — |
| E13 | Desenvolvimento | Decisões que dependem de dados ao vivo são adiadas para pós-piloto | — |
| E14 | Mercado | Setores-alvo primários: construção civil, infraestrutura, energia | — |
| E15 | Parceria | Gênesis Empreendimentos (Teresópolis, RJ) como parceiro piloto ideal | — |
| E16 | Pesquisa | Protocolo formal de calibração a ser produzido formalmente por @roberta | — |

---

## NOTAS DE VERSÃO

| Versão | Data | Conteúdo |
|--------|------|---------|
| 0.1 | 2026-03-17 | Criação inicial — Partes I a IV + lista E1-E16 |
| — | — | P07 (Monte Carlo σ) — a ser preenchido após debate @roberta Ponto 3 |
| — | — | Pontos 4 e 5 de @roberta — a serem adicionados após debate |

---

*Gerado por Orion (@aiox-master) | Sessão P5 — 2026-03-17*
*Para uso institucional: apresentação ao parceiro Gênesis Empreendimentos e publicação acadêmica*
