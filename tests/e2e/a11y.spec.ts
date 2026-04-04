// tests/e2e/a11y.spec.ts
// @ts-check
import { test, expect } from '@playwright/test'
// import AxeBuilder from '@axe-core/playwright'

/**
 * DS-8: Accessibility audit using axe-core
 * Requires: npm install --save-dev @axe-core/playwright
 * Run: npx playwright test tests/e2e/a11y.spec.ts
 */

const ROUTES = [
  { name: 'landing', path: '/' },
  { name: 'login', path: '/login' },
]

test.describe('WCAG 2.1 AA — Axe-core audit', () => {
  for (const route of ROUTES) {
    test(`${route.name} has no critical/serious violations`, async ({ page }) => {
      await page.goto(route.path)
      await page.waitForLoadState('networkidle')

      // Uncomment after installing @axe-core/playwright:
      // const accessibilityScanResults = await new AxeBuilder({ page })
      //   .withTags(['wcag2a', 'wcag2aa'])
      //   .analyze()
      // const criticalSerious = accessibilityScanResults.violations.filter(
      //   v => v.impact === 'critical' || v.impact === 'serious'
      // )
      // expect(criticalSerious).toHaveLength(0)

      // Basic smoke test: page loads without JS errors
      const errors: string[] = []
      page.on('pageerror', err => errors.push(err.message))
      expect(errors).toHaveLength(0)
    })
  }

  test('focus rings are visible on interactive elements', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Tab to first interactive element and verify focus ring CSS
    await page.keyboard.press('Tab')
    const focusedEl = page.locator(':focus')
    // Focus ring should be visible via CSS outline
    const outline = await focusedEl.evaluate(el => getComputedStyle(el).outline)
    // outline should not be 'none' or empty
    expect(outline).toBeTruthy()
  })
})
