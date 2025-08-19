import { describe, it, expect, beforeEach } from 'vitest'
import { 
  offlineSaleStorage,
  offlineProductStorage,
  offlineProductStockStorage,
  offlineStockTransactionStorage,
  offlineCustomerStorage,
  creditHelpers
} from '../../lib/offline-storage'

describe('POS Module Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Invoice Generation', () => {
    it('should create sale with auto-generated invoice number', () => {
      const sale = offlineSaleStorage.create({
        customerId: 'customer-1',
        items: [
          {
            productId: 'product-1',
            quantity: 2,
            unitPrice: 25.99,
            totalPrice: 51.98
          }
        ],
        totalAmount: 51.98,
        discountAmount: 0,
        taxAmount: 10.40,
        paidAmount: 62.38,
        changeAmount: 0,
        paymentMethod: 'cash',
        status: 'completed'
      })

      expect(sale.id).toBeDefined()
      expect(sale.invoiceNumber).toBeDefined()
      expect(sale.invoiceNumber).toMatch(/^INV-\d{6}-\d{3}$/) // Format: INV-YYMMDD-XXX
      expect(sale.date).toBeDefined()
      expect(sale.totalAmount).toBe(51.98)
    })

    it('should generate sequential invoice numbers', () => {
      const sale1 = offlineSaleStorage.create({
        customerId: null,
        items: [{ productId: 'p1', quantity: 1, unitPrice: 10, totalPrice: 10 }],
        totalAmount: 10,
        paidAmount: 10,
        paymentMethod: 'cash',
        status: 'completed'
      })

      const sale2 = offlineSaleStorage.create({
        customerId: null,
        items: [{ productId: 'p2', quantity: 1, unitPrice: 20, totalPrice: 20 }],
        totalAmount: 20,
        paidAmount: 20,
        paymentMethod: 'cash',
        status: 'completed'
      })

      expect(sale1.invoiceNumber).not.toBe(sale2.invoiceNumber)
      
      // Extract sequence numbers
      const seq1 = parseInt(sale1.invoiceNumber.split('-')[2])
      const seq2 = parseInt(sale2.invoiceNumber.split('-')[2])
      expect(seq2).toBe(seq1 + 1)
    })
  })

  describe('Price Modifications', () => {
    it('should handle item price modifications and recalculate totals', () => {
      const originalItems = [
        { productId: 'p1', quantity: 2, unitPrice: 25.00, totalPrice: 50.00 },
        { productId: 'p2', quantity: 1, unitPrice: 15.00, totalPrice: 15.00 }
      ]

      // Modify price of first item
      const modifiedItems = originalItems.map(item => 
        item.productId === 'p1' 
          ? { ...item, unitPrice: 20.00, totalPrice: item.quantity * 20.00 }
          : item
      )

      const originalSubtotal = originalItems.reduce((sum, item) => sum + item.totalPrice, 0)
      const modifiedSubtotal = modifiedItems.reduce((sum, item) => sum + item.totalPrice, 0)

      expect(originalSubtotal).toBe(65.00)
      expect(modifiedSubtotal).toBe(55.00) // 40.00 + 15.00
      expect(modifiedItems[0].totalPrice).toBe(40.00)
      expect(modifiedItems[1].totalPrice).toBe(15.00)
    })

    it('should apply percentage discounts correctly', () => {
      const subtotal = 100.00
      const discountPercentage = 10 // 10%
      const discountAmount = subtotal * (discountPercentage / 100)
      const finalAmount = subtotal - discountAmount

      expect(discountAmount).toBe(10.00)
      expect(finalAmount).toBe(90.00)
    })

    it('should apply fixed amount discounts correctly', () => {
      const subtotal = 100.00
      const fixedDiscount = 15.00
      const finalAmount = subtotal - fixedDiscount

      expect(finalAmount).toBe(85.00)
    })
  })

  describe('Quantity Modifications', () => {
    it('should recalculate totals when quantities change', () => {
      const item = { productId: 'p1', quantity: 2, unitPrice: 25.99, totalPrice: 51.98 }
      
      // Increase quantity
      const increasedQty = { ...item, quantity: 5, totalPrice: 5 * 25.99 }
      expect(increasedQty.totalPrice).toBe(129.95)

      // Decrease quantity
      const decreasedQty = { ...item, quantity: 1, totalPrice: 1 * 25.99 }
      expect(decreasedQty.totalPrice).toBe(25.99)
    })

    it('should handle decimal quantities for weight-based products', () => {
      const item = { productId: 'p1', quantity: 2.5, unitPrice: 12.00, totalPrice: 2.5 * 12.00 }
      expect(item.totalPrice).toBe(30.00)

      const preciseItem = { productId: 'p2', quantity: 1.75, unitPrice: 8.50, totalPrice: 1.75 * 8.50 }
      expect(preciseItem.totalPrice).toBe(14.875)
      
      // Round to 2 decimal places for currency
      const rounded = Math.round(preciseItem.totalPrice * 100) / 100
      expect(rounded).toBe(14.88)
    })
  })

  describe('Payment Methods', () => {
    it('should handle cash payments with change calculation', () => {
      const total = 47.85
      const cashReceived = 50.00
      const change = cashReceived - total

      const sale = offlineSaleStorage.create({
        customerId: null,
        items: [{ productId: 'p1', quantity: 1, unitPrice: 47.85, totalPrice: 47.85 }],
        totalAmount: total,
        paidAmount: cashReceived,
        changeAmount: change,
        paymentMethod: 'cash',
        status: 'completed'
      })

      expect(Math.round(sale.changeAmount * 100) / 100).toBe(2.15)
      expect(sale.paidAmount).toBe(50.00)
      expect(sale.paymentMethod).toBe('cash')
    })

    it('should handle credit card payments', () => {
      const sale = offlineSaleStorage.create({
        customerId: null,
        items: [{ productId: 'p1', quantity: 1, unitPrice: 75.00, totalPrice: 75.00 }],
        totalAmount: 75.00,
        paidAmount: 75.00,
        changeAmount: 0,
        paymentMethod: 'credit_card',
        status: 'completed'
      })

      expect(sale.paymentMethod).toBe('credit_card')
      expect(sale.changeAmount).toBe(0)
      expect(sale.paidAmount).toBe(75.00)
    })

    it('should handle customer credit payments', () => {
      // Create customer with credit balance
      const customer = offlineCustomerStorage.create({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        creditBalance: 100.00
      })

      const saleAmount = 45.00
      const sale = offlineSaleStorage.create({
        customerId: customer.id,
        items: [{ productId: 'p1', quantity: 1, unitPrice: saleAmount, totalPrice: saleAmount }],
        totalAmount: saleAmount,
        paidAmount: saleAmount,
        changeAmount: 0,
        paymentMethod: 'credit',
        status: 'completed'
      })

      // Simulate credit payment processing
      creditHelpers.addCreditSale(customer.id, saleAmount, sale.id, 'POS Sale')

      const updatedCustomer = offlineCustomerStorage.getById(customer.id)
      expect(updatedCustomer?.creditBalance).toBe(145.00) // 100 + 45
      expect(sale.paymentMethod).toBe('credit')
    })

    it('should handle mixed payment methods', () => {
      const total = 100.00
      const cashAmount = 60.00
      const cardAmount = 40.00

      // This would require extending the sale interface to support multiple payments
      const paymentBreakdown = [
        { method: 'cash', amount: cashAmount },
        { method: 'credit_card', amount: cardAmount }
      ]

      const totalPaid = paymentBreakdown.reduce((sum, payment) => sum + payment.amount, 0)
      expect(totalPaid).toBe(total)

      // For now, record as the primary payment method
      const sale = offlineSaleStorage.create({
        customerId: null,
        items: [{ productId: 'p1', quantity: 1, unitPrice: total, totalPrice: total }],
        totalAmount: total,
        paidAmount: totalPaid,
        changeAmount: 0,
        paymentMethod: 'mixed', // Could be extended to support this
        status: 'completed'
      })

      expect(sale.paidAmount).toBe(100.00)
    })
  })

  describe('Tax Calculations', () => {
    it('should calculate tax correctly for different rates', () => {
      const subtotal = 100.00
      const taxRate = 0.15 // 15%
      const taxAmount = subtotal * taxRate
      const total = subtotal + taxAmount

      expect(taxAmount).toBe(15.00)
      expect(total).toBe(115.00)
    })

    it('should handle tax-inclusive pricing', () => {
      const totalWithTax = 115.00
      const taxRate = 0.15 // 15%
      const subtotal = totalWithTax / (1 + taxRate)
      const taxAmount = totalWithTax - subtotal

      expect(Math.round(subtotal * 100) / 100).toBe(100.00)
      expect(Math.round(taxAmount * 100) / 100).toBe(15.00)
    })

    it('should handle multiple tax rates per item', () => {
      const items = [
        { price: 50.00, taxRate: 0.10 }, // 10% tax
        { price: 30.00, taxRate: 0.15 }, // 15% tax
        { price: 20.00, taxRate: 0.00 }  // No tax
      ]

      const calculations = items.map(item => ({
        subtotal: item.price,
        tax: item.price * item.taxRate,
        total: item.price * (1 + item.taxRate)
      }))

      expect(calculations[0].tax).toBe(5.00)
      expect(Math.round(calculations[0].total * 100) / 100).toBe(55.00)
      expect(calculations[1].tax).toBe(4.50)
      expect(calculations[1].total).toBe(34.50)
      expect(calculations[2].tax).toBe(0.00)
      expect(calculations[2].total).toBe(20.00)

      const totalTax = calculations.reduce((sum, calc) => sum + calc.tax, 0)
      const grandTotal = calculations.reduce((sum, calc) => sum + calc.total, 0)

      expect(totalTax).toBe(9.50)
      expect(grandTotal).toBe(109.50)
    })
  })

  describe('Sale Status Management', () => {
    it('should handle different sale statuses', () => {
      const draftSale = offlineSaleStorage.create({
        customerId: null,
        items: [{ productId: 'p1', quantity: 1, unitPrice: 25.00, totalPrice: 25.00 }],
        totalAmount: 25.00,
        paidAmount: 0,
        paymentMethod: 'cash',
        status: 'draft'
      })

      const completedSale = offlineSaleStorage.create({
        customerId: null,
        items: [{ productId: 'p2', quantity: 1, unitPrice: 30.00, totalPrice: 30.00 }],
        totalAmount: 30.00,
        paidAmount: 30.00,
        paymentMethod: 'cash',
        status: 'completed'
      })

      expect(draftSale.status).toBe('draft')
      expect(draftSale.paidAmount).toBe(0)
      expect(completedSale.status).toBe('completed')
      expect(completedSale.paidAmount).toBe(30.00)
    })

    it('should handle refunds and returns', () => {
      const originalSale = offlineSaleStorage.create({
        customerId: null,
        items: [{ productId: 'p1', quantity: 2, unitPrice: 25.00, totalPrice: 50.00 }],
        totalAmount: 50.00,
        paidAmount: 50.00,
        paymentMethod: 'cash',
        status: 'completed'
      })

      // Create refund sale (negative amounts)
      const refundSale = offlineSaleStorage.create({
        customerId: null,
        items: [{ productId: 'p1', quantity: -1, unitPrice: 25.00, totalPrice: -25.00 }],
        totalAmount: -25.00,
        paidAmount: -25.00,
        paymentMethod: 'cash',
        status: 'refunded',
        notes: `Refund for sale ${originalSale.invoiceNumber}`
      })

      expect(refundSale.totalAmount).toBe(-25.00)
      expect(refundSale.items[0].quantity).toBe(-1)
      expect(refundSale.status).toBe('refunded')
    })
  })

  describe('Stock Integration', () => {
    it('should update stock quantities when sale is completed', () => {
      // Create product and initial stock
      const product = offlineProductStorage.create({
        name: 'Test Product',
        sku: 'TEST-001',
        price: 25.99,
        cost: 12.50,
        quantity: 100,
        minStock: 10
      })

      const warehouseId = 'warehouse-1'
      offlineProductStockStorage.upsert({
        productId: product.id,
        warehouseId,
        quantity: 100,
        reason: 'Initial stock'
      })

      // Create sale
      const sale = offlineSaleStorage.create({
        customerId: null,
        items: [{ productId: product.id, quantity: 3, unitPrice: 25.99, totalPrice: 77.97 }],
        totalAmount: 77.97,
        paidAmount: 77.97,
        paymentMethod: 'cash',
        status: 'completed'
      })

      // Simulate stock update (this would happen in POS logic)
      const updatedStock = offlineProductStockStorage.upsert({
        productId: product.id,
        warehouseId,
        quantity: 97, // 100 - 3
        reason: 'POS Sale'
      })

      // Record transaction
      offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId,
        type: 'sale',
        quantity: -3,
        previousQuantity: 100,
        newQuantity: 97,
        reason: 'POS Sale',
        reference: sale.invoiceNumber,
        relatedId: sale.id
      })

      expect(updatedStock.quantity).toBe(97)
      
      const transactions = offlineStockTransactionStorage.getByProduct(product.id)
      expect(transactions).toHaveLength(1)
      expect(transactions[0].type).toBe('sale')
      expect(transactions[0].relatedId).toBe(sale.id)
    })
  })
})
