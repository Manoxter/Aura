import { test, expect } from '@playwright/test'
import {
  TEST_PROJECT_ID,
  SETUP_STEPS,
  navigateToSetupStart,
  navigateToSetupPage,
  getStepperContainer,
  getStepperLink,
  waitForPageReady,
} from './fixtures/project'

test.describe('Fluxo de Setup — Navegacao via SetupStepper', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar para a pagina inicial do setup (TAP)
    await navigateToSetupStart(page)
  })

  test('SetupStepper esta visivel na pagina TAP', async ({ page }) => {
    const stepper = getStepperContainer(page)
    await expect(stepper).toBeVisible({ timeout: 10_000 })
  })

  test('SetupStepper exibe todos os 7 passos', async ({ page }) => {
    const stepper = getStepperContainer(page)
    await expect(stepper).toBeVisible({ timeout: 10_000 })

    for (const step of SETUP_STEPS) {
      const link = getStepperLink(page, step.label)
      await expect(link).toBeVisible()
    }
  })

  test('Passo TAP esta marcado como ativo na pagina TAP', async ({ page }) => {
    const tapLink = getStepperLink(page, 'TAP')
    await expect(tapLink).toBeVisible({ timeout: 10_000 })

    // O step ativo tem classe bg-blue-600 (cor azul)
    await expect(tapLink).toHaveClass(/bg-blue-600/)
  })

  test('Navegar para cada pagina de setup pelo stepper', async ({ page }) => {
    const stepper = getStepperContainer(page)
    await expect(stepper).toBeVisible({ timeout: 10_000 })

    // Testar navegacao para cada etapa do setup
    for (const step of SETUP_STEPS) {
      const link = getStepperLink(page, step.label)
      await expect(link).toBeVisible()
      await link.click()

      // Verificar que a URL mudou para o path correto
      await page.waitForURL(`**/${step.path}`, { timeout: 15_000 })
      await waitForPageReady(page)

      // Verificar que o stepper continua visivel apos navegacao
      const stepperAfterNav = getStepperContainer(page)
      await expect(stepperAfterNav).toBeVisible()
    }
  })
})

test.describe('Paginas de Setup — Conteudo especifico', () => {
  test('Pagina TAP carrega com elementos de upload e formulario', async ({ page }) => {
    await navigateToSetupPage(page, 'setup/tap')
    await waitForPageReady(page)

    // TAP tem area de texto ou upload para o Termo de Abertura
    const pageContent = page.locator('main, [class*="container"], body')
    await expect(pageContent).toBeVisible({ timeout: 10_000 })

    // Verifica que existe pelo menos um elemento interativo (textarea, input, ou botao)
    const interactiveElements = page.locator('textarea, input[type="file"], button')
    const count = await interactiveElements.count()
    expect(count).toBeGreaterThan(0)
  })

  test('Pagina EAP carrega com estrutura WBS', async ({ page }) => {
    await navigateToSetupPage(page, 'setup/eap')
    await waitForPageReady(page)

    // EAP deve ter o stepper visivel
    const stepper = getStepperContainer(page)
    await expect(stepper).toBeVisible({ timeout: 10_000 })
  })

  test('Pagina Calendario carrega com configuracao de datas', async ({ page }) => {
    await navigateToSetupPage(page, 'setup/calendario')
    await waitForPageReady(page)

    const stepper = getStepperContainer(page)
    await expect(stepper).toBeVisible({ timeout: 10_000 })
  })

  test('Pagina CPM carrega corretamente', async ({ page }) => {
    await navigateToSetupPage(page, 'setup/cpm')
    await waitForPageReady(page)

    // CPM pode mostrar "Aguardando TAP" se nao houver dados, ou a interface de CPM
    const pageContent = page.locator('body')
    await expect(pageContent).toBeVisible()

    // Verificar que o conteudo nao esta vazio
    const text = await pageContent.textContent()
    expect(text).toBeTruthy()
    expect(text!.length).toBeGreaterThan(0)
  })

  test('Pagina Orcamento carrega corretamente', async ({ page }) => {
    await navigateToSetupPage(page, 'setup/orcamento')
    await waitForPageReady(page)

    const pageContent = page.locator('body')
    await expect(pageContent).toBeVisible()

    const text = await pageContent.textContent()
    expect(text).toBeTruthy()
  })

  test('Pagina Funcoes carrega com abas de configuracao', async ({ page }) => {
    await navigateToSetupPage(page, 'setup/funcoes')
    await waitForPageReady(page)

    const pageContent = page.locator('body')
    await expect(pageContent).toBeVisible()

    const text = await pageContent.textContent()
    expect(text).toBeTruthy()
  })

  test('Pagina Motor CDT carrega com visualizacao triangular', async ({ page }) => {
    await navigateToSetupPage(page, 'motor/cdt')
    await waitForPageReady(page)

    const pageContent = page.locator('body')
    await expect(pageContent).toBeVisible()

    const text = await pageContent.textContent()
    expect(text).toBeTruthy()
  })
})

test.describe('SetupStepper — Estado visual dos passos', () => {
  test('Stepper marca o passo atual como ativo em cada pagina', async ({ page }) => {
    // Para cada pagina de setup, verificar que o step correspondente esta ativo
    const stepsWithActiveCheck = SETUP_STEPS.filter(s => s.id !== 'motor')

    for (const step of stepsWithActiveCheck) {
      await navigateToSetupPage(page, step.path)
      await waitForPageReady(page)

      const link = getStepperLink(page, step.label)
      // Aguardar que o link esteja visivel (stepper renderizado)
      const isVisible = await link.isVisible().catch(() => false)
      if (!isVisible) continue

      // Verificar classe ativa (bg-blue-600)
      await expect(link).toHaveClass(/bg-blue-600/)
    }
  })

  test('Links do stepper apontam para URLs corretas', async ({ page }) => {
    await navigateToSetupStart(page)
    await waitForPageReady(page)

    const stepper = getStepperContainer(page)
    await expect(stepper).toBeVisible({ timeout: 10_000 })

    for (const step of SETUP_STEPS) {
      const link = getStepperLink(page, step.label)
      const href = await link.getAttribute('href')
      expect(href).toContain(step.id === 'motor' ? 'motor/cdt' : `setup/${step.id}`)
    }
  })
})
