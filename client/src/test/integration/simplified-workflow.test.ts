import { describe, it, expect, beforeEach } from 'vitest'
import { 
  offlineProductStorage,
  offlineProductStockStorage,
  offlineStockTransactionStorage,
  offlineSaleStorage
} from '../../lib/offline-storage'

describe('Stock Workflow Integration Tests - Simplified', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('POS Sale Workflow', () => {
    it('should complete sale workflow with stock updates', () => {
      // Setup: Create product
      const product = offlineProductStorage.create({
        name: 'Test Product',
        sku: 'TEST-001',
        price: 50.00,
        cost: 25.00,
        quantity: 100,
        minStock: 10
      })

      const warehouseId = 'warehouse-1'
      
      // Setup initial stock
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: 100,
        reason: 'Initial stock'
      })

      // Step 1: Create sale
      const sale = offlineSaleStorage.create({
        customerId: 'customer-1',
        warehouseId,
        items: [
          {
            productId: product.id,
            quantity: 5,
            unitPrice: 50.00,
            total: 250.00
          }
        ],
        subtotal: 250.00,
        tax: 50.00,
        total: 300.00,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        paidAmount: 300.00,
        remainingAmount: 0
      })

      expect(sale.id).toBeDefined()
      expect(sale.total).toBe(300.00)

      // Step 2: Update stock (simulate POS logic)
      const updatedStock = offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: 95, // 100 - 5
        reason: 'POS Sale'
      })
      expect(updatedStock.quantity).toBe(95)

      // Step 3: Record stock transaction
      const transaction = offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: warehouseId,
        type: 'sale',
        quantity: -5,
        previousQuantity: 100,
        newQuantity: 95,
        reason: 'POS Sale',
        reference: `SALE-${sale.saleNumber}`,
        relatedId: sale.id
      })

      expect(transaction.type).toBe('sale')
      expect(transaction.quantity).toBe(-5)
      expect(transaction.newQuantity).toBe(95)

      // Step 4: Update product base quantity
      const updatedProduct = offlineProductStorage.update(product.id, { quantity: 95 })
      expect(updatedProduct?.quantity).toBe(95)

      // Verify complete workflow
      const finalStock = offlineProductStockStorage.getByProductAndLocation(product.id, warehouseId)
      const productTransactions = offlineStockTransactionStorage.getByProduct(product.id)
      
      expect(finalStock?.quantity).toBe(95)
      expect(productTransactions).toHaveLength(1)
      expect(productTransactions[0].relatedId).toBe(sale.id)
    })
  })

  describe('Stock Adjustment Workflow', () => {
    it('should handle stock adjustments with transaction recording', () => {
      // Setup: Create product with stock
      const product = offlineProductStorage.create({
        name: 'Adjustment Product',
        sku: 'ADJ-001',
        price: 75.00,
        cost: 35.00,
        quantity: 50,
        minStock: 10
      })

      const warehouseId = 'warehouse-1'
      
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: 50,
        reason: 'Initial stock'
      })

      // Step 1: Perform adjustment
      const newQuantity = 75
      const previousQuantity = 50
      const adjustmentReason = 'Stock count correction'

      const updatedStock = offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: newQuantity,
        reason: adjustmentReason
      })

      expect(updatedStock.quantity).toBe(75)

      // Step 2: Record adjustment transaction
      const adjustmentTransaction = offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId,
        type: 'adjustment',
        quantity: newQuantity - previousQuantity,
        previousQuantity,
        newQuantity,
        reason: adjustmentReason,
        reference: 'ADJ-001'
      })

      // Step 3: Update product base quantity
      const updatedProduct = offlineProductStorage.update(product.id, { 
        quantity: newQuantity 
      })

      // Verify adjustment
      expect(adjustmentTransaction.type).toBe('adjustment')
      expect(adjustmentTransaction.quantity).toBe(25)
      expect(adjustmentTransaction.newQuantity).toBe(75)
      expect(updatedProduct?.quantity).toBe(75)

      const adjustmentTransactions = offlineStockTransactionStorage.getByProduct(product.id)
      expect(adjustmentTransactions).toHaveLength(1)
      expect(adjustmentTransactions[0].reason).toBe(adjustmentReason)
    })
  })

  describe('Multi-Product Sale Workflow', () => {
    it('should handle sales with multiple products', () => {
      // Setup: Create multiple products
      const product1 = offlineProductStorage.create({
        name: 'Product 1',
        sku: 'PROD-001',
        price: 25.00,
        cost: 12.50,
        quantity: 50,
        minStock: 10
      })

      const product2 = offlineProductStorage.create({
        name: 'Product 2',
        sku: 'PROD-002',
        price: 35.00,
        cost: 17.50,
        quantity: 30,
        minStock: 5
      })

      const warehouseId = 'warehouse-1'

      // Setup initial stock
      offlineProductStockStorage.upsert({
        productId: product1.id,
        locationId: warehouseId,
        quantity: 50,
        reason: 'Initial stock'
      })

      offlineProductStockStorage.upsert({
        productId: product2.id,
        locationId: warehouseId,
        quantity: 30,
        reason: 'Initial stock'
      })

      // Create multi-product sale
      const sale = offlineSaleStorage.create({
        customerId: 'customer-1',
        warehouseId,
        items: [
          {
            productId: product1.id,
            quantity: 3,
            unitPrice: 25.00,
            total: 75.00
          },
          {
            productId: product2.id,
            quantity: 2,
            unitPrice: 35.00,
            total: 70.00
          }
        ],
        subtotal: 145.00,
        tax: 29.00,
        total: 174.00,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        paidAmount: 174.00,
        remainingAmount: 0
      })

      // Process each item
      sale.items.forEach(item => {
        const currentStock = offlineProductStockStorage.getByProductAndLocation(item.productId, warehouseId)
        const newQuantity = (currentStock?.quantity || 0) - item.quantity

        // Update stock
        offlineProductStockStorage.upsert({
          productId: item.productId,
          locationId: warehouseId,
          quantity: newQuantity,
          reason: 'POS Sale'
        })

        // Record transaction
        offlineStockTransactionStorage.create({
          productId: item.productId,
          warehouseId,
          type: 'sale',
          quantity: -item.quantity,
          previousQuantity: currentStock?.quantity || 0,
          newQuantity,
          reason: 'POS Sale',
          reference: `SALE-${sale.saleNumber}`,
          relatedId: sale.id
        })

        // Update product base quantity
        offlineProductStorage.update(item.productId, { quantity: newQuantity })
      })

      // Verify results
      const product1FinalStock = offlineProductStockStorage.getByProductAndLocation(product1.id, warehouseId)
      const product2FinalStock = offlineProductStockStorage.getByProductAndLocation(product2.id, warehouseId)

      expect(product1FinalStock?.quantity).toBe(47) // 50 - 3
      expect(product2FinalStock?.quantity).toBe(28) // 30 - 2

      const allTransactions = offlineStockTransactionStorage.getAll()
      const saleTransactions = allTransactions.filter(t => t.relatedId === sale.id)
      expect(saleTransactions).toHaveLength(2)
    })
  })

  describe('Stock Transfer Workflow', () => {
    it('should handle stock transfer between warehouses', () => {
      // Setup: Create product with stock in source warehouse
      const product = offlineProductStorage.create({
        name: 'Transfer Product',
        sku: 'TRANS-001',
        price: 60.00,
        cost: 30.00,
        quantity: 100,
        minStock: 20
      })

      const sourceWarehouse = 'warehouse-1'
      const targetWarehouse = 'warehouse-2'
      const transferQuantity = 25

      // Initial stock setup
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: sourceWarehouse,
        quantity: 100,
        reason: 'Initial stock'
      })

      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: targetWarehouse,
        quantity: 0,
        reason: 'Initial stock'
      })

      // Step 1: Transfer out from source warehouse
      const sourceStock = offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: sourceWarehouse,
        quantity: 75, // 100 - 25
        reason: 'Stock Transfer Out'
      })

      const transferOutTransaction = offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: sourceWarehouse,
        type: 'transfer_out',
        quantity: -transferQuantity,
        previousQuantity: 100,
        newQuantity: 75,
        reason: 'Stock Transfer to Warehouse 2',
        reference: 'TRANSFER-001'
      })

      // Step 2: Transfer in to target warehouse
      const targetStock = offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: targetWarehouse,
        quantity: 25, // 0 + 25
        reason: 'Stock Transfer In'
      })

      const transferInTransaction = offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: targetWarehouse,
        type: 'transfer_in',
        quantity: transferQuantity,
        previousQuantity: 0,
        newQuantity: 25,
        reason: 'Stock Transfer from Warehouse 1',
        reference: 'TRANSFER-001'
      })

      // Verify transfer
      expect(sourceStock.quantity).toBe(75)
      expect(targetStock.quantity).toBe(25)
      expect(transferOutTransaction.type).toBe('transfer_out')
      expect(transferInTransaction.type).toBe('transfer_in')

      // Verify total stock remains the same
      const sourceStockFinal = offlineProductStockStorage.getByProductAndLocation(product.id, sourceWarehouse)
      const targetStockFinal = offlineProductStockStorage.getByProductAndLocation(product.id, targetWarehouse)
      const totalStock = (sourceStockFinal?.quantity || 0) + (targetStockFinal?.quantity || 0)
      expect(totalStock).toBe(100) // 75 + 25

      const allTransactions = offlineStockTransactionStorage.getByProduct(product.id)
      expect(allTransactions).toHaveLength(2)
      expect(allTransactions.some(t => t.type === 'transfer_out')).toBe(true)
      expect(allTransactions.some(t => t.type === 'transfer_in')).toBe(true)
    })
  })
})
