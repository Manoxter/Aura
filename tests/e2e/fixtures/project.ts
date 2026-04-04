import { type Page } from '@playwright/test'

/**
 * Fixtures de projeto para testes E2E — Aura 6.1
 *
 * Fornece constantes e helpers para navegacao nas paginas de setup.
 */

/** UUID placeholder para projeto de teste. Substituir por ID real em CI. */
export const TEST_PROJECT_ID = '00000000-0000-0000-0000-000000000001'

/** Etapas do setup na ordem do fluxo */
export const SETUP_STEPS = [
  { id: 'tap', label: 'TAP', path: 'setup/tap' },
  { id: 'eap', label: 'EAP', path: 'setup/eap' },
  { id: 'calendario', label: 'Calendario', path: 'setup/calendario' },
  { id: 'cpm', label: 'CPM', path: 'setup/cpm' },
  { id: 'orcamento', label: 'Orcamento', path: 'setup/orcamento' },
  { id: 'funcoes', label: 'Funcoes', path: 'setup/funcoes' },
  { id: 'motor', label: 'Motor', path: 'motor/cdt' },
] as const

export type StepId = (typeof SETUP_STEPS)[number]['id']

/**
 * Navega para uma pagina de setup especifica do projeto de teste.
 */
export async function navigateToSetupPage(page: Page, stepPath: string): Promise<void> {
  await page.goto(`/${TEST_PROJECT_ID}/${stepPath}`)
  await page.waitForLoadState('networkidle')
}

/**
 * Navega para a primeira pagina do setup (TAP).
 */
export async function navigateToSetupStart(page: Page): Promise<void> {
  await navigateToSetupPage(page, 'setup/tap')
}

/**
 * Retorna o locator do SetupStepper no DOM.
 * O SetupStepper renderiza como um container com links para cada etapa.
 */
export function getStepperContainer(page: Page) {
  // O SetupStepper e o primeiro elemento com a classe especifica de container
  return page.locator('[class*="bg-slate-900/50"]').filter({ has: page.locator('a') }).first()
}

/**
 * Retorna o locator de um link especifico dentro do SetupStepper.
 * Cada step e um <a> com title igual ao label.
 */
export function getStepperLink(page: Page, label: string) {
  return getStepperContainer(page).locator(`a[title="${label}"]`)
}

/**
 * Aguarda a pagina carregar completamente, lidando com estados de loading.
 * Espera que nao haja mais spinners ou indicadores de carregamento.
 */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  // Aguardar que animacoes de fade-in terminem
  await page.waitForTimeout(500)
}
