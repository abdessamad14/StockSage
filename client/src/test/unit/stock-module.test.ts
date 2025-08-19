import { describe, it, expect, beforeEach } from 'vitest'
import { 
  offlineProductStorage,
  offlineProductStockStorage,
  offlineStockTransactionStorage,
  offlineStockLocationStorage
} from '../../lib/offline-storage'

describe('Stock Module Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Stock Entry Operations', () => {
    it('should add stock entry and update quantities', () => {
      // Create product and warehouse
      const product = offlineProductStorage.create({
        name: 'Stock Entry Product',
        sku: 'SEP-001',
        price: 50.00,
        cost: 25.00,
        quantity: 10,
        minStock: 5
      })

      const warehouseId = 'warehouse-main'

      // Initial stock setup
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: 10,
        reason: 'Initial stock'
      })

      // Add stock entry
      const entryQuantity = 25
      const previousStock = offlineProductStockStorage.getByProductAndLocation(product.id, warehouseId)
      
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: (previousStock?.quantity || 0) + entryQuantity,
        reason: 'Stock entry - Purchase order received'
      })

      // Record transaction
      offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: warehouseId,
        type: 'entry',
        quantity: entryQuantity,
        previousQuantity: previousStock?.quantity || 0,
        newQuantity: (previousStock?.quantity || 0) + entryQuantity,
        reason: 'Stock entry - Purchase order PO-001',
        reference: 'PO-001'
      })

      const updatedStock = offlineProductStockStorage.getByProductAndLocation(product.id, warehouseId)
      expect(updatedStock?.quantity).toBe(35) // 10 + 25

      const transactions = offlineStockTransactionStorage.getByProduct(product.id)
      expect(transactions).toHaveLength(1)
      expect(transactions[0].type).toBe('entry')
      expect(transactions[0].quantity).toBe(25)
    })

    it('should handle bulk stock entry for multiple products', () => {
      const products = [
        offlineProductStorage.create({
          name: 'Product A',
          sku: 'PA-001',
          price: 30.00,
          cost: 15.00,
          quantity: 0,
          minStock: 10
        }),
        offlineProductStorage.create({
          name: 'Product B',
          sku: 'PB-001',
          price: 40.00,
          cost: 20.00,
          quantity: 0,
          minStock: 15
        })
      ]

      const warehouseId = 'warehouse-bulk'
      const entries = [
        { productId: products[0].id, quantity: 50, cost: 15.00 },
        { productId: products[1].id, quantity: 75, cost: 20.00 }
      ]

      entries.forEach(entry => {
        // Update stock
        offlineProductStockStorage.upsert({
          productId: entry.productId,
          locationId: warehouseId,
          quantity: entry.quantity
        })

        // Record transaction
        offlineStockTransactionStorage.create({
          productId: entry.productId,
          warehouseId: warehouseId,
          type: 'entry',
          quantity: entry.quantity,
          previousQuantity: 0,
          newQuantity: entry.quantity,
          reason: 'Bulk entry - Initial inventory',
          reference: 'BULK-001'
        })
      })

      const stockA = offlineProductStockStorage.getByProductAndLocation(products[0].id, warehouseId)
      const stockB = offlineProductStockStorage.getByProductAndLocation(products[1].id, warehouseId)

      expect(stockA?.quantity).toBe(50)
      expect(stockB?.quantity).toBe(75)

      const allTransactions = offlineStockTransactionStorage.getAll()
      const bulkTransactions = allTransactions.filter(t => t.reference === 'BULK-001')
      expect(bulkTransactions).toHaveLength(2)
    })
  })

  describe('Stock Exit Operations', () => {
    it('should process stock exit and reduce quantities', () => {
      const product = offlineProductStorage.create({
        name: 'Stock Exit Product',
        sku: 'SEX-001',
        price: 60.00,
        cost: 30.00,
        quantity: 100,
        minStock: 20
      })

      const warehouseId = 'warehouse-exit'

      // Set initial stock
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: 100,
        reason: 'Initial stock'
      })

      // Process stock exit (sale)
      const exitQuantity = 15
      const currentStock = offlineProductStockStorage.getByProductAndLocation(product.id, warehouseId)
      
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: (currentStock?.quantity || 0) - exitQuantity,
        reason: 'Stock exit - Sale'
      })

      // Record transaction
      offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: warehouseId,
        type: 'exit',
        quantity: -exitQuantity,
        previousQuantity: currentStock?.quantity || 0,
        newQuantity: (currentStock?.quantity || 0) - exitQuantity,
        reason: 'Stock exit - Sale #12345',
        reference: 'SALE-12345'
      })

      const updatedStock = offlineProductStockStorage.getByProductAndLocation(product.id, warehouseId)
      expect(updatedStock?.quantity).toBe(85) // 100 - 15

      const transactions = offlineStockTransactionStorage.getByProduct(product.id)
      expect(transactions).toHaveLength(1)
      expect(transactions[0].type).toBe('exit')
      expect(transactions[0].quantity).toBe(-15)
    })

    it('should validate sufficient stock before exit', () => {
      const product = offlineProductStorage.create({
        name: 'Validation Product',
        sku: 'VAL-001',
        price: 25.00,
        cost: 12.50,
        quantity: 5,
        minStock: 2
      })

      const warehouseId = 'warehouse-validation'

      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: 5,
        reason: 'Initial stock'
      })

      const currentStock = offlineProductStockStorage.getByProductAndLocation(product.id, warehouseId)
      const requestedQuantity = 10

      const hasSufficientStock = (currentStock?.quantity || 0) >= requestedQuantity
      expect(hasSufficientStock).toBe(false)

      // Should not process exit if insufficient stock
      if (!hasSufficientStock) {
        // Stock remains unchanged
        const unchangedStock = offlineProductStockStorage.getByProductAndLocation(product.id, warehouseId)
        expect(unchangedStock?.quantity).toBe(5)
      }
    })

    it('should handle negative stock scenarios', () => {
      const product = offlineProductStorage.create({
        name: 'Negative Stock Product',
        sku: 'NEG-001',
        price: 35.00,
        cost: 17.50,
        quantity: 3,
        minStock: 5
      })

      const warehouseId = 'warehouse-negative'

      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: 3,
        reason: 'Initial stock'
      })

      // Force exit more than available (emergency sale)
      const exitQuantity = 5
      const currentStock = offlineProductStockStorage.getByProductAndLocation(product.id, warehouseId)
      
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: (currentStock?.quantity || 0) - exitQuantity,
        reason: 'Emergency sale - negative stock allowed'
      })

      offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: warehouseId,
        type: 'exit',
        quantity: -exitQuantity,
        previousQuantity: currentStock?.quantity || 0,
        newQuantity: (currentStock?.quantity || 0) - exitQuantity,
        reason: 'Emergency sale - negative stock',
        reference: 'EMERGENCY-001'
      })

      const updatedStock = offlineProductStockStorage.getByProductAndLocation(product.id, warehouseId)
      expect(updatedStock?.quantity).toBe(-2) // 3 - 5 = -2

      // Verify negative stock is tracked
      expect(updatedStock?.quantity).toBeLessThan(0)
    })
  })

  describe('Stock Transfer Operations', () => {
    it('should transfer stock between warehouses', () => {
      const product = offlineProductStorage.create({
        name: 'Transfer Product',
        sku: 'TRF-001',
        price: 45.00,
        cost: 22.50,
        quantity: 100,
        minStock: 15
      })

      const sourceWarehouse = 'warehouse-source'
      const targetWarehouse = 'warehouse-target'

      // Setup initial stock
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: sourceWarehouse,
        quantity: 100
      })

      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: targetWarehouse,
        quantity: 0
      })

      // Transfer 30 units
      const transferQuantity = 30
      const sourceStock = offlineProductStockStorage.getByProductAndLocation(product.id, sourceWarehouse)
      const targetStock = offlineProductStockStorage.getByProductAndLocation(product.id, targetWarehouse)

      // Update source warehouse (reduce)
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: sourceWarehouse,
        quantity: (sourceStock?.quantity || 0) - transferQuantity
      })

      // Update target warehouse (increase)
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: targetWarehouse,
        quantity: (targetStock?.quantity || 0) + transferQuantity
      })

      // Record transfer transactions
      const transferRef = 'TRF-001-001'

      offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: sourceWarehouse,
        type: 'transfer_out',
        quantity: -transferQuantity,
        previousQuantity: sourceStock?.quantity || 0,
        newQuantity: (sourceStock?.quantity || 0) - transferQuantity,
        reason: `Transfer to ${targetWarehouse}`,
        reference: transferRef
      })

      offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: targetWarehouse,
        type: 'transfer_in',
        quantity: transferQuantity,
        previousQuantity: targetStock?.quantity || 0,
        newQuantity: (targetStock?.quantity || 0) + transferQuantity,
        reason: `Transfer from ${sourceWarehouse}`,
        reference: transferRef
      })

      // Verify final stock levels
      const finalSourceStock = offlineProductStockStorage.getByProductAndLocation(product.id, sourceWarehouse)
      const finalTargetStock = offlineProductStockStorage.getByProductAndLocation(product.id, targetWarehouse)

      expect(finalSourceStock?.quantity).toBe(70) // 100 - 30
      expect(finalTargetStock?.quantity).toBe(30) // 0 + 30

      // Verify transfer transactions
      const transactions = offlineStockTransactionStorage.getByProduct(product.id)
      const transferTransactions = transactions.filter(t => t.reference === transferRef)
      expect(transferTransactions).toHaveLength(2)
      expect(transferTransactions.some(t => t.type === 'transfer_out')).toBe(true)
      expect(transferTransactions.some(t => t.type === 'transfer_in')).toBe(true)
    })

    it('should handle multi-product transfers', () => {
      const products = [
        offlineProductStorage.create({
          name: 'Multi Transfer A',
          sku: 'MTA-001',
          price: 20.00,
          cost: 10.00,
          quantity: 50,
          minStock: 10
        }),
        offlineProductStorage.create({
          name: 'Multi Transfer B',
          sku: 'MTB-001',
          price: 30.00,
          cost: 15.00,
          quantity: 75,
          minStock: 15
        })
      ]

      const sourceWarehouse = 'warehouse-multi-source'
      const targetWarehouse = 'warehouse-multi-target'

      // Setup initial stocks
      products.forEach((product, index) => {
        const initialQuantity = index === 0 ? 50 : 75 // Product A: 50, Product B: 75
        offlineProductStockStorage.upsert({
          productId: product.id,
          locationId: sourceWarehouse,
          quantity: initialQuantity
        })

        offlineProductStockStorage.upsert({
          productId: product.id,
          locationId: targetWarehouse,
          quantity: 0
        })
      })

      // Transfer different quantities
      const transfers = [
        { productId: products[0].id, quantity: 20 },
        { productId: products[1].id, quantity: 35 }
      ]

      const transferRef = 'MULTI-TRF-001'

      transfers.forEach(transfer => {
        const sourceStock = offlineProductStockStorage.getByProductAndLocation(transfer.productId, sourceWarehouse)
        const targetStock = offlineProductStockStorage.getByProductAndLocation(transfer.productId, targetWarehouse)

        // Update stocks
        offlineProductStockStorage.upsert({
          productId: transfer.productId,
          locationId: sourceWarehouse,
          quantity: (sourceStock?.quantity || 0) - transfer.quantity
        })

        offlineProductStockStorage.upsert({
          productId: transfer.productId,
          locationId: targetWarehouse,
          quantity: (targetStock?.quantity || 0) + transfer.quantity
        })

        // Record transactions
        offlineStockTransactionStorage.create({
          productId: transfer.productId,
          warehouseId: sourceWarehouse,
          type: 'transfer_out',
          quantity: -transfer.quantity,
          previousQuantity: sourceStock?.quantity || 0,
          newQuantity: (sourceStock?.quantity || 0) - transfer.quantity,
          reason: 'Multi-product transfer',
          reference: transferRef
        })

        offlineStockTransactionStorage.create({
          productId: transfer.productId,
          warehouseId: targetWarehouse,
          type: 'transfer_in',
          quantity: transfer.quantity,
          previousQuantity: targetStock?.quantity || 0,
          newQuantity: (targetStock?.quantity || 0) + transfer.quantity,
          reason: 'Multi-product transfer',
          reference: transferRef
        })
      })

      // Verify final stocks
      const finalStockA_Source = offlineProductStockStorage.getByProductAndLocation(products[0].id, sourceWarehouse)
      const finalStockA_Target = offlineProductStockStorage.getByProductAndLocation(products[0].id, targetWarehouse)
      const finalStockB_Source = offlineProductStockStorage.getByProductAndLocation(products[1].id, sourceWarehouse)
      const finalStockB_Target = offlineProductStockStorage.getByProductAndLocation(products[1].id, targetWarehouse)

      expect(finalStockA_Source?.quantity).toBe(30) // 50 - 20
      expect(finalStockA_Target?.quantity).toBe(20)
      expect(finalStockB_Source?.quantity).toBe(40) // 75 - 35
      expect(finalStockB_Target?.quantity).toBe(35)

      // Verify all transfer transactions recorded
      const allTransactions = offlineStockTransactionStorage.getAll()
      const multiTransferTransactions = allTransactions.filter(t => t.reference === transferRef)
      expect(multiTransferTransactions).toHaveLength(4) // 2 products × 2 transactions each
    })
  })

  describe('Stock Adjustment Operations', () => {
    it('should handle stock adjustments with reasons', () => {
      const product = offlineProductStorage.create({
        name: 'Adjustment Product',
        sku: 'ADJ-001',
        price: 55.00,
        cost: 27.50,
        quantity: 50,
        minStock: 10
      })

      const warehouseId = 'warehouse-adjustment'

      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: 50,
        reason: 'Initial stock'
      })

      // Physical count shows 47 units (3 missing - damaged/stolen)
      const physicalCount = 47
      const currentStock = offlineProductStockStorage.getByProductAndLocation(product.id, warehouseId)
      const adjustment = physicalCount - (currentStock?.quantity || 0)

      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: physicalCount,
        reason: 'Stock adjustment - Physical count'
      })

      offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: warehouseId,
        type: 'adjustment',
        quantity: adjustment,
        previousQuantity: currentStock?.quantity || 0,
        newQuantity: physicalCount,
        reason: 'Physical count adjustment - 3 units damaged',
        reference: 'ADJ-001'
      })

      const adjustedStock = offlineProductStockStorage.getByProductAndLocation(product.id, warehouseId)
      expect(adjustedStock?.quantity).toBe(47)

      const transactions = offlineStockTransactionStorage.getByProduct(product.id)
      expect(transactions).toHaveLength(1)
      expect(transactions[0].type).toBe('adjustment')
      expect(transactions[0].quantity).toBe(-3)
    })

    it('should handle positive adjustments (found stock)', () => {
      const product = offlineProductStorage.create({
        name: 'Found Stock Product',
        sku: 'FOUND-001',
        price: 40.00,
        cost: 20.00,
        quantity: 25,
        minStock: 8
      })

      const warehouseId = 'warehouse-found'

      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: 25,
        reason: 'Initial stock'
      })

      // Physical count shows 30 units (5 found in storage)
      const physicalCount = 30
      const currentStock = offlineProductStockStorage.getByProductAndLocation(product.id, warehouseId)
      const adjustment = physicalCount - (currentStock?.quantity || 0)

      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: physicalCount,
        reason: 'Stock adjustment - Found additional stock'
      })

      offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: warehouseId,
        type: 'adjustment',
        quantity: adjustment,
        previousQuantity: currentStock?.quantity || 0,
        newQuantity: physicalCount,
        reason: 'Physical count adjustment - Found 5 units in back storage',
        reference: 'FOUND-001'
      })

      const adjustedStock = offlineProductStockStorage.getByProductAndLocation(product.id, warehouseId)
      expect(adjustedStock?.quantity).toBe(30)

      const transactions = offlineStockTransactionStorage.getByProduct(product.id)
      expect(transactions).toHaveLength(1)
      expect(transactions[0].type).toBe('adjustment')
      expect(transactions[0].quantity).toBe(5) // Positive adjustment
    })
  })

  describe('Warehouse Management', () => {
    it('should manage multiple warehouse locations', () => {
      // Create warehouses
      const warehouses = [
        { id: 'wh-main', name: 'Main Warehouse', address: '123 Main St' },
        { id: 'wh-branch', name: 'Branch Store', address: '456 Branch Ave' },
        { id: 'wh-online', name: 'Online Fulfillment', address: '789 Web Blvd' }
      ]

      warehouses.forEach(warehouse => {
        offlineStockLocationStorage.create({
          name: warehouse.name,
          address: warehouse.address,
          type: 'warehouse'
        })
      })

      const allWarehouses = offlineStockLocationStorage.getAll()
      expect(allWarehouses).toHaveLength(3)
      expect(allWarehouses.some(w => w.name === 'Main Warehouse')).toBe(true)
      expect(allWarehouses.some(w => w.name === 'Branch Store')).toBe(true)
      expect(allWarehouses.some(w => w.name === 'Online Fulfillment')).toBe(true)
    })

    it('should track stock across all warehouses for a product', () => {
      const product = offlineProductStorage.create({
        name: 'Multi-Warehouse Product',
        sku: 'MWP-001',
        price: 65.00,
        cost: 32.50,
        quantity: 200,
        minStock: 30
      })

      const warehouses = ['wh-main', 'wh-branch', 'wh-online']
      const stockDistribution = [80, 70, 50] // Total: 200

      warehouses.forEach((warehouseId, index) => {
        offlineProductStockStorage.upsert({
          productId: product.id,
          locationId: warehouseId,
          quantity: stockDistribution[index]
        })
      })

      const allProductStock = offlineProductStockStorage.getByProduct(product.id)
      expect(allProductStock).toHaveLength(3)

      const totalStock = allProductStock.reduce((sum, stock) => sum + stock.quantity, 0)
      expect(totalStock).toBe(200)

      // Find warehouse with highest stock
      const highestStockWarehouse = allProductStock.reduce((max, current) => 
        current.quantity > max.quantity ? current : max
      )
      expect(highestStockWarehouse.locationId).toBe('wh-main')
      expect(highestStockWarehouse.quantity).toBe(80)
    })

    it('should identify warehouses with low stock', () => {
      const product = offlineProductStorage.create({
        name: 'Low Stock Monitor Product',
        sku: 'LSM-001',
        price: 35.00,
        cost: 17.50,
        quantity: 45,
        minStock: 15
      })

      const warehouseStocks = [
        { warehouseId: 'wh-good', quantity: 25 },    // Above min stock
        { warehouseId: 'wh-low', quantity: 12 },     // Below min stock
        { warehouseId: 'wh-critical', quantity: 8 }  // Critical low
      ]

      warehouseStocks.forEach(stock => {
        offlineProductStockStorage.upsert({
          productId: product.id,
          locationId: stock.warehouseId,
          quantity: stock.quantity
        })
      })

      const allProductStock = offlineProductStockStorage.getByProduct(product.id)
      const lowStockWarehouses = allProductStock.filter(stock => 
        stock.quantity <= product.minStock
      )

      expect(lowStockWarehouses).toHaveLength(2)
      expect(lowStockWarehouses.some(w => w.locationId === 'wh-low')).toBe(true)
      expect(lowStockWarehouses.some(w => w.locationId === 'wh-critical')).toBe(true)

      // Critical stock (below 10)
      const criticalStockWarehouses = allProductStock.filter(stock => 
        stock.quantity < 10
      )
      expect(criticalStockWarehouses).toHaveLength(1)
      expect(criticalStockWarehouses[0].locationId).toBe('wh-critical')
    })
  })
})
