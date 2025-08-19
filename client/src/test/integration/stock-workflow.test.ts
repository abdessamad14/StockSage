import { describe, it, expect, beforeEach } from 'vitest'
import { 
  offlineProductStorage,
  offlineProductStockStorage,
  offlineStockTransactionStorage,
  offlineSaleStorage,
  offlinePurchaseOrderStorage,
  offlinePurchaseOrderItemStorage
} from '../../lib/offline-storage'

describe('Stock Workflow Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('POS Sale Workflow', () => {
    it('should complete full sale workflow with stock updates and transaction recording', () => {
      // Setup: Create product and initial stock
      const product = offlineProductStorage.create({
        name: 'Test Product',
        sku: 'TEST-001',
        price: 50.00,
        cost: 25.00,
        quantity: 100,
        minStock: 10
      })

      const warehouseId = 'warehouse-1'
      offlineProductStockStorage.setQuantity(product.id, warehouseId, 100, 'Initial stock')

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

      // Step 2: Process stock updates (simulate POS logic)
      const saleItem = sale.items[0]
      const previousStock = offlineProductStockStorage.getByProductAndWarehouse(product.id, warehouseId)
      expect(previousStock?.quantity).toBe(100)

      // Update stock quantity
      const updatedStock = offlineProductStockStorage.updateQuantity(
        product.id,
        warehouseId,
        95, // 100 - 5
        'POS Sale',
        sale.id
      )
      expect(updatedStock?.quantity).toBe(95)

      // Step 3: Record stock transaction
      const transaction = offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId,
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
      const finalStock = offlineProductStockStorage.getByProductAndWarehouse(product.id, warehouseId)
      const productTransactions = offlineStockTransactionStorage.getByProduct(product.id)
      
      expect(finalStock?.quantity).toBe(95)
      expect(productTransactions).toHaveLength(1)
      expect(productTransactions[0].relatedId).toBe(sale.id)
    })
  })

  describe('Purchase Order Workflow', () => {
    it('should complete full purchase order workflow from creation to receiving', () => {
      // Setup: Create product
      const product = offlineProductStorage.create({
        name: 'Purchase Product',
        sku: 'PURCH-001',
        price: 100.00,
        cost: 50.00,
        quantity: 10,
        minStock: 5
      })

      const warehouseId = 'warehouse-1'
      const supplierId = 'supplier-1'

      // Initial stock
      offlineProductStockStorage.setQuantity(product.id, warehouseId, 10, 'Initial stock')

      // Step 1: Create purchase order
      const order = offlinePurchaseOrderStorage.create({
        orderNumber: 'PO-001',
        supplierId,
        warehouseId,
        status: 'draft',
        orderDate: new Date().toISOString(),
        subtotal: 500.00,
        tax: 100.00,
        total: 600.00,
        paymentMethod: 'credit',
        paymentStatus: 'unpaid',
        paidAmount: 0,
        remainingAmount: 600.00
      })

      // Step 2: Add order items
      const orderItem = offlinePurchaseOrderItemStorage.create({
        orderId: order.id,
        productId: product.id,
        quantity: 10,
        unitCost: 50.00,
        total: 500.00
      })

      expect(order.status).toBe('draft')
      expect(orderItem.quantity).toBe(10)

      // Step 3: Mark as ordered
      const orderedOrder = offlinePurchaseOrderStorage.update(order.id, { 
        status: 'ordered' 
      })
      expect(orderedOrder?.status).toBe('ordered')

      // Step 4: Receive order (simulate receiving logic)
      const receivedOrder = offlinePurchaseOrderStorage.update(order.id, {
        status: 'received',
        receivedDate: new Date().toISOString()
      })

      // Update stock quantities
      const previousStock = offlineProductStockStorage.getByProductAndWarehouse(product.id, warehouseId)
      expect(previousStock?.quantity).toBe(10)

      const updatedStock = offlineProductStockStorage.updateQuantity(
        product.id,
        warehouseId,
        20, // 10 + 10
        'Purchase Order Receiving',
        order.id
      )
      expect(updatedStock?.quantity).toBe(20)

      // Record stock transaction
      const transaction = offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId,
        type: 'purchase',
        quantity: 10,
        previousQuantity: 10,
        newQuantity: 20,
        reason: 'Purchase Order Receiving',
        reference: order.orderNumber,
        relatedId: order.id
      })

      // Update product base quantity
      const updatedProduct = offlineProductStorage.update(product.id, { quantity: 20 })

      // Verify complete workflow
      expect(receivedOrder?.status).toBe('received')
      expect(updatedStock?.quantity).toBe(20)
      expect(updatedProduct?.quantity).toBe(20)
      expect(transaction.type).toBe('purchase')
      expect(transaction.quantity).toBe(10)

      const orderTransactions = offlineStockTransactionStorage.getByProduct(product.id)
      expect(orderTransactions).toHaveLength(1)
      expect(orderTransactions[0].reference).toBe(order.orderNumber)
    })
  })

  describe('Inventory Reconciliation Workflow', () => {
    it('should handle inventory count variance reconciliation', () => {
      // Setup: Create product with stock
      const product = offlineProductStorage.create({
        name: 'Count Product',
        sku: 'COUNT-001',
        price: 75.00,
        cost: 35.00,
        quantity: 50,
        minStock: 10
      })

      const warehouseId = 'warehouse-1'
      offlineProductStockStorage.setQuantity(product.id, warehouseId, 50, 'Initial stock')

      // Step 1: Physical count shows discrepancy
      const systemQuantity = 50
      const physicalCount = 45 // 5 units missing
      const variance = physicalCount - systemQuantity

      expect(variance).toBe(-5)

      // Step 2: Reconcile variance (accept physical count)
      const updatedStock = offlineProductStockStorage.updateQuantity(
        product.id,
        warehouseId,
        physicalCount,
        'Inventory Count Reconciliation - Accept Physical Count',
        'COUNT-001'
      )

      expect(updatedStock?.quantity).toBe(45)

      // Step 3: Record adjustment transaction
      const adjustmentTransaction = offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId,
        type: 'adjustment',
        quantity: variance,
        previousQuantity: systemQuantity,
        newQuantity: physicalCount,
        reason: 'Inventory Count Reconciliation - Accept Physical Count',
        reference: 'COUNT-001',
        relatedId: 'COUNT-001'
      })

      // Step 4: Update product base quantity
      const updatedProduct = offlineProductStorage.update(product.id, { 
        quantity: physicalCount 
      })

      // Verify reconciliation
      expect(adjustmentTransaction.type).toBe('adjustment')
      expect(adjustmentTransaction.quantity).toBe(-5)
      expect(adjustmentTransaction.newQuantity).toBe(45)
      expect(updatedProduct?.quantity).toBe(45)

      const adjustmentTransactions = offlineStockTransactionStorage.getByProduct(product.id)
      expect(adjustmentTransactions).toHaveLength(1)
      expect(adjustmentTransactions[0].reason).toContain('Inventory Count Reconciliation')
    })
  })

  describe('Multi-Warehouse Stock Transfer', () => {
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
      offlineProductStockStorage.setQuantity(product.id, sourceWarehouse, 100, 'Initial stock')
      offlineProductStockStorage.setQuantity(product.id, targetWarehouse, 0, 'Initial stock')

      // Step 1: Transfer out from source warehouse
      const sourceStock = offlineProductStockStorage.updateQuantity(
        product.id,
        sourceWarehouse,
        75, // 100 - 25
        'Stock Transfer Out',
        'TRANSFER-001'
      )

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
      const targetStock = offlineProductStockStorage.updateQuantity(
        product.id,
        targetWarehouse,
        25, // 0 + 25
        'Stock Transfer In',
        'TRANSFER-001'
      )

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
      expect(sourceStock?.quantity).toBe(75)
      expect(targetStock?.quantity).toBe(25)
      expect(transferOutTransaction.type).toBe('transfer_out')
      expect(transferInTransaction.type).toBe('transfer_in')

      // Verify total stock remains the same
      const totalStock = offlineProductStockStorage.getTotalQuantity(product.id)
      expect(totalStock).toBe(100) // 75 + 25

      const allTransactions = offlineStockTransactionStorage.getByProduct(product.id)
      expect(allTransactions).toHaveLength(2)
      expect(allTransactions.some(t => t.type === 'transfer_out')).toBe(true)
      expect(allTransactions.some(t => t.type === 'transfer_in')).toBe(true)
    })
  })
})
