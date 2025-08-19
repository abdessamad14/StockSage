import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  // Launch browser to set up crypto polyfill
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  
  // Add crypto polyfill to fix window.crypto.random issue
  await page.addInitScript(() => {
    // Polyfill crypto.random if it doesn't exist
    if (typeof window !== 'undefined' && window.crypto && !window.crypto.random) {
      Object.defineProperty(window.crypto, 'random', {
        value: () => Math.random(),
        writable: false,
        enumerable: true,
        configurable: false
      })
    }
  })
  
  await browser.close()
}

export default globalSetup
