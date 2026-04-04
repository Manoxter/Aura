# Story RFN-7 — Arquivo do Projeto: Separação Read-Only
**Épico:** EP-RFN Design & UX Refinamento
**Sprint:** RFN-Sprint-3
**Status:** Draft
**Agentes:** @dev (Dex), @data-engineer (Dara)
**Prioridade:** ALTA

---

## User Story
Como PM ou auditor,
quero acessar o arquivo histórico do projeto (relatórios diários, snapshots, aditivos) em uma área separada e imutável,
para auditar o histórico sem risco de alterar dados operacionais.

## Acceptance Criteria

- [ ] AC1: Rota `/arquivo/[projetoId]` separada do dashboard operacional, com layout próprio (badge "ARQUIVO" no header)
- [ ] AC2: Exibe: lista de snapshots TM (`triangulo_matriz_versoes`), relatórios diários (`historico_projeto`), aditivos aprovados, eventos atípicos registrados
- [ ] AC3: Todos os dados são read-only — zero botões de edição, sem formulários
- [ ] AC4: Acesso restrito a roles: `admin`, `pm`, `po` (bloquear `tecnico`, `cliente`, `observador`)
- [ ] AC5: Cada snapshot exibe: data, versão, zona MATED, área CDT, motivo registrado
- [ ] AC6: Botão "Exportar PDF" na rota `/arquivo` gera o relatório executivo via `window.print()`
- [ ] AC7: Sidebar distingue visualmente "Projeto Ativo" (azul) de "Arquivo" (âmbar/gold) nos links

## Scope
**IN:** Rota `/arquivo/[projetoId]/page.tsx`, layout de arquivo, consumo das tabelas de histórico
**OUT:** Sistema de arquivamento automático (já existe em `/arquivar`), geração de PDF server-side

## Dependencies
- RFN-5 (lógica de read-only), RFN-6 (RBAC para restringir acesso)

## Estimativa
L (6–8h)

## Definition of Done
- [ ] Rota `/arquivo` acessível e sem dados editáveis
- [ ] RBAC aplicado — cliente não acessa
- [ ] 0 erros TypeScript/ESLint
