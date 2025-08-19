import { describe, it, expect, beforeEach } from 'vitest'
import { 
  offlinePurchaseOrderStorage,
  offlinePurchaseOrderItemStorage,
  offlineProductStorage,
  offlineProductStockStorage,
  offlineSupplierStorage,
  offlineStockTransactionStorage
} from '../../lib/offline-storage'

describe('Purchase Module Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Purchase Order Creation and Management', () => {
    it('should create purchase order with complete information', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'Test Supplier',
        contactPerson: 'John Supplier',
        email: 'john@supplier.com',
        creditBalance: 0
      })

      const orderData = {
        supplierId: supplier.id,
        warehouseId: 'warehouse-main',
        status: 'draft' as const,
        orderDate: new Date('2024-01-15').toISOString(),
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        subtotal: 2500.00,
        tax: 200.00,
        total: 2700.00,
        notes: 'Quarterly office supplies order',
        paymentMethod: 'credit' as const,
        paymentStatus: 'unpaid' as const,
        paidAmount: 0,
        remainingAmount: 2700.00
      }

      const order = offlinePurchaseOrderStorage.create(orderData)

      expect(order.id).toBeDefined()
      expect(order.orderNumber).toBeDefined()
      expect(order.supplierId).toBe(supplier.id)
      expect(order.status).toBe('draft')
      expect(order.total).toBe(2700.00)
      expect(order.paymentMethod).toBe('credit')
      expect(order.paymentStatus).toBe('unpaid')
      expect(order.remainingAmount).toBe(2700.00)
    })

    it('should add items to purchase order', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'Item Test Supplier',
        contactPerson: 'Jane Supplier',
        email: 'jane@supplier.com',
        creditBalance: 0
      })

      const products = [
        offlineProductStorage.create({
          name: 'Office Chair',
          sku: 'CHAIR-001',
          price: 150.00,
          cost: 75.00,
          quantity: 0,
          minStock: 5
        }),
        offlineProductStorage.create({
          name: 'Desk Lamp',
          sku: 'LAMP-001',
          price: 80.00,
          cost: 40.00,
          quantity: 0,
          minStock: 10
        })
      ]

      const order = offlinePurchaseOrderStorage.create({
        supplierId: supplier.id,
        warehouseId: 'warehouse-items',
        status: 'draft',
        orderDate: new Date().toISOString(),
        subtotal: 0,
        tax: 0,
        total: 0,
        paymentMethod: 'credit',
        paymentStatus: 'unpaid',
        paidAmount: 0,
        remainingAmount: 0
      })

      const orderItems = [
        {
          orderId: order.id,
          productId: products[0].id,
          quantity: 5,
          unitCost: 75.00,
          totalCost: 375.00
        },
        {
          orderId: order.id,
          productId: products[1].id,
          quantity: 10,
          unitCost: 40.00,
          totalCost: 400.00
        }
      ]

      orderItems.forEach(item => {
        const createdItem = offlinePurchaseOrderItemStorage.create(item)
        expect(createdItem.orderId).toBe(order.id)
        expect(createdItem.quantity).toBe(item.quantity)
        expect(createdItem.totalCost).toBe(item.totalCost)
      })

      const allOrderItems = offlinePurchaseOrderItemStorage.getByOrder(order.id)
      expect(allOrderItems).toHaveLength(2)

      const orderTotal = allOrderItems.reduce((sum, item) => sum + item.totalCost, 0)
      expect(orderTotal).toBe(775.00) // 375 + 400
    })

    it('should update order status through workflow', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'Workflow Supplier',
        contactPerson: 'Work Flow',
        email: 'workflow@supplier.com',
        creditBalance: 0
      })

      const order = offlinePurchaseOrderStorage.create({
        supplierId: supplier.id,
        warehouseId: 'warehouse-workflow',
        status: 'draft',
        orderDate: new Date().toISOString(),
        subtotal: 1000.00,
        tax: 80.00,
        total: 1080.00,
        paymentMethod: 'credit',
        paymentStatus: 'unpaid',
        paidAmount: 0,
        remainingAmount: 1080.00
      })

      // Update to ordered
      const orderedUpdate = offlinePurchaseOrderStorage.update(order.id, {
        status: 'ordered'
      })
      expect(orderedUpdate?.status).toBe('ordered')

      // Update to received
      const receivedUpdate = offlinePurchaseOrderStorage.update(order.id, {
        status: 'received',
        receivedDate: new Date().toISOString()
      })
      expect(receivedUpdate?.status).toBe('received')
      expect(receivedUpdate?.receivedDate).toBeDefined()
    })
  })

  describe('Purchase Order Payment Processing', () => {
    it('should handle full payment on delivery', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'Payment Supplier',
        contactPerson: 'Pay Manager',
        email: 'payments@supplier.com',
        creditBalance: 0
      })

      const order = offlinePurchaseOrderStorage.create({
        supplierId: supplier.id,
        warehouseId: 'warehouse-payment',
        status: 'received',
        orderDate: new Date().toISOString(),
        receivedDate: new Date().toISOString(),
        subtotal: 1500.00,
        tax: 120.00,
        total: 1620.00,
        paymentMethod: 'cash',
        paymentStatus: 'unpaid',
        paidAmount: 0,
        remainingAmount: 1620.00
      })

      // Process full payment
      const fullPayment = offlinePurchaseOrderStorage.update(order.id, {
        paymentStatus: 'paid',
        paidAmount: 1620.00,
        remainingAmount: 0,
        paymentDate: new Date().toISOString(),
      })

      expect(fullPayment?.paymentStatus).toBe('paid')
      expect(fullPayment?.paidAmount).toBe(1620.00)
      expect(fullPayment?.remainingAmount).toBe(0)
      expect(fullPayment?.paymentDate).toBeDefined()
    })

    it('should handle partial payments', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'Partial Payment Supplier',
        contactPerson: 'Partial Manager',
        email: 'partial@supplier.com',
        creditBalance: 0
      })

      const order = offlinePurchaseOrderStorage.create({
        supplierId: supplier.id,
        warehouseId: 'warehouse-partial',
        status: 'received',
        orderDate: new Date().toISOString(),
        subtotal: 2000.00,
        tax: 160.00,
        total: 2160.00,
        paymentMethod: 'credit',
        paymentStatus: 'unpaid',
        paidAmount: 0,
        remainingAmount: 2160.00
      })

      // First partial payment
      const firstPayment = offlinePurchaseOrderStorage.update(order.id, {
        paymentStatus: 'partial',
        paidAmount: 1000.00,
        remainingAmount: 1160.00
      })

      expect(firstPayment?.paymentStatus).toBe('partial')
      expect(firstPayment?.paidAmount).toBe(1000.00)
      expect(firstPayment?.remainingAmount).toBe(1160.00)

      // Second payment to complete
      const finalPayment = offlinePurchaseOrderStorage.update(order.id, {
        paymentStatus: 'paid',
        paidAmount: 2160.00,
        remainingAmount: 0,
        paymentDate: new Date().toISOString(),
      })

      expect(finalPayment?.paymentStatus).toBe('paid')
      expect(finalPayment?.remainingAmount).toBe(0)
    })

    it('should track payment methods', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'Method Supplier',
        contactPerson: 'Method Manager',
        email: 'methods@supplier.com',
        creditBalance: 0
      })

      const paymentMethods: Array<'cash' | 'credit' | 'bank_check'> = ['cash', 'credit', 'bank_check']
      
      const orders = paymentMethods.map((method, index) => {
        return offlinePurchaseOrderStorage.create({
          supplierId: supplier.id,
          warehouseId: `warehouse-${method}`,
          status: 'received',
          orderDate: new Date().toISOString(),
          subtotal: 1000.00,
          tax: 80.00,
          total: 1080.00,
          paymentMethod: method,
          paymentStatus: 'paid',
          paidAmount: 1080.00,
          remainingAmount: 0,
          paymentDate: new Date().toISOString(),
        })
      })

      expect(orders[0].paymentMethod).toBe('cash')
      expect(orders[1].paymentMethod).toBe('credit')
      expect(orders[2].paymentMethod).toBe('bank_check')

      const allOrders = offlinePurchaseOrderStorage.getAll()
      const paidOrders = allOrders.filter(o => o.paymentStatus === 'paid')
      expect(paidOrders).toHaveLength(3)
    })
  })

  describe('Stock Updates from Purchase Orders', () => {
    it('should update stock when order is received', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'Stock Update Supplier',
        contactPerson: 'Stock Manager',
        email: 'stock@supplier.com',
        creditBalance: 0
      })

      const product = offlineProductStorage.create({
        name: 'Stock Update Product',
        sku: 'SUP-001',
        price: 100.00,
        cost: 50.00,
        quantity: 20,
        minStock: 10
      })

      const warehouseId = 'warehouse-stock-update'

      // Set initial stock
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: 20,
        reason: 'Initial stock'
      })

      const order = offlinePurchaseOrderStorage.create({
        supplierId: supplier.id,
        warehouseId: warehouseId,
        status: 'ordered',
        orderDate: new Date().toISOString(),
        subtotal: 1500.00,
        tax: 120.00,
        total: 1620.00,
        paymentMethod: 'credit',
        paymentStatus: 'unpaid',
        paidAmount: 0,
        remainingAmount: 1620.00
      })

      // Add order item
      offlinePurchaseOrderItemStorage.create({
        orderId: order.id,
        productId: product.id,
        quantity: 30,
        unitCost: 50,
        totalCost: 1500,
        receivedQuantity: 0.00
      })

      // Simulate receiving the order
      const receivedOrder = offlinePurchaseOrderStorage.update(order.id, {
        status: 'received',
        receivedDate: new Date().toISOString()
      })

      // Update stock based on received items
      const orderItems = offlinePurchaseOrderItemStorage.getByOrder(order.id)
      orderItems.forEach(item => {
        const currentStock = offlineProductStockStorage.getByProductAndLocation(item.productId, warehouseId)
        const newQuantity = (currentStock?.quantity || 0) + item.quantity

        offlineProductStockStorage.upsert({
          productId: item.productId,
          locationId: warehouseId,
          quantity: newQuantity,
          reason: `Purchase order received - ${order.orderNumber}`
        })

        // Record stock transaction
        offlineStockTransactionStorage.create({
          productId: item.productId,
          warehouseId: warehouseId,
          type: 'entry',
          quantity: item.quantity,
          previousQuantity: currentStock?.quantity || 0,
          newQuantity: newQuantity,
          reason: `Purchase order received - ${order.orderNumber}`,
          reference: order.id
        })
      })

      const updatedStock = offlineProductStockStorage.getByProductAndLocation(product.id, warehouseId)
      expect(updatedStock?.quantity).toBe(50) // 20 + 30

      const stockTransactions = offlineStockTransactionStorage.getByProduct(product.id)
      const purchaseTransaction = stockTransactions.find(t => t.reference === order.id)
      expect(purchaseTransaction?.type).toBe('entry')
      expect(purchaseTransaction?.quantity).toBe(30)
    })

    it('should handle multiple products in single order', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'Multi Product Supplier',
        contactPerson: 'Multi Manager',
        email: 'multi@supplier.com',
        creditBalance: 0
      })

      const products = [
        offlineProductStorage.create({
          name: 'Multi Product A',
          sku: 'MPA-001',
          price: 60.00,
          cost: 30.00,
          quantity: 15,
          minStock: 5
        }),
        offlineProductStorage.create({
          name: 'Multi Product B',
          sku: 'MPB-001',
          price: 80.00,
          cost: 40.00,
          quantity: 25,
          minStock: 8
        }),
        offlineProductStorage.create({
          name: 'Multi Product C',
          sku: 'MPC-001',
          price: 120.00,
          cost: 60.00,
          quantity: 10,
          minStock: 3
        })
      ]

      const warehouseId = 'warehouse-multi-product'

      // Set initial stock for all products
      products.forEach(product => {
        offlineProductStockStorage.upsert({
          productId: product.id,
          locationId: warehouseId,
          quantity: product.quantity,
          reason: 'Initial stock'
        })
      })

      const order = offlinePurchaseOrderStorage.create({
        supplierId: supplier.id,
        warehouseId: warehouseId,
        status: 'ordered',
        orderDate: new Date().toISOString(),
        subtotal: 3400.00,
        tax: 272.00,
        total: 3672.00,
        paymentMethod: 'bank_check',
        paymentStatus: 'unpaid',
        paidAmount: 0,
        remainingAmount: 3672.00
      })

      // Add multiple order items
      const orderItems = [
        { productId: products[0].id, quantity: 20, unitCost: 30.00, totalCost: 600.00 },
        { productId: products[1].id, quantity: 35, unitCost: 40.00, totalCost: 1400.00 },
        { productId: products[2].id, quantity: 25, unitCost: 60.00, totalCost: 1500.00 }
      ]

      orderItems.forEach(item => {
        offlinePurchaseOrderItemStorage.create({
          orderId: order.id,
          ...item
        })
      })

      // Receive the order
      offlinePurchaseOrderStorage.update(order.id, {
        status: 'received',
        receivedDate: new Date().toISOString()
      })

      // Update stock for all items
      const createdOrderItems = offlinePurchaseOrderItemStorage.getByOrder(order.id)
      createdOrderItems.forEach(item => {
        const currentStock = offlineProductStockStorage.getByProductAndLocation(item.productId, warehouseId)
        const newQuantity = (currentStock?.quantity || 0) + item.quantity

        offlineProductStockStorage.upsert({
          productId: item.productId,
          locationId: warehouseId,
          quantity: newQuantity,
          reason: `Multi-product order received - ${order.orderNumber}`
        })
      })

      // Verify all stock updates
      const finalStocks = products.map(product => 
        offlineProductStockStorage.getByProductAndLocation(product.id, warehouseId)
      )

      expect(finalStocks[0]?.quantity).toBe(35) // 15 + 20
      expect(finalStocks[1]?.quantity).toBe(60) // 25 + 35
      expect(finalStocks[2]?.quantity).toBe(35) // 10 + 25

      const allOrderItems = offlinePurchaseOrderItemStorage.getByOrder(order.id)
      expect(allOrderItems).toHaveLength(3)

      const totalOrderValue = allOrderItems.reduce((sum, item) => sum + item.totalCost, 0)
      expect(totalOrderValue).toBe(3500.00) // 600 + 1400 + 1500
    })
  })

  describe('Purchase Order Reporting and Analytics', () => {
    it('should calculate purchase order summary metrics', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'Analytics Supplier',
        contactPerson: 'Analytics Manager',
        email: 'analytics@supplier.com',
        creditBalance: 0
      })

      const orders = [
        {
          status: 'received' as const,
          total: 1500.00,
          paymentStatus: 'paid' as const,
          orderDate: new Date('2024-01-15')
        },
        {
          status: 'received' as const,
          total: 2200.00,
          paymentStatus: 'partial' as const,
          orderDate: new Date('2024-02-10')
        },
        {
          status: 'ordered' as const,
          total: 1800.00,
          paymentStatus: 'unpaid' as const,
          orderDate: new Date('2024-03-05')
        },
        {
          status: 'draft' as const,
          total: 950.00,
          paymentStatus: 'unpaid' as const,
          orderDate: new Date('2024-03-20')
        }
      ]

      const createdOrders = orders.map(orderData => 
        offlinePurchaseOrderStorage.create({
          supplierId: supplier.id,
          warehouseId: 'warehouse-analytics',
          subtotal: orderData.total * 0.85,
          tax: orderData.total * 0.15,
          paymentMethod: 'credit',
          paidAmount: orderData.paymentStatus === 'paid' ? orderData.total : 0,
          remainingAmount: orderData.paymentStatus === 'paid' ? 0 : orderData.total,
          status: orderData.status,
          total: orderData.total,
          paymentStatus: orderData.paymentStatus,
          orderDate: orderData.orderDate.toISOString()
        })
      )

      const allOrders = offlinePurchaseOrderStorage.getAll()
      
      const summary = {
        totalOrders: allOrders.length,
        totalValue: allOrders.reduce((sum, order) => sum + order.total, 0),
        averageOrderValue: allOrders.reduce((sum, order) => sum + order.total, 0) / allOrders.length,
        ordersByStatus: {
          draft: allOrders.filter(o => o.status === 'draft').length,
          ordered: allOrders.filter(o => o.status === 'ordered').length,
          received: allOrders.filter(o => o.status === 'received').length
        },
        paymentSummary: {
          paid: allOrders.filter(o => o.paymentStatus === 'paid').length,
          partial: allOrders.filter(o => o.paymentStatus === 'partial').length,
          unpaid: allOrders.filter(o => o.paymentStatus === 'unpaid').length
        },
        totalOutstanding: allOrders.reduce((sum, order) => sum + order.remainingAmount, 0)
      }

      expect(summary.totalOrders).toBe(4)
      expect(summary.totalValue).toBe(6450.00) // 1500 + 2200 + 1800 + 950
      expect(summary.averageOrderValue).toBe(1612.50)
      expect(summary.ordersByStatus.received).toBe(2)
      expect(summary.ordersByStatus.ordered).toBe(1)
      expect(summary.ordersByStatus.draft).toBe(1)
      expect(summary.paymentSummary.paid).toBe(1)
      expect(summary.paymentSummary.partial).toBe(1)
      expect(summary.paymentSummary.unpaid).toBe(2)
      expect(summary.totalOutstanding).toBe(4950.00) // 0 + 2200 + 1800 + 950
    })

    it('should track supplier purchase patterns', () => {
      const suppliers = [
        offlineSupplierStorage.create({
          name: 'Pattern Supplier A',
          contactPerson: 'Pattern A',
          email: 'a@pattern.com',
          creditBalance: 0
        }),
        offlineSupplierStorage.create({
          name: 'Pattern Supplier B',
          contactPerson: 'Pattern B',
          email: 'b@pattern.com',
          creditBalance: 0
        })
      ]

      // Create orders for different suppliers
      const supplierOrders = [
        { supplierId: suppliers[0].id, total: 2000.00, count: 3 },
        { supplierId: suppliers[1].id, total: 1500.00, count: 2 }
      ]

      supplierOrders.forEach(({ supplierId, total, count }) => {
        for (let i = 0; i < count; i++) {
          offlinePurchaseOrderStorage.create({
            supplierId: supplierId,
            warehouseId: 'warehouse-patterns',
            status: 'received',
            orderDate: new Date().toISOString(),
            subtotal: total * 0.85,
            tax: total * 0.15,
            total: total,
            paymentMethod: 'credit',
            paymentStatus: 'paid',
            paidAmount: total,
            remainingAmount: 0
          })
        }
      })

      const allOrders = offlinePurchaseOrderStorage.getAll()
      
      // Group orders by supplier
      const supplierAnalysis = suppliers.map(supplier => {
        const supplierOrders = allOrders.filter(o => o.supplierId === supplier.id)
        const totalSpent = supplierOrders.reduce((sum, order) => sum + order.total, 0)
        const averageOrderSize = totalSpent / supplierOrders.length
        
        return {
          supplierId: supplier.id,
          supplierName: supplier.name,
          orderCount: supplierOrders.length,
          totalSpent: totalSpent,
          averageOrderSize: averageOrderSize
        }
      })

      expect(supplierAnalysis[0].orderCount).toBe(3)
      expect(supplierAnalysis[0].totalSpent).toBe(6000.00) // 3 * 2000
      expect(supplierAnalysis[0].averageOrderSize).toBe(2000.00)

      expect(supplierAnalysis[1].orderCount).toBe(2)
      expect(supplierAnalysis[1].totalSpent).toBe(3000.00) // 2 * 1500
      expect(supplierAnalysis[1].averageOrderSize).toBe(1500.00)
    })
  })

  describe('Purchase Order Validation and Business Rules', () => {
    it('should validate order totals and calculations', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'Validation Supplier',
        contactPerson: 'Valid Manager',
        email: 'valid@supplier.com',
        creditBalance: 0
      })

      const product = offlineProductStorage.create({
        name: 'Validation Product',
        sku: 'VAL-001',
        price: 100.00,
        cost: 50.00,
        quantity: 0,
        minStock: 10
      })

      // Create order with calculated totals
      const orderData = {
        supplierId: supplier.id,
        warehouseId: 'warehouse-validation',
        status: 'draft' as const,
        orderDate: new Date().toISOString(),
        subtotal: 0,
        tax: 0,
        total: 0,
        paymentMethod: 'credit' as const,
        paymentStatus: 'unpaid' as const,
        paidAmount: 0,
        remainingAmount: 0
      }

      const order = offlinePurchaseOrderStorage.create(orderData)

      // Add order items
      const orderItems = [
        { productId: product.id, quantity: 10, unitCost: 50.00, totalCost: 500.00 },
        { productId: product.id, quantity: 5, unitCost: 50.00, totalCost: 250.00 }
      ]

      orderItems.forEach(item => {
        offlinePurchaseOrderItemStorage.create({
          orderId: order.id,
          ...item
        })
      })

      // Calculate totals
      const items = offlinePurchaseOrderItemStorage.getByOrder(order.id)
      const subtotal = items.reduce((sum, item) => sum + item.totalCost, 0)
      const taxRate = 0.08 // 8% tax
      const tax = subtotal * taxRate
      const total = subtotal + tax

      // Update order with calculated totals
      const updatedOrder = offlinePurchaseOrderStorage.update(order.id, {
        subtotal: subtotal,
        tax: tax,
        total: total,
        remainingAmount: total
      })

      expect(updatedOrder?.subtotal).toBe(750.00) // 500 + 250
      expect(updatedOrder?.tax).toBe(60.00) // 750 * 0.08
      expect(updatedOrder?.total).toBe(810.00) // 750 + 60
      expect(updatedOrder?.remainingAmount).toBe(810.00)

      // Validate calculations
      const calculationValid = (updatedOrder?.subtotal || 0) + (updatedOrder?.tax || 0) === (updatedOrder?.total || 0)
      expect(calculationValid).toBe(true)
    })

    it('should enforce business rules for order approval', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'Rules Supplier',
        contactPerson: 'Rules Manager',
        email: 'rules@supplier.com',
        creditBalance: 0,
        creditLimit: 5000.00
      })

      const orderAmount = 3000.00

      // Check supplier credit limit
      const availableCredit = (supplier.creditLimit || 0) - (supplier.creditBalance || 0)
      const canCreateOrder = orderAmount <= availableCredit

      expect(canCreateOrder).toBe(true) // 3000 <= 5000

      if (canCreateOrder) {
        const order = offlinePurchaseOrderStorage.create({
          supplierId: supplier.id,
          warehouseId: 'warehouse-rules',
          status: 'draft',
          orderDate: new Date().toISOString(),
          subtotal: orderAmount,
          tax: orderAmount * 0.08,
          total: orderAmount * 1.08,
          paymentMethod: 'credit',
          paymentStatus: 'unpaid',
          paidAmount: 0,
          remainingAmount: orderAmount * 1.08
        })

        expect(order.status).toBe('draft')
        expect(order.total).toBe(3240.00) // 3000 * 1.08
      }

      // Test order that exceeds credit limit
      const largeOrderAmount = 6000.00
      const canCreateLargeOrder = largeOrderAmount <= availableCredit
      expect(canCreateLargeOrder).toBe(false) // 6000 > 5000
    })
  })
})
