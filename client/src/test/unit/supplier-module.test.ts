import { describe, it, expect, beforeEach } from 'vitest'
import { 
  offlineSupplierStorage,
  offlineSupplierPaymentStorage,
  supplierCreditHelpers
} from '../../lib/offline-storage'

describe('Supplier Module Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Supplier CRUD Operations', () => {
    it('should create supplier with complete information', () => {
      const supplierData = {
        name: 'Tech Supplies Inc.',
        contactPerson: 'Sarah Johnson',
        email: 'sarah@techsupplies.com',
        phone: '+1-555-987-6543',
        address: '789 Industrial Blvd, Tech City, TC 54321',
        paymentTerms: 'Net 30',
        creditBalance: 0,
        creditLimit: 10000.00,
        notes: 'Primary electronics supplier - excellent quality'
      }

      const supplier = offlineSupplierStorage.create(supplierData)

      expect(supplier.id).toBeDefined()
      expect(supplier.name).toBe('Tech Supplies Inc.')
      expect(supplier.contactPerson).toBe('Sarah Johnson')
      expect(supplier.email).toBe('sarah@techsupplies.com')
      expect(supplier.paymentTerms).toBe('Net 30')
      expect(supplier.creditBalance).toBe(0)
      expect(supplier.creditLimit).toBe(10000.00)
    })

    it('should update supplier information', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'Update Test Supplier',
        contactPerson: 'John Doe',
        email: 'john@supplier.com',
        phone: '555-0123',
        creditBalance: 0
      })

      const updates = {
        contactPerson: 'Jane Smith',
        email: 'jane@supplier.com',
        phone: '555-9876',
        paymentTerms: 'Net 15',
        creditLimit: 5000.00
      }

      const updated = offlineSupplierStorage.update(supplier.id, updates)

      expect(updated?.contactPerson).toBe('Jane Smith')
      expect(updated?.email).toBe('jane@supplier.com')
      expect(updated?.paymentTerms).toBe('Net 15')
      expect(updated?.creditLimit).toBe(5000.00)
    })

    it('should search suppliers by name and contact info', () => {
      offlineSupplierStorage.create({
        name: 'Alpha Supplies',
        contactPerson: 'Alice Alpha',
        email: 'alice@alpha.com',
        creditBalance: 0
      })

      offlineSupplierStorage.create({
        name: 'Beta Materials',
        contactPerson: 'Bob Beta',
        email: 'bob@beta.com',
        creditBalance: 0
      })

      const nameResults = offlineSupplierStorage.search('Alpha')
      expect(nameResults).toHaveLength(1)
      expect(nameResults[0].name).toBe('Alpha Supplies')

      const contactResults = offlineSupplierStorage.search('Bob')
      expect(contactResults).toHaveLength(1)
      expect(contactResults[0].contactPerson).toBe('Bob Beta')
    })
  })

  describe('Supplier Credit Management', () => {
    it('should track supplier credit balance from purchases', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'Credit Supplier',
        contactPerson: 'Credit Manager',
        email: 'credit@supplier.com',
        creditBalance: 0,
        creditLimit: 15000.00,
        paymentTerms: 'Net 30'
      })

      const purchaseAmount = 2500.00
      const orderId = 'PO-001'

      supplierCreditHelpers.addCreditPurchase(
        supplier.id,
        purchaseAmount,
        orderId,
        'Office equipment purchase on credit'
      )

      const updatedSupplier = offlineSupplierStorage.getById(supplier.id)
      expect(updatedSupplier?.creditBalance).toBe(2500.00)

      const transactions = offlineSupplierPaymentStorage.getBySupplier(supplier.id)
      expect(transactions).toHaveLength(1)
      expect(transactions[0].type).toBe('credit_purchase')
      expect(transactions[0].amount).toBe(2500.00)
      expect(transactions[0].orderId).toBe(orderId)
    })

    it('should process supplier payments and reduce balance', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'Payment Supplier',
        contactPerson: 'Payment Contact',
        email: 'payments@supplier.com',
        creditBalance: 3000.00,
        creditLimit: 10000.00
      })

      const paymentAmount = 1200.00

      supplierCreditHelpers.addSupplierPayment(
        supplier.id,
        paymentAmount,
        'bank_check',
        'Partial payment - Check #1234'
      )

      const updatedSupplier = offlineSupplierStorage.getById(supplier.id)
      expect(updatedSupplier?.creditBalance).toBe(1800.00) // 3000 - 1200

      const transactions = offlineSupplierPaymentStorage.getBySupplier(supplier.id)
      expect(transactions).toHaveLength(1)
      expect(transactions[0].type).toBe('payment')
      expect(transactions[0].amount).toBe(-1200.00) // Negative for payment
      expect(transactions[0].paymentMethod).toBe('bank_check')
    })

    it('should handle multiple purchase orders and payments', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'Multi Transaction Supplier',
        contactPerson: 'Multi Manager',
        email: 'multi@supplier.com',
        creditBalance: 0,
        creditLimit: 20000.00
      })

      // Multiple purchases
      const purchases = [
        { amount: 1500.00, orderId: 'PO-001', description: 'First purchase' },
        { amount: 2200.00, orderId: 'PO-002', description: 'Second purchase' },
        { amount: 1800.00, orderId: 'PO-003', description: 'Third purchase' }
      ]

      purchases.forEach(purchase => {
        supplierCreditHelpers.addCreditPurchase(
          supplier.id,
          purchase.amount,
          purchase.orderId,
          purchase.description
        )
      })

      // Partial payments
      const payments = [
        { amount: 1500.00, method: 'bank_check', description: 'Payment for PO-001' },
        { amount: 1000.00, method: 'cash', description: 'Partial payment' }
      ]

      payments.forEach(payment => {
        supplierCreditHelpers.addSupplierPayment(
          supplier.id,
          payment.amount,
          payment.method as 'cash' | 'credit' | 'bank_check',
          payment.description
        )
      })

      const finalSupplier = offlineSupplierStorage.getById(supplier.id)
      expect(finalSupplier?.creditBalance).toBe(3000.00) // 5500 - 2500

      const transactions = offlineSupplierPaymentStorage.getBySupplier(supplier.id)
      expect(transactions).toHaveLength(5) // 3 purchases + 2 payments

      const totalPurchases = transactions
        .filter(t => t.type === 'credit_purchase')
        .reduce((sum, t) => sum + t.amount, 0)
      expect(totalPurchases).toBe(5500.00)

      const totalPayments = transactions
        .filter(t => t.type === 'payment')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      expect(totalPayments).toBe(2500.00)
    })

    it('should validate credit limits before purchases', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'Limit Test Supplier',
        contactPerson: 'Limit Manager',
        email: 'limit@supplier.com',
        creditBalance: 8500.00,
        creditLimit: 10000.00
      })

      const availableCredit = (supplier.creditLimit || 0) - (supplier.creditBalance || 0)
      expect(availableCredit).toBe(1500.00)

      // Test purchase within limit
      const smallPurchase = 1000.00
      const canMakeSmallPurchase = smallPurchase <= availableCredit
      expect(canMakeSmallPurchase).toBe(true)

      // Test purchase exceeding limit
      const largePurchase = 2000.00
      const canMakeLargePurchase = largePurchase <= availableCredit
      expect(canMakeLargePurchase).toBe(false)
    })
  })

  describe('Supplier Performance Tracking', () => {
    it('should track supplier delivery performance', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'Performance Supplier',
        contactPerson: 'Performance Manager',
        email: 'performance@supplier.com',
        creditBalance: 0
      })

      const orders = [
        {
          orderId: 'PO-001',
          orderDate: new Date('2024-01-10'),
          expectedDelivery: new Date('2024-01-17'),
          actualDelivery: new Date('2024-01-16'),
          amount: 1500.00
        },
        {
          orderId: 'PO-002',
          orderDate: new Date('2024-01-20'),
          expectedDelivery: new Date('2024-01-27'),
          actualDelivery: new Date('2024-01-29'),
          amount: 2200.00
        }
      ]

      const deliveryPerformance = orders.map(order => {
        const expectedDays = Math.floor(
          (order.expectedDelivery.getTime() - order.orderDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        const actualDays = Math.floor(
          (order.actualDelivery.getTime() - order.orderDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        const deliveryVariance = actualDays - expectedDays

        return {
          orderId: order.orderId,
          expectedDays,
          actualDays,
          deliveryVariance,
          onTime: deliveryVariance <= 0
        }
      })

      expect(deliveryPerformance[0].deliveryVariance).toBe(-1) // 1 day early
      expect(deliveryPerformance[1].deliveryVariance).toBe(2)  // 2 days late

      const onTimeDeliveries = deliveryPerformance.filter(d => d.onTime).length
      const onTimeRate = (onTimeDeliveries / orders.length) * 100
      
      expect(onTimeRate).toBe(50.0) // 1 out of 2 on time
    })

    it('should calculate supplier quality metrics', () => {
      const qualityData = {
        totalOrders: 20,
        ordersWithIssues: 2,
        totalItemsReceived: 500,
        defectiveItems: 8,
        returnsProcessed: 3,
        customerSatisfactionScore: 4.2
      }

      const qualityMetrics = {
        orderAccuracyRate: ((qualityData.totalOrders - qualityData.ordersWithIssues) / qualityData.totalOrders) * 100,
        defectRate: (qualityData.defectiveItems / qualityData.totalItemsReceived) * 100,
        returnRate: (qualityData.returnsProcessed / qualityData.totalOrders) * 100,
        overallRating: qualityData.customerSatisfactionScore
      }

      expect(qualityMetrics.orderAccuracyRate).toBe(90.0) // 18/20 * 100
      expect(qualityMetrics.defectRate).toBe(1.6) // 8/500 * 100
      expect(qualityMetrics.returnRate).toBe(15.0) // 3/20 * 100
      expect(qualityMetrics.overallRating).toBe(4.2)
    })
  })

  describe('Supplier Payment Management', () => {
    it('should handle different payment methods', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'Payment Methods Supplier',
        contactPerson: 'Payment Processor',
        email: 'payments@methods.com',
        creditBalance: 5000.00,
        creditLimit: 15000.00
      })

      const payments = [
        { amount: 1500.00, method: 'cash' as const, description: 'Cash payment' },
        { amount: 2000.00, method: 'bank_check' as const, description: 'Check payment #9999' },
        { amount: 800.00, method: 'credit' as const, description: 'Credit card payment' }
      ]

      payments.forEach(payment => {
        supplierCreditHelpers.addSupplierPayment(
          supplier.id,
          payment.amount,
          payment.method,
          payment.description
        )
      })

      const transactions = offlineSupplierPaymentStorage.getBySupplier(supplier.id)
      const paymentTransactions = transactions.filter(t => t.type === 'payment')

      expect(paymentTransactions).toHaveLength(3)
      expect(paymentTransactions.some(t => t.paymentMethod === 'cash')).toBe(true)
      expect(paymentTransactions.some(t => t.paymentMethod === 'bank_check')).toBe(true)
      expect(paymentTransactions.some(t => t.paymentMethod === 'credit')).toBe(true)

      const finalSupplier = offlineSupplierStorage.getById(supplier.id)
      expect(finalSupplier?.creditBalance).toBe(700.00) // 5000 - 4300
    })

    it('should calculate early payment discounts', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'Discount Supplier',
        paymentTerms: '2/10 Net 30',
        creditBalance: 3000.00
      })

      const purchaseAmount = 3000.00
      const orderDate = new Date('2024-01-15')
      const paymentDate = new Date('2024-01-22') // 7 days later

      // Parse payment terms
      const termsMatch = supplier.paymentTerms?.match(/(\d+)\/(\d+)\s+Net\s+(\d+)/)
      const discountPercent = termsMatch ? parseInt(termsMatch[1]) : 0
      const discountDays = termsMatch ? parseInt(termsMatch[2]) : 0

      expect(discountPercent).toBe(2)
      expect(discountDays).toBe(10)

      // Check if payment qualifies for discount
      const daysBetween = Math.floor((paymentDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
      const qualifiesForDiscount = daysBetween <= discountDays

      expect(daysBetween).toBe(7)
      expect(qualifiesForDiscount).toBe(true)

      if (qualifiesForDiscount) {
        const discountAmount = purchaseAmount * (discountPercent / 100)
        const discountedAmount = purchaseAmount - discountAmount

        expect(discountAmount).toBe(60.00)
        expect(discountedAmount).toBe(2940.00)
      }
    })
  })

  describe('Supplier Relationship Management', () => {
    it('should track supplier order history and patterns', () => {
      const supplier = offlineSupplierStorage.create({
        name: 'History Supplier',
        contactPerson: 'History Manager',
        email: 'history@supplier.com',
        creditBalance: 0
      })

      const orderHistory = [
        { amount: 1200.00, items: 15 },
        { amount: 1800.00, items: 22 },
        { amount: 950.00, items: 12 },
        { amount: 2200.00, items: 28 },
        { amount: 1600.00, items: 20 }
      ]

      orderHistory.forEach((order, index) => {
        supplierCreditHelpers.addCreditPurchase(
          supplier.id,
          order.amount,
          `PO-${String(index + 1).padStart(3, '0')}`,
          `Order ${index + 1} - ${order.items} items`
        )
      })

      const totalOrderValue = orderHistory.reduce((sum, order) => sum + order.amount, 0)
      const averageOrderValue = totalOrderValue / orderHistory.length
      const totalItems = orderHistory.reduce((sum, order) => sum + order.items, 0)
      const averageItemsPerOrder = totalItems / orderHistory.length

      expect(totalOrderValue).toBe(7750.00)
      expect(averageOrderValue).toBe(1550.00)
      expect(totalItems).toBe(97)
      expect(averageItemsPerOrder).toBeCloseTo(19.4, 1)
    })

    it('should rank suppliers by performance criteria', () => {
      const suppliers = [
        {
          supplier: offlineSupplierStorage.create({
            name: 'Supplier A',
            contactPerson: 'Manager A',
            email: 'a@supplier.com',
            creditBalance: 2000.00
          }),
          metrics: {
            totalOrderValue: 15000.00,
            onTimeDeliveryRate: 95.0,
            qualityScore: 4.8
          }
        },
        {
          supplier: offlineSupplierStorage.create({
            name: 'Supplier B',
            contactPerson: 'Manager B',
            email: 'b@supplier.com',
            creditBalance: 1500.00
          }),
          metrics: {
            totalOrderValue: 8000.00,
            onTimeDeliveryRate: 88.0,
            qualityScore: 4.2
          }
        }
      ]

      const supplierRankings = suppliers.map(({ supplier, metrics }) => {
        const weights = {
          orderValue: 0.4,
          delivery: 0.3,
          quality: 0.3
        }

        const maxOrderValue = Math.max(...suppliers.map(s => s.metrics.totalOrderValue))
        
        const normalizedScores = {
          orderValue: metrics.totalOrderValue / maxOrderValue,
          delivery: metrics.onTimeDeliveryRate / 100,
          quality: metrics.qualityScore / 5
        }

        const compositeScore = Object.entries(weights).reduce((score, [metric, weight]) => {
          return score + (normalizedScores[metric as keyof typeof normalizedScores] * weight)
        }, 0) * 100

        return {
          supplierId: supplier.id,
          name: supplier.name,
          compositeScore
        }
      }).sort((a, b) => b.compositeScore - a.compositeScore)

      expect(supplierRankings[0].name).toBe('Supplier A') // Higher score
      expect(supplierRankings[0].compositeScore).toBeGreaterThan(supplierRankings[1].compositeScore)
    })
  })
})
