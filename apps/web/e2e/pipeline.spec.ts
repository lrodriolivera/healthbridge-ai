import { test, expect } from '@playwright/test'

test.describe('HealthBridge AI E2E', () => {
  const email = `e2e-${Date.now()}@test.com`
  const password = 'E2eTestPass1'
  const orgName = `E2E Org ${Date.now()}`

  test('register new account', async ({ page }) => {
    await page.goto('/register')
    await page.fill('input[id="tenant"]', orgName)
    await page.fill('input[id="email"]', email)
    await page.fill('input[id="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/projects/, { timeout: 10000 })
    expect(page.url()).toContain('/projects')
  })

  test('login with existing account', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[id="email"]', email)
    await page.fill('input[id="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/projects/, { timeout: 10000 })
    expect(page.url()).toContain('/projects')
  })

  test('create new project', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[id="email"]', email)
    await page.fill('input[id="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/projects/, { timeout: 10000 })

    await page.click('text=New Project')
    await page.fill('input[id="name"]', 'E2E Test Migration')
    await page.click('text=Mirth Connect')
    await page.click('text=Oracle SOA/OSB')
    await page.click('text=Create Project')
    await page.waitForURL(/\/projects/, { timeout: 10000 })
    await expect(page.locator('text=E2E Test Migration')).toBeVisible()
  })

  test('navigate sidebar links', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[id="email"]', email)
    await page.fill('input[id="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/projects/, { timeout: 10000 })

    await page.click('text=IRIS Connections')
    await expect(page.locator('h1')).toContainText('IRIS')

    await page.click('text=Audit Log')
    await expect(page.locator('h1')).toContainText('Audit')

    await page.click('text=Settings')
    await expect(page.locator('h1')).toContainText('Settings')
  })

  test('health check loads', async ({ page }) => {
    const response = await page.goto('http://localhost:8001/health')
    expect(response?.status()).toBe(200)
  })
})
