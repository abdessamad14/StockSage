import { describe, it, expect, beforeEach } from 'vitest'
import { 
  offlineProductStorage,
  offlineProductStockStorage,
  offlineStockTransactionStorage,
  offlinePurchaseOrderStorage,
  offlineSaleStorage
} from '../../lib/offline-storage'

describe('Offline Storage - Products', () => {
  beforeEach(() => {
    localStorage.clear()
  })

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
    await new Promise(resolve => setTimeout(resolve, 1))

    const updated = offlineProductStorage.update(product.id, { quantity: 150 })
    
    expect(updated?.quantity).toBe(150)
    expect(updated?.updatedAt).not.toBe(product.updatedAt)
  })

  it('should search products by name and SKU', () => {
    offlineProductStorage.create({ name: 'iPhone 15', sku: 'IP15-001', price: 999, cost: 500, quantity: 10, minStock: 5 })
    offlineProductStorage.create({ name: 'Samsung Galaxy', sku: 'SG-001', price: 899, cost: 450, quantity: 15, minStock: 5 })
    offlineProductStorage.create({ name: 'iPad Pro', sku: 'IPD-001', price: 1099, cost: 600, quantity: 8, minStock: 3 })

    const searchResults = offlineProductStorage.search('iPhone')
    expect(searchResults).toHaveLength(1)
    expect(searchResults[0].name).toBe('iPhone 15')

    const skuResults = offlineProductStorage.search('SG-001')
    expect(skuResults).toHaveLength(1)
    expect(skuResults[0].sku).toBe('SG-001')
  })

  it('should get low stock products', () => {
    offlineProductStorage.create({ name: 'Low Stock Item', sku: 'LOW-001', price: 50, cost: 25, quantity: 3, minStock: 10 })
    offlineProductStorage.create({ name: 'Normal Stock Item', sku: 'NORM-001', price: 75, cost: 35, quantity: 50, minStock: 10 })

    const lowStockItems = offlineProductStorage.getLowStock()
    expect(lowStockItems).toHaveLength(1)
    expect(lowStockItems[0].name).toBe('Low Stock Item')
  })
})

describe('Offline Storage - Product Stock', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should manage warehouse-specific stock', () => {
    const productId = 'product-1'
    const warehouseId = 'warehouse-1'

    // Set initial stock
    const stockEntry = offlineProductStockStorage.setQuantity(productId, warehouseId, 100, 'Initial stock')
    
    expect(stockEntry.productId).toBe(productId)
    expect(stockEntry.locationId).toBe(warehouseId)
    expect(stockEntry.quantity).toBe(100)

    // Update stock
    const updated = offlineProductStockStorage.updateQuantity(productId, warehouseId, 150, 'Stock adjustment')
    expect(updated?.quantity).toBe(150)

    // Get stock by product
    const productStock = offlineProductStockStorage.getByProduct(productId)
    expect(productStock).toHaveLength(1)
    expect(productStock[0].quantity).toBe(150)
  })

  it('should calculate total stock across warehouses', () => {
    const productId = 'product-1'
    
    offlineProductStockStorage.setQuantity(productId, 'warehouse-1', 50, 'Initial')
    offlineProductStockStorage.setQuantity(productId, 'warehouse-2', 75, 'Initial')
    offlineProductStockStorage.setQuantity(productId, 'warehouse-3', 25, 'Initial')

    const totalStock = offlineProductStockStorage.getTotalQuantity(productId)
    expect(totalStock).toBe(150)
  })
})

describe('Offline Storage - Stock Transactions', () => {
  beforeEach(() => {
    localStorage.clear()
  })

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
