# Story SaaS-8 — CI/CD: Pipeline Automático com Quality Gates Bloqueantes
**Épico:** EP-SaaS Infraestrutura SaaS
**Sprint:** SAAS-CORE
**Status:** Done
**DRI:** @devops (Gage)
**Agentes:** @devops (Gage), @qa (Quinn), @security-auditor (Shield)
**Pré-requisito:** Nenhum (independente — infraestrutura)

---

## User Story
Como time de desenvolvimento do Aura,
quero que nenhum código seja deployado sem passar por TypeCheck, Lint, testes unitários e suite Big Dig,
para que regressões matemáticas sejam bloqueadas automaticamente antes de chegar à produção.

## Background
Atualmente o deploy na Vercel acontece a cada push na branch `main` sem nenhum gate obrigatório. Problemas identificados:
- TypeCheck pode estar com erros que não impedem o build
- Lint warnings acumulam sem notificação
- Suite Big Dig (30 testes CDT v2) não é executada no CI
- Testes Playwright não rodam no CI
- É possível fazer merge direto em main sem review

## Acceptance Criteria
- [ ] AC-1: GitHub Actions workflow criado: `.github/workflows/ci.yml` disparado em todo PR para `main` e `aplicacoes`
- [ ] AC-2: Gate TypeCheck: `npm run typecheck` — falha bloqueia merge (status check obrigatório)
- [ ] AC-3: Gate Lint: `npm run lint` — warnings são permitidos, erros bloqueiam merge
- [ ] AC-4: Gate Unit Tests: `npm run test` — falha bloqueia merge (inclui suite CDT v2 Big Dig)
- [ ] AC-5: Gate Build: `npm run build` — falha bloqueia merge
- [ ] AC-6: PR description automática com summary de changes (opcional — template de PR)
- [ ] AC-7: Branch protection em `main`: requer 1 review + todos os status checks passando antes de merge
- [ ] AC-8: Dependabot configurado: alertas de segurança em dependências (sem auto-merge)
- [ ] AC-9: Cache de node_modules no GitHub Actions para builds < 3 minutos

## Tasks
- [x] 1. Criar `.github/workflows/ci.yml` com os 4 gates (typecheck, lint, test, build)
- [x] 2. Configurar branch protection em `main` no GitHub: require status checks + 1 review
- [x] 3. Criar `.github/dependabot.yml` para alertas de segurança
- [x] 4. Otimizar CI com cache de node_modules
- [x] 5. Criar template de PR `.github/pull_request_template.md`
- [x] 6. Testar: fazer PR com erro de TypeCheck → CI bloqueia merge
- [x] 7. Testar: fazer PR com teste Big Dig falhando → CI bloqueia merge
- [x] 8. Verificar tempo total de CI: deve ser < 5 minutos (warning se > 5 min)

## File List
- `.github/workflows/ci.yml` (criar)
- `.github/dependabot.yml` (criar)
- `.github/pull_request_template.md` (criar)

## Definition of Done
- [x] Nenhum PR pode ser mergeado sem CI verde
- [x] Branch protection ativa em `main`
- [x] Suite Big Dig roda no CI (não apenas localmente)
- [x] Build completo em < 5 minutos

## Escopo
**IN:** GitHub Actions com 4 gates (typecheck/lint/test/build), branch protection em main, Dependabot, cache CI, template de PR.
**OUT:** Não inclui deploy automático para staging (Vercel já cuida do preview), não cobre testes E2E no CI (Playwright requer browser — custo alto no CI, v1.1), não implementa canary deploy, não cobre rollback automático.

## Estimativa
**Esforço:** 3h | **Complexidade:** P

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| `npm run build` no CI pode falhar por variáveis de ambiente ausentes (SUPABASE_URL, etc.) | Alta | Alto | Adicionar GitHub Secrets com todas as env vars necessárias para build antes de ativar o gate |
| Branch protection bloqueando merges emergenciais (hotfix em produção) | Baixa | Médio | Adicionar regra de bypass para administradores do repositório em situações de emergência |

## QA Results
```yaml
storyId: SaaS-8
verdict: PASS
issues: []
```

## Change Log
| Data | Agente | Alteração |
|------|--------|-----------|
| 2026-03-17 | @po (Pax) | Story criada — Status: Ready |
| 2026-03-17 | @dev (Dex) | CI implementado em sessão anterior — Status: Done |
