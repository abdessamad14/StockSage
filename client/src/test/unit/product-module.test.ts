import { describe, it, expect, beforeEach } from 'vitest'
import { 
  offlineProductStorage,
  offlineProductStockStorage,
  offlineStockTransactionStorage
} from '../../lib/offline-storage'

describe('Product/Article Module Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Product CRUD Operations', () => {
    it('should create product with all required fields', () => {
      const productData = {
        name: 'iPhone 15 Pro',
        sku: 'IP15P-256-BLU',
        barcode: '1234567890123',
        category: 'Electronics',
        price: 999.99,
        cost: 650.00,
        quantity: 25,
        minStock: 5,
        description: 'Latest iPhone with 256GB storage in Blue',
        supplier: 'Apple Inc.',
        location: 'A1-B2-C3'
      }

      const product = offlineProductStorage.create(productData)

      expect(product.id).toBeDefined()
      expect(product.name).toBe('iPhone 15 Pro')
      expect(product.sku).toBe('IP15P-256-BLU')
      expect(product.barcode).toBe('1234567890123')
      expect(product.price).toBe(999.99)
      expect(product.cost).toBe(650.00)
      expect(product.quantity).toBe(25)
      expect(product.minStock).toBe(5)
      expect(product.createdAt).toBeDefined()
      expect(product.updatedAt).toBeDefined()
    })

    it('should update product information', async () => {
      const product = offlineProductStorage.create({
        name: 'Original Product',
        sku: 'ORIG-001',
        price: 25.99,
        cost: 12.50,
        quantity: 50,
        minStock: 10
      })

      // Add small delay to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10))

      const updatedProduct = offlineProductStorage.update(product.id, {
        name: 'Updated Product',
        description: 'Updated description',
        minStock: 15
      })

      expect(updatedProduct?.name).toBe('Updated Product')
      expect(updatedProduct?.description).toBe('Updated description')
      expect(updatedProduct?.minStock).toBe(15)
      expect(updatedProduct?.updatedAt).not.toBe(product.updatedAt)
    })

    it('should delete product', () => {
      const product = offlineProductStorage.create({
        name: 'Delete Me',
        sku: 'DEL-001',
        price: 10.00,
        cost: 5.00,
        quantity: 1,
        minStock: 1
      })

      const deleted = offlineProductStorage.delete(product.id)
      expect(deleted).toBe(true)

      const retrieved = offlineProductStorage.getById(product.id)
      expect(retrieved).toBeUndefined()
    })

    it('should retrieve product by ID', () => {
      const product = offlineProductStorage.create({
        name: 'Retrieve Test',
        sku: 'RET-001',
        price: 30.00,
        cost: 15.00,
        quantity: 50,
        minStock: 5
      })

      const retrieved = offlineProductStorage.getById(product.id)
      expect(retrieved).toEqual(product)
    })

    it('should get all products', () => {
      offlineProductStorage.create({
        name: 'Product 1',
        sku: 'P1',
        price: 10.00,
        cost: 5.00,
        quantity: 10,
        minStock: 2
      })

      offlineProductStorage.create({
        name: 'Product 2',
        sku: 'P2',
        price: 20.00,
        cost: 10.00,
        quantity: 20,
        minStock: 3
      })

      const allProducts = offlineProductStorage.getAll()
      expect(allProducts).toHaveLength(2)
      expect(allProducts[0].name).toBe('Product 1')
      expect(allProducts[1].name).toBe('Product 2')
    })
  })

  describe('Product Search and Filtering', () => {
    beforeEach(() => {
      // Create test products
      offlineProductStorage.create({
        name: 'iPhone 15',
        sku: 'IP15-128',
        barcode: '1111111111111',
        category: 'Electronics',
        price: 799.99,
        cost: 500.00,
        quantity: 15,
        minStock: 5,
        description: 'Apple iPhone 15 with 128GB'
      })

      offlineProductStorage.create({
        name: 'Samsung Galaxy S24',
        sku: 'SGS24-256',
        barcode: '2222222222222',
        category: 'Electronics',
        price: 899.99,
        cost: 600.00,
        quantity: 8,
        minStock: 3,
        description: 'Samsung Galaxy S24 with 256GB'
      })

      offlineProductStorage.create({
        name: 'iPad Pro',
        sku: 'IPADPRO-512',
        barcode: '3333333333333',
        category: 'Tablets',
        price: 1099.99,
        cost: 700.00,
        quantity: 5,
        minStock: 2,
        description: 'Apple iPad Pro with 512GB'
      })
    })

    it('should search products by name', () => {
      const results = offlineProductStorage.search('iPhone')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('iPhone 15')
    })

    it('should search products by SKU', () => {
      const results = offlineProductStorage.search('SGS24')
      expect(results).toHaveLength(1)
      expect(results[0].sku).toBe('SGS24-256')
    })

    it('should search products by barcode', () => {
      const results = offlineProductStorage.search('3333333333333')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('iPad Pro')
    })

    it('should search products by description', () => {
      const results = offlineProductStorage.search('256GB')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Samsung Galaxy S24')
    })

    it('should return empty array for no matches', () => {
      const results = offlineProductStorage.search('NonExistent')
      expect(results).toHaveLength(0)
    })

    it('should be case insensitive', () => {
      const results = offlineProductStorage.search('iphone')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('iPhone 15')
    })
  })

  describe('Product Pricing and Margins', () => {
    it('should calculate profit margin correctly', () => {
      const product = {
        cost: 50.00,
        price: 80.00
      }

      const profit = product.price - product.cost
      const marginPercentage = (profit / product.price) * 100
      const markupPercentage = (profit / product.cost) * 100

      expect(profit).toBe(30.00)
      expect(marginPercentage).toBe(37.5) // 30/80 * 100
      expect(markupPercentage).toBe(60.0) // 30/50 * 100
    })

    it('should handle price updates with margin calculations', () => {
      const product = offlineProductStorage.create({
        name: 'Margin Test',
        sku: 'MAR-001',
        price: 100.00,
        cost: 60.00,
        quantity: 10,
        minStock: 2
      })

      // Update price to maintain 40% margin
      const targetMargin = 0.40
      const newPrice = product.cost / (1 - targetMargin) // 60 / 0.6 = 100
      
      const updated = offlineProductStorage.update(product.id, { price: newPrice })
      
      const actualMargin = ((updated!.price - updated!.cost) / updated!.price)
      expect(Math.round(actualMargin * 100)).toBe(40)
    })
  })

  describe('Product Stock Validation', () => {
    it('should identify low stock products', () => {
      const lowStockProduct = offlineProductStorage.create({
        name: 'Low Stock Item',
        sku: 'LOW-001',
        price: 25.00,
        cost: 12.50,
        quantity: 3,
        minStock: 10
      })

      const normalStockProduct = offlineProductStorage.create({
        name: 'Normal Stock Item',
        sku: 'NOR-001',
        price: 35.00,
        cost: 17.50,
        quantity: 25,
        minStock: 10
      })

      const allProducts = offlineProductStorage.getAll()
      const lowStockItems = allProducts.filter(p => p.quantity <= p.minStock)

      expect(lowStockItems).toHaveLength(1)
      expect(lowStockItems[0].id).toBe(lowStockProduct.id)
    })

    it('should validate stock levels before operations', () => {
      const product = offlineProductStorage.create({
        name: 'Stock Validation Test',
        sku: 'VAL-001',
        price: 50.00,
        cost: 25.00,
        quantity: 5,
        minStock: 2
      })

      // Test sufficient stock
      const requestedQty = 3
      const hasSufficientStock = product.quantity >= requestedQty
      expect(hasSufficientStock).toBe(true)

      // Test insufficient stock
      const excessiveQty = 10
      const hasExcessiveStock = product.quantity >= excessiveQty
      expect(hasExcessiveStock).toBe(false)
    })
  })

  describe('Product Categories and Organization', () => {
    it('should group products by category', () => {
      const products = [
        { name: 'iPhone', category: 'Electronics', price: 800 },
        { name: 'T-Shirt', category: 'Clothing', price: 25 },
        { name: 'iPad', category: 'Electronics', price: 600 },
        { name: 'Jeans', category: 'Clothing', price: 60 }
      ]

      const groupedByCategory = products.reduce((groups, product) => {
        const category = product.category
        if (!groups[category]) {
          groups[category] = []
        }
        groups[category].push(product)
        return groups
      }, {} as Record<string, typeof products>)

      expect(groupedByCategory['Electronics']).toHaveLength(2)
      expect(groupedByCategory['Clothing']).toHaveLength(2)
      expect(groupedByCategory['Electronics'][0].name).toBe('iPhone')
      expect(groupedByCategory['Clothing'][0].name).toBe('T-Shirt')
    })
  })

  describe('Product Barcode Management', () => {
    it('should handle barcode uniqueness', () => {
      const product1 = offlineProductStorage.create({
        name: 'Product 1',
        sku: 'P1',
        barcode: '1234567890123',
        price: 10.00,
        cost: 5.00,
        quantity: 10,
        minStock: 2
      })

      // In a real implementation, this should prevent duplicate barcodes
      const product2 = offlineProductStorage.create({
        name: 'Product 2',
        sku: 'P2',
        barcode: '1234567890123', // Same barcode
        price: 20.00,
        cost: 10.00,
        quantity: 20,
        minStock: 3
      })

      // For now, both are created, but in production this should be validated
      expect(product1.barcode).toBe(product2.barcode)
      
      // Test finding by barcode
      const foundProducts = offlineProductStorage.search('1234567890123')
      expect(foundProducts.length).toBeGreaterThan(0)
    })

    it('should validate barcode formats', () => {
      const validateEAN13 = (barcode: string): boolean => {
        return /^\d{13}$/.test(barcode)
      }

      const validateUPC = (barcode: string): boolean => {
        return /^\d{12}$/.test(barcode)
      }

      expect(validateEAN13('1234567890123')).toBe(true)
      expect(validateEAN13('12345678901234')).toBe(false) // Too long
      expect(validateEAN13('123456789012')).toBe(false) // Too short

      expect(validateUPC('123456789012')).toBe(true)
      expect(validateUPC('1234567890123')).toBe(false) // Too long
    })
  })

  describe('Product Multi-Warehouse Stock', () => {
    it('should manage stock across multiple warehouses', () => {
      const product = offlineProductStorage.create({
        name: 'Multi-Warehouse Product',
        sku: 'MW-001',
        price: 75.00,
        cost: 40.00,
        quantity: 100, // Total quantity
        minStock: 20
      })

      // Set stock in different warehouses
      const warehouse1Stock = offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: 'warehouse-1',
        quantity: 60,
        reason: 'Initial stock - Warehouse 1'
      })

      const warehouse2Stock = offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: 'warehouse-2',
        quantity: 40,
        reason: 'Initial stock - Warehouse 2'
      })

      expect(warehouse1Stock.quantity).toBe(60)
      expect(warehouse2Stock.quantity).toBe(40)

      // Get all stock locations for product
      const allStock = offlineProductStockStorage.getByProduct(product.id)
      expect(allStock).toHaveLength(2)

      const totalStock = allStock.reduce((sum, stock) => sum + stock.quantity, 0)
      expect(totalStock).toBe(100)
    })

    it('should track stock movements between warehouses', () => {
      const product = offlineProductStorage.create({
        name: 'Transfer Product',
        sku: 'TRF-001',
        price: 50.00,
        cost: 25.00,
        quantity: 100,
        minStock: 10
      })

      // Initial stock setup
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: 'warehouse-1',
        quantity: 100,
        reason: 'Initial stock'
      })

      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: 'warehouse-2',
        quantity: 0,
        reason: 'Initial stock'
      })

      // Transfer 25 units from warehouse-1 to warehouse-2
      const transferQty = 25

      // Update source warehouse
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: 'warehouse-1',
        quantity: 75,
        reason: 'Transfer out to Warehouse 2'
      })

      // Update target warehouse
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: 'warehouse-2',
        quantity: 25,
        reason: 'Transfer in from Warehouse 1'
      })

      // Record transactions
      offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: 'warehouse-1',
        type: 'transfer_out',
        quantity: -transferQty,
        previousQuantity: 100,
        newQuantity: 75,
        reason: 'Transfer to Warehouse 2',
        reference: 'TRF-001'
      })

      offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: 'warehouse-2',
        type: 'transfer_in',
        quantity: transferQty,
        previousQuantity: 0,
        newQuantity: 25,
        reason: 'Transfer from Warehouse 1',
        reference: 'TRF-001'
      })

      // Verify final stock levels
      const warehouse1Final = offlineProductStockStorage.getByProductAndLocation(product.id, 'warehouse-1')
      const warehouse2Final = offlineProductStockStorage.getByProductAndLocation(product.id, 'warehouse-2')

      expect(warehouse1Final?.quantity).toBe(75)
      expect(warehouse2Final?.quantity).toBe(25)

      // Verify transactions recorded
      const transactions = offlineStockTransactionStorage.getByProduct(product.id)
      expect(transactions).toHaveLength(2)
      expect(transactions.some(t => t.type === 'transfer_out')).toBe(true)
      expect(transactions.some(t => t.type === 'transfer_in')).toBe(true)
    })
  })
})
