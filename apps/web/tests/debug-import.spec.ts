import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

test('debug - capture import page content', async ({ page }) => {
  const screenshotsDir = path.resolve('screenshots')
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true })

  // Step 1: Navigate to sign-in
  await page.goto('http://localhost:3000/auth/sign-in')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(screenshotsDir, 'debug_01_signin.png') })

  // Log all button texts on sign-in
  const buttons = await page.locator('button').all()
  console.log(`Found ${buttons.length} buttons on sign-in page:`)
  for (const btn of buttons) {
    console.log(' -', await btn.innerText())
  }

  // Try clicking any demo button
  const demoBtn = page.locator('button').filter({ hasText: /demo|Demo/i }).first()
  if (await demoBtn.isVisible({ timeout: 5000 })) {
    await demoBtn.click()
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(screenshotsDir, 'debug_02_after_demo.png') })
    console.log('Clicked demo button, URL:', page.url())
  } else {
    console.log('No demo button found, trying direct navigation')
  }

  // Step 2: Navigate to import page directly
  await page.goto('http://localhost:3000/app/import')
  await page.waitForTimeout(2000)
  await page.screenshot({ path: path.join(screenshotsDir, 'debug_03_import.png') })
  console.log('Import page URL:', page.url())

  // Log all button texts on import page
  const importButtons = await page.locator('button').all()
  console.log(`Found ${importButtons.length} buttons on import page:`)
  for (const btn of importButtons) {
    console.log(' -', await btn.innerText())
  }
})
