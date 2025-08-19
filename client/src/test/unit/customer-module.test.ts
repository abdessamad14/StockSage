import { describe, it, expect, beforeEach } from 'vitest'
import { 
  offlineCustomerStorage,
  offlineCreditTransactionStorage,
  creditHelpers
} from '../../lib/offline-storage'

describe('Customer Module Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Customer CRUD Operations', () => {
    it('should create customer with all fields', () => {
      const customerData = {
        name: 'John Smith',
        email: 'john.smith@email.com',
        phone: '+1-555-123-4567',
        address: '123 Main St, City, State 12345',
        creditBalance: 0,
        creditLimit: 1000.00,
        notes: 'VIP Customer - 10% discount',
        dateOfBirth: '1985-06-15',
        company: 'Smith Enterprises'
      }

      const customer = offlineCustomerStorage.create(customerData)

      expect(customer.id).toBeDefined()
      expect(customer.name).toBe('John Smith')
      expect(customer.email).toBe('john.smith@email.com')
      expect(customer.phone).toBe('+1-555-123-4567')
      expect(customer.creditBalance).toBe(0)
      expect(customer.creditLimit).toBe(1000.00)
    })

    it('should update customer information', () => {
      const customer = offlineCustomerStorage.create({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '555-0123',
        creditBalance: 0
      })

      const updates = {
        phone: '555-9876',
        address: '456 Oak Avenue',
        creditLimit: 500.00,
        notes: 'Updated contact info'
      }

      const updated = offlineCustomerStorage.update(customer.id, updates)

      expect(updated?.phone).toBe('555-9876')
      expect(updated?.address).toBe('456 Oak Avenue')
      expect(updated?.creditLimit).toBe(500.00)
      expect(updated?.notes).toBe('Updated contact info')
    })

    it('should delete customer', () => {
      const customer = offlineCustomerStorage.create({
        name: 'Delete Test',
        email: 'delete@test.com',
        creditBalance: 0
      })

      const deleted = offlineCustomerStorage.delete(customer.id)
      expect(deleted).toBe(true)

      const retrieved = offlineCustomerStorage.getById(customer.id)
      expect(retrieved).toBeUndefined()
    })

    it('should search customers by name and email', () => {
      offlineCustomerStorage.create({
        name: 'Alice Johnson',
        email: 'alice@company.com',
        creditBalance: 0
      })

      offlineCustomerStorage.create({
        name: 'Bob Wilson',
        email: 'bob@business.net',
        creditBalance: 0
      })

      const nameResults = offlineCustomerStorage.search('Alice')
      expect(nameResults).toHaveLength(1)
      expect(nameResults[0].name).toBe('Alice Johnson')

      const emailResults = offlineCustomerStorage.search('business')
      expect(emailResults).toHaveLength(1)
      expect(emailResults[0].email).toBe('bob@business.net')
    })
  })

  describe('Customer Credit Management', () => {
    it('should initialize customer with zero credit balance', () => {
      const customer = offlineCustomerStorage.create({
        name: 'Credit Test Customer',
        email: 'credit@test.com',
        creditBalance: 0,
        creditLimit: 500.00
      })

      expect(customer.creditBalance).toBe(0)
      expect(customer.creditLimit).toBe(500.00)
    })

    it('should add credit sale and update balance', () => {
      const customer = offlineCustomerStorage.create({
        name: 'Credit Customer',
        email: 'credit@example.com',
        creditBalance: 0,
        creditLimit: 1000.00
      })

      const saleAmount = 150.00
      const saleId = 'sale-123'

      creditHelpers.addCreditSale(
        customer.id,
        saleAmount,
        saleId,
        'Credit sale - Office supplies'
      )

      const updatedCustomer = offlineCustomerStorage.getById(customer.id)
      expect(updatedCustomer?.creditBalance).toBe(150.00)

      // Verify transaction was recorded
      const transactions = offlineCreditTransactionStorage.getByCustomer(customer.id)
      expect(transactions).toHaveLength(1)
      expect(transactions[0].type).toBe('credit_sale')
      expect(transactions[0].amount).toBe(150.00)
      expect(transactions[0].saleId).toBe(saleId)
    })

    it('should process credit payment and reduce balance', () => {
      const customer = offlineCustomerStorage.create({
        name: 'Payment Customer',
        email: 'payment@example.com',
        creditBalance: 300.00,
        creditLimit: 1000.00
      })

      const paymentAmount = 100.00

      creditHelpers.addCreditPayment(
        customer.id,
        paymentAmount,
        'Cash payment received'
      )

      const updatedCustomer = offlineCustomerStorage.getById(customer.id)
      expect(updatedCustomer?.creditBalance).toBe(200.00) // 300 - 100

      // Verify payment transaction
      const transactions = offlineCreditTransactionStorage.getByCustomer(customer.id)
      expect(transactions).toHaveLength(1)
      expect(transactions[0].type).toBe('payment')
      expect(transactions[0].amount).toBe(-100.00) // Negative for payment
    })

    it('should handle multiple credit transactions', () => {
      const customer = offlineCustomerStorage.create({
        name: 'Multi Transaction Customer',
        email: 'multi@example.com',
        creditBalance: 0,
        creditLimit: 2000.00
      })

      // Add multiple credit sales
      creditHelpers.addCreditSale(customer.id, 250.00, 'sale-1', 'First credit sale')
      creditHelpers.addCreditSale(customer.id, 175.00, 'sale-2', 'Second credit sale')
      
      // Add payment
      creditHelpers.addCreditPayment(customer.id, 125.00, 'Partial payment')
      
      // Add another sale
      creditHelpers.addCreditSale(customer.id, 300.00, 'sale-3', 'Third credit sale')

      const finalCustomer = offlineCustomerStorage.getById(customer.id)
      expect(finalCustomer?.creditBalance).toBe(600.00) // 250 + 175 - 125 + 300

      const transactions = offlineCreditTransactionStorage.getByCustomer(customer.id)
      expect(transactions).toHaveLength(4)

      const totalCredits = transactions
        .filter(t => t.type === 'credit_sale')
        .reduce((sum, t) => sum + t.amount, 0)
      expect(totalCredits).toBe(725.00)

      const totalPayments = transactions
        .filter(t => t.type === 'payment')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      expect(totalPayments).toBe(125.00)
    })

    it('should validate credit limit before sales', () => {
      const customer = offlineCustomerStorage.create({
        name: 'Limit Test Customer',
        email: 'limit@test.com',
        creditBalance: 800.00,
        creditLimit: 1000.00
      })

      const availableCredit = (customer.creditLimit || 0) - (customer.creditBalance || 0)
      expect(availableCredit).toBe(200.00)

      // Test within limit
      const smallSale = 150.00
      const canMakeSmallSale = smallSale <= availableCredit
      expect(canMakeSmallSale).toBe(true)

      // Test exceeding limit
      const largeSale = 300.00
      const canMakeLargeSale = largeSale <= availableCredit
      expect(canMakeLargeSale).toBe(false)
    })

    it('should calculate customer credit aging', () => {
      const customer = offlineCustomerStorage.create({
        name: 'Aging Test Customer',
        email: 'aging@test.com',
        creditBalance: 500.00,
        creditLimit: 1000.00
      })

      // Create transactions with different dates
      const today = new Date()
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000)

      const transactions = [
        { amount: 200.00, date: today, description: 'Recent sale' },
        { amount: 150.00, date: thirtyDaysAgo, description: '30 days old' },
        { amount: 150.00, date: sixtyDaysAgo, description: '60 days old' }
      ]

      // Calculate aging buckets
      const aging = {
        current: 0,      // 0-30 days
        thirty: 0,       // 31-60 days
        sixty: 0,        // 61-90 days
        ninety: 0        // 90+ days
      }

      transactions.forEach(transaction => {
        const daysDiff = Math.floor((today.getTime() - transaction.date.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDiff < 30) {
          aging.current += transaction.amount
        } else if (daysDiff < 60) {
          aging.thirty += transaction.amount
        } else if (daysDiff < 90) {
          aging.sixty += transaction.amount
        } else {
          aging.ninety += transaction.amount
        }
      })

      expect(aging.current).toBe(200.00)
      expect(aging.thirty).toBe(150.00)
      expect(aging.sixty).toBe(150.00)
      expect(aging.ninety).toBe(0)
    })
  })

  describe('Customer Loyalty and Discounts', () => {
    it('should calculate customer lifetime value', () => {
      const customer = offlineCustomerStorage.create({
        name: 'Loyal Customer',
        email: 'loyal@example.com',
        creditBalance: 0
      })

      // Simulate purchase history
      const purchases = [
        { amount: 150.00, date: '2024-01-15' },
        { amount: 200.00, date: '2024-02-20' },
        { amount: 175.00, date: '2024-03-10' },
        { amount: 225.00, date: '2024-04-05' }
      ]

      const totalSpent = purchases.reduce((sum, purchase) => sum + purchase.amount, 0)
      const averageOrderValue = totalSpent / purchases.length
      const purchaseFrequency = purchases.length

      expect(totalSpent).toBe(750.00)
      expect(averageOrderValue).toBe(187.50)
      expect(purchaseFrequency).toBe(4)
    })

    it('should determine customer tier based on spending', () => {
      const determineCustomerTier = (totalSpent: number): string => {
        if (totalSpent >= 5000) return 'Platinum'
        if (totalSpent >= 2000) return 'Gold'
        if (totalSpent >= 500) return 'Silver'
        return 'Bronze'
      }

      expect(determineCustomerTier(100)).toBe('Bronze')
      expect(determineCustomerTier(750)).toBe('Silver')
      expect(determineCustomerTier(2500)).toBe('Gold')
      expect(determineCustomerTier(6000)).toBe('Platinum')
    })

    it('should calculate tier-based discounts', () => {
      const getTierDiscount = (tier: string): number => {
        switch (tier) {
          case 'Platinum': return 0.15 // 15%
          case 'Gold': return 0.10     // 10%
          case 'Silver': return 0.05   // 5%
          case 'Bronze': return 0.00   // 0%
          default: return 0.00
        }
      }

      const orderAmount = 200.00
      const goldDiscount = getTierDiscount('Gold')
      const discountAmount = orderAmount * goldDiscount
      const finalAmount = orderAmount - discountAmount

      expect(goldDiscount).toBe(0.10)
      expect(discountAmount).toBe(20.00)
      expect(finalAmount).toBe(180.00)
    })
  })

  describe('Customer Communication Preferences', () => {
    it('should manage customer contact preferences', () => {
      const customer = offlineCustomerStorage.create({
        name: 'Preference Customer',
        email: 'prefs@example.com',
        phone: '555-0199',
        creditBalance: 0,
        notes: JSON.stringify({
          preferences: {
            emailNotifications: true,
            smsNotifications: false,
            promotionalEmails: true,
            receiptMethod: 'email'
          }
        })
      })

      const preferences = JSON.parse(customer.notes || '{}').preferences

      expect(preferences.emailNotifications).toBe(true)
      expect(preferences.smsNotifications).toBe(false)
      expect(preferences.promotionalEmails).toBe(true)
      expect(preferences.receiptMethod).toBe('email')
    })

    it('should validate contact information', () => {
      const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
      }

      const validatePhone = (phone: string): boolean => {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
      }

      expect(validateEmail('valid@example.com')).toBe(true)
      expect(validateEmail('invalid.email')).toBe(false)

      expect(validatePhone('555-123-4567')).toBe(true)
      expect(validatePhone('+1-555-123-4567')).toBe(true)
      expect(validatePhone('invalid-phone')).toBe(false)
    })
  })

  describe('Customer Credit Reports', () => {
    it('should generate customer credit statement', () => {
      const customer = offlineCustomerStorage.create({
        name: 'Statement Customer',
        email: 'statement@example.com',
        creditBalance: 350.00,
        creditLimit: 1000.00
      })

      // Add some transactions
      offlineCreditTransactionStorage.create({
        customerId: customer.id,
        type: 'credit_sale',
        amount: 200.00,
        description: 'Office supplies',
        date: new Date('2024-01-15')
      })

      offlineCreditTransactionStorage.create({
        customerId: customer.id,
        type: 'credit_sale',
        amount: 250.00,
        description: 'Equipment purchase',
        date: new Date('2024-01-20')
      })

      offlineCreditTransactionStorage.create({
        customerId: customer.id,
        type: 'payment',
        amount: -100.00,
        description: 'Cash payment',
        date: new Date('2024-01-25')
      })

      const transactions = offlineCreditTransactionStorage.getByCustomer(customer.id)
      const statement = {
        customer: customer,
        transactions: transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        summary: {
          currentBalance: customer.creditBalance,
          creditLimit: customer.creditLimit,
          availableCredit: (customer.creditLimit || 0) - (customer.creditBalance || 0),
          totalSales: transactions.filter(t => t.type === 'credit_sale').reduce((sum, t) => sum + t.amount, 0),
          totalPayments: transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + Math.abs(t.amount), 0)
        }
      }

      expect(statement.summary.currentBalance).toBe(350.00)
      expect(statement.summary.availableCredit).toBe(650.00)
      expect(statement.summary.totalSales).toBe(450.00)
      expect(statement.summary.totalPayments).toBe(100.00)
      expect(statement.transactions).toHaveLength(3)
    })

    it('should identify overdue accounts', () => {
      const customer = offlineCustomerStorage.create({
        name: 'Overdue Customer',
        email: 'overdue@example.com',
        creditBalance: 500.00,
        creditLimit: 1000.00
      })

      // Create old transaction (over 30 days)
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 45)

      offlineCreditTransactionStorage.create({
        customerId: customer.id,
        type: 'credit_sale',
        amount: 500.00,
        description: 'Overdue sale',
        date: oldDate
      })

      const transactions = offlineCreditTransactionStorage.getByCustomer(customer.id)
      const today = new Date()
      
      const overdueTransactions = transactions.filter(transaction => {
        const daysDiff = Math.floor((today.getTime() - new Date(transaction.date).getTime()) / (1000 * 60 * 60 * 24))
        return transaction.type === 'credit_sale' && daysDiff > 30
      })

      expect(overdueTransactions).toHaveLength(1)
      expect(overdueTransactions[0].amount).toBe(500.00)
    })
  })
})
