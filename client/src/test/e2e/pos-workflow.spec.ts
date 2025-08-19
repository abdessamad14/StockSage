import { test, expect } from '@playwright/test'

test.describe('POS Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Add crypto polyfill before navigating
    await page.addInitScript(() => {
      if (typeof window !== 'undefined' && window.crypto && !window.crypto.random) {
        Object.defineProperty(window.crypto, 'random', {
          value: () => Math.random(),
          writable: false,
          enumerable: true,
          configurable: false
        })
      }
    })
    
    await page.goto('/')
    // Clear localStorage to start fresh
    await page.evaluate(() => localStorage.clear())
  })

  test('complete sale workflow from product creation to checkout', async ({ page }) => {
    // Step 1: Navigate to Products and create a test product
    await page.click('text=Products')
    await page.click('text=Add Product')
    
    await page.fill('[placeholder="Product name"]', 'Test Product E2E')
    await page.fill('[placeholder="SKU"]', 'TEST-E2E-001')
    await page.fill('[placeholder="0.00"]', '25.99')
    await page.fill('[placeholder="Cost price"]', '12.50')
    await page.fill('[placeholder="Current stock"]', '100')
    await page.fill('[placeholder="Minimum stock level"]', '10')
    
    await page.click('text=Create Product')
    await expect(page.locator('text=Product created successfully')).toBeVisible()

    // Step 2: Navigate to POS
    await page.click('text=POS')
    await expect(page.locator('text=Point of Sale')).toBeVisible()

    // Step 3: Add product to cart
    await page.fill('[placeholder="Search products..."]', 'Test Product E2E')
    await page.click('text=Test Product E2E')
    
    // Verify product is in cart
    await expect(page.locator('text=Test Product E2E')).toBeVisible()
    await expect(page.locator('text=$25.99')).toBeVisible()

    // Step 4: Adjust quantity
    await page.click('[data-testid="increase-quantity"]')
    await expect(page.locator('text=2')).toBeVisible() // quantity should be 2
    await expect(page.locator('text=$51.98')).toBeVisible() // total should be 2 * 25.99

    // Step 5: Proceed to checkout
    await page.click('text=Checkout')
    
    // Step 6: Complete payment
    await page.click('text=Cash')
    await page.fill('[placeholder="0.00"]', '60.00')
    await page.click('text=Complete Sale')

    // Step 7: Verify sale completion
    await expect(page.locator('text=Sale completed successfully')).toBeVisible()
    await expect(page.locator('text=Change: $8.02')).toBeVisible() // 60.00 - 51.98

    // Step 8: Verify stock was updated
    await page.click('text=Products')
    await page.fill('[placeholder="Search products..."]', 'Test Product E2E')
    
    // Stock should be reduced from 100 to 98
    await expect(page.locator('text=98')).toBeVisible()
  })

  test('handle low stock warning during sale', async ({ page }) => {
    // Create product with low stock
    await page.click('text=Products')
    await page.click('text=Add Product')
    
    await page.fill('[placeholder="Product name"]', 'Low Stock Product')
    await page.fill('[placeholder="SKU"]', 'LOW-001')
    await page.fill('[placeholder="0.00"]', '15.00')
    await page.fill('[placeholder="Cost price"]', '7.50')
    await page.fill('[placeholder="Current stock"]', '3')
    await page.fill('[placeholder="Minimum stock level"]', '5')
    
    await page.click('text=Create Product')

    // Go to POS and try to sell more than available
    await page.click('text=POS')
    await page.fill('[placeholder="Search products..."]', 'Low Stock Product')
    await page.click('text=Low Stock Product')

    // Try to increase quantity beyond available stock
    await page.click('[data-testid="increase-quantity"]')
    await page.click('[data-testid="increase-quantity"]')
    await page.click('[data-testid="increase-quantity"]') // Should be at max (3)

    // Verify warning appears
    await expect(page.locator('text=Insufficient stock')).toBeVisible()
  })
})

test.describe('Inventory Management E2E', () => {
  test('stock adjustment workflow', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())

    // Create product first
    await page.click('text=Products')
    await page.click('text=Add Product')
    
    await page.fill('[placeholder="Product name"]', 'Adjustment Test Product')
    await page.fill('[placeholder="SKU"]', 'ADJ-001')
    await page.fill('[placeholder="0.00"]', '30.00')
    await page.fill('[placeholder="Cost price"]', '15.00')
    await page.fill('[placeholder="Current stock"]', '50')
    
    await page.click('text=Create Product')

    // Navigate to Inventory
    await page.click('text=Inventory')
    
    // Find the product and adjust stock
    await page.fill('[placeholder="Search products..."]', 'Adjustment Test Product')
    await page.click('[data-testid="adjust-stock-button"]')
    
    // Perform stock adjustment
    await page.fill('[placeholder="Enter quantity"]', '75')
    await page.fill('[placeholder="Reason for adjustment"]', 'Stock count correction')
    await page.click('text=Adjust Stock')

    // Verify adjustment
    await expect(page.locator('text=Stock adjusted successfully')).toBeVisible()
    await expect(page.locator('text=75')).toBeVisible() // New quantity

    // Check stock history
    await page.click('[data-testid="view-history-button"]')
    await expect(page.locator('text=Stock count correction')).toBeVisible()
    await expect(page.locator('text=adjustment')).toBeVisible()
  })
})

test.describe('Purchase Order E2E', () => {
  test('complete purchase order workflow', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())

    // Step 1: Create supplier
    await page.click('text=Suppliers')
    await page.click('text=Add Supplier')
    
    await page.fill('[placeholder="Supplier name"]', 'Test Supplier E2E')
    await page.fill('[placeholder="Contact person"]', 'John Doe')
    await page.fill('[placeholder="Email"]', 'john@testsupplier.com')
    await page.click('text=Create Supplier')

    // Step 2: Create product
    await page.click('text=Products')
    await page.click('text=Add Product')
    
    await page.fill('[placeholder="Product name"]', 'Purchase Test Product')
    await page.fill('[placeholder="SKU"]', 'PURCH-001')
    await page.fill('[placeholder="0.00"]', '40.00')
    await page.fill('[placeholder="Cost price"]', '20.00')
    await page.fill('[placeholder="Current stock"]', '10')
    
    await page.click('text=Create Product')

    // Step 3: Create purchase order
    await page.click('text=Orders')
    await page.click('text=Create Order')
    
    // Select supplier
    await page.click('[data-testid="supplier-select"]')
    await page.click('text=Test Supplier E2E')
    
    // Add product to order
    await page.click('text=Add Product')
    await page.click('[data-testid="product-select"]')
    await page.click('text=Purchase Test Product')
    
    await page.fill('[placeholder="Quantity"]', '20')
    await page.fill('[placeholder="Unit cost"]', '20.00')
    
    await page.click('text=Add to Order')
    await page.click('text=Create Order')

    // Step 4: Mark as ordered
    await page.click('[data-testid="mark-ordered-button"]')
    await expect(page.locator('text=ordered')).toBeVisible()

    // Step 5: Receive order
    await page.click('[data-testid="receive-order-button"]')
    await page.click('text=Receive Order')

    // Verify order received and stock updated
    await expect(page.locator('text=received')).toBeVisible()
    
    // Check that stock was updated
    await page.click('text=Products')
    await page.fill('[placeholder="Search products..."]', 'Purchase Test Product')
    await expect(page.locator('text=30')).toBeVisible() // 10 + 20
  })
})
