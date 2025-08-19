import { describe, it, expect, beforeEach } from 'vitest'
import { 
  offlineProductStorage,
  offlineProductStockStorage,
  offlineStockTransactionStorage,
  offlineSaleStorage
} from '../../lib/offline-storage'

describe('Offline Storage - Basic Operations', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Product Storage', () => {
    it('should create and retrieve a product', () => {
      const product = {
        name: 'Test Product',
        sku: 'TEST-001',
        barcode: '123456789',
        category: 'Electronics',
        price: 99.99,
        cost: 50.00,
        quantity: 100,
        minStock: 10,
        description: 'Test product description'
      }

      const created = offlineProductStorage.create(product)
      
      expect(created).toMatchObject(product)
      expect(created.id).toBeDefined()
      expect(created.createdAt).toBeDefined()
      expect(created.updatedAt).toBeDefined()

      const retrieved = offlineProductStorage.getById(created.id)
      expect(retrieved).toEqual(created)
    })

    it('should update product quantity', async () => {
      const product = offlineProductStorage.create({
        name: 'Test Product',
        sku: 'TEST-001',
        price: 29.99,
        cost: 15.00,
        quantity: 100,
        minStock: 10
      })

      // Add small delay to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const updated = offlineProductStorage.update(product.id, { quantity: 150 })
      
      expect(updated?.quantity).toBe(150)
      expect(updated?.updatedAt).not.toBe(product.updatedAt)
    })

    it('should search products by name and SKU', () => {
      offlineProductStorage.create({ name: 'iPhone 15', sku: 'IP15-001', price: 999, cost: 500, quantity: 10, minStock: 5 })
      offlineProductStorage.create({ name: 'Samsung Galaxy', sku: 'SG-001', price: 899, cost: 450, quantity: 15, minStock: 5 })

      const searchResults = offlineProductStorage.search('iPhone')
      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].name).toBe('iPhone 15')

      const skuResults = offlineProductStorage.search('SG-001')
      expect(skuResults).toHaveLength(1)
      expect(skuResults[0].sku).toBe('SG-001')
    })
  })

  describe('Product Stock Storage', () => {
    it('should manage warehouse-specific stock using upsert', () => {
      const productId = 'product-1'
      const warehouseId = 'warehouse-1'

      // Create initial stock entry
      const stockEntry = offlineProductStockStorage.upsert({
        productId,
        warehouseId,
        quantity: 100,
        reason: 'Initial stock'
      })
      
      expect(stockEntry.productId).toBe(productId)
      expect(stockEntry.warehouseId).toBe(warehouseId)
      expect(stockEntry.quantity).toBe(100)

      // Update existing stock
      const updated = offlineProductStockStorage.upsert({
        productId,
        warehouseId,
        quantity: 150,
        reason: 'Stock adjustment'
      })
      expect(updated.quantity).toBe(150)

      // Get stock by product
      const productStock = offlineProductStockStorage.getByProduct(productId)
      expect(productStock).toHaveLength(1)
      expect(productStock[0].quantity).toBe(150)
    })

    it('should get stock by product and location', () => {
      const productId = 'product-1'
      const warehouseId = 'warehouse-1'
      
      offlineProductStockStorage.upsert({
        productId,
        locationId: warehouseId,
        quantity: 50,
        reason: 'Initial'
      })

      const stock = offlineProductStockStorage.getByProductAndLocation(productId, warehouseId)
      expect(stock?.quantity).toBe(50)
    })
  })

  describe('Stock Transaction Storage', () => {
    it('should record stock transactions', () => {
      const transaction = {
        productId: 'product-1',
        warehouseId: 'warehouse-1',
        type: 'sale' as const,
        quantity: -5,
        previousQuantity: 100,
        newQuantity: 95,
        reason: 'POS Sale',
        reference: 'SALE-001'
      }

      const created = offlineStockTransactionStorage.create(transaction)
      
      expect(created).toMatchObject(transaction)
      expect(created.id).toBeDefined()
      expect(created.createdAt).toBeDefined()
    })

    it('should filter transactions by product', () => {
      const productId = 'product-1'
      
      offlineStockTransactionStorage.create({
        productId,
        warehouseId: 'warehouse-1',
        type: 'sale',
        quantity: -5,
        previousQuantity: 100,
        newQuantity: 95,
        reason: 'Sale'
      })

      offlineStockTransactionStorage.create({
        productId: 'product-2',
        warehouseId: 'warehouse-1',
        type: 'purchase',
        quantity: 10,
        previousQuantity: 0,
        newQuantity: 10,
        reason: 'Purchase'
      })

      const productTransactions = offlineStockTransactionStorage.getByProduct(productId)
      expect(productTransactions).toHaveLength(1)
      expect(productTransactions[0].productId).toBe(productId)
    })

    it('should filter transactions by warehouse', () => {
      const warehouseId = 'warehouse-1'
      
      offlineStockTransactionStorage.create({
        productId: 'product-1',
        warehouseId,
        type: 'adjustment',
        quantity: 5,
        previousQuantity: 95,
        newQuantity: 100,
        reason: 'Stock adjustment'
      })

      offlineStockTransactionStorage.create({
        productId: 'product-1',
        warehouseId: 'warehouse-2',
        type: 'transfer_in',
        quantity: 10,
        previousQuantity: 0,
        newQuantity: 10,
        reason: 'Transfer from warehouse-1'
      })

      const warehouseTransactions = offlineStockTransactionStorage.getByWarehouse(warehouseId)
      expect(warehouseTransactions).toHaveLength(1)
      expect(warehouseTransactions[0].warehouseId).toBe(warehouseId)
    })
  })

  describe('Sale Storage', () => {
    it('should create and retrieve sales', () => {
      const sale = {
        customerId: 'customer-1',
        warehouseId: 'warehouse-1',
        items: [
          {
            productId: 'product-1',
            quantity: 2,
            unitPrice: 25.99,
            total: 51.98
          }
        ],
        subtotal: 51.98,
        tax: 10.40,
        total: 62.38,
        paymentMethod: 'cash' as const,
        paymentStatus: 'paid' as const,
        paidAmount: 62.38,
        remainingAmount: 0
      }

      const created = offlineSaleStorage.create(sale)
      
      expect(created).toMatchObject(sale)
      expect(created.id).toBeDefined()
      expect(created.saleNumber).toBeDefined()
      expect(created.createdAt).toBeDefined()

      const retrieved = offlineSaleStorage.getById(created.id)
      expect(retrieved).toEqual(created)
    })
  })
})
