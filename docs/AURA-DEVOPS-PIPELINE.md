# DEVOPS PIPELINE — AURA SAAS (Greenfield)

**Contexto:** O código-fonte local do MVP da Aura (React/Next.js + Motor CCPM) está pronto nas rotas lógicas, mas o ambiente físico não existe. Este documento é o roteiro absoluto para a CLI orquestrar a infraestrutura.

## 1. Desacoplamento Inicial (Local)
Ao chegar no novo repositório isolado, garanta que:
1. `package.json` foi desvinculado dos scripts antigos do "Corporate". 
2. A pasta `src/` espelha perfeitamente a estrutura final gerada do lab `Aura`.
3. Rode um `npm install` limpo sem as dependências legadas que apagamos da Poda Híbrida.

## 2. Nova Arquitetura de Banco (Supabase Migrations)
A Aura abandona o paradigma purista do CPM. O sistema novo possui uma mecânica Viva. Gere as `migrations.sql` essenciais usando a CLI do Supabase:
- **Tabela `projetos`:** Add colunas `iqo_global`, `forma_triangulo_viva`, `zre_status`.
- **Tabela `sprints_fractais` (NOVO):** Chave estrangeira para `projeto_id`, contendo colunas: `ordem`, `buffer_original`, `buffer_consumido`, `estado (concluido/ativo/futuro)`, `impacto_propagado`.
- **Tabela `webhooks_history` (NOVO):** Log bruto dos Payloads do ClickUp e GitHub (pra segurança).

## 3. Parametrização Zero Fricção (.env)
Gere os `.env.local` contendo as rotas de porta dos fundos que acabamos de cirar:
- `CLICKUP_WEBHOOK_SECRET=...`
- `SLACK_WEBHOOK_URL=...`
- As chaves anônimas do novo Supabase.

## 4. QA Final e Deploy
- **Vitest Check:** Execute a suíte massiva (`npm test`) validando os ~951 testes para atestar que o banco e o desacoplamento não romperam a geometria do TM.
- **Vercel CLI:** Dispare o comando `vercel --prod` com o flag Y para inicializar a esteira CI/CD em cima deste novo pipeline do Aura.
