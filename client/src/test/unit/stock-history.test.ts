import { describe, it, expect, beforeEach } from 'vitest'
import { 
  offlineProductStorage,
  offlineProductStockStorage,
  offlineStockTransactionStorage,
  offlineSaleStorage
} from '../../lib/offline-storage'

describe('Stock History and Movement Tracking Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Stock Transaction History', () => {
    it('should track complete transaction history for a product', () => {
      const product = offlineProductStorage.create({
        name: 'History Tracking Product',
        sku: 'HTP-001',
        price: 75.00,
        cost: 37.50,
        quantity: 100,
        minStock: 20
      })

      const warehouseId = 'warehouse-history'

      // Initial stock
      offlineProductStockStorage.upsert({
        productId: product.id,
        warehouseId: warehouseId,
        quantity: 100,
        reason: 'Initial stock'
      })

      // Create various transactions
      const transactions = [
        {
          type: 'entry' as const,
          quantity: 50,
          reason: 'Purchase order received',
          reference: 'PO-001'
        },
        {
          type: 'exit' as const,
          quantity: -25,
          reason: 'Sale to customer',
          reference: 'SALE-001'
        },
        {
          type: 'adjustment' as const,
          quantity: -5,
          reason: 'Damaged goods',
          reference: 'ADJ-001'
        },
        {
          type: 'transfer_out' as const,
          quantity: -20,
          reason: 'Transfer to branch',
          reference: 'TRF-001'
        }
      ]

      let currentQuantity = 100
      transactions.forEach(transaction => {
        const previousQuantity = currentQuantity
        currentQuantity += transaction.quantity
        
        offlineStockTransactionStorage.create({
          productId: product.id,
          warehouseId: warehouseId,
          type: transaction.type,
          quantity: transaction.quantity,
          previousQuantity: previousQuantity,
          newQuantity: currentQuantity,
          reason: transaction.reason,
          reference: transaction.reference
        })

        // Update actual stock
        offlineProductStockStorage.upsert({
          productId: product.id,
          warehouseId: warehouseId,
          quantity: currentQuantity,
          reason: transaction.reason
        })
      })

      const history = offlineStockTransactionStorage.getByProduct(product.id)
      expect(history).toHaveLength(4)

      // Verify chronological order and running balance
      expect(history[0].newQuantity).toBe(150) // 100 + 50
      expect(history[1].newQuantity).toBe(125) // 150 - 25
      expect(history[2].newQuantity).toBe(120) // 125 - 5
      expect(history[3].newQuantity).toBe(100) // 120 - 20

      // Verify transaction types
      expect(history.some(t => t.type === 'entry')).toBe(true)
      expect(history.some(t => t.type === 'exit')).toBe(true)
      expect(history.some(t => t.type === 'adjustment')).toBe(true)
      expect(history.some(t => t.type === 'transfer_out')).toBe(true)
    })

    it('should filter transaction history by date range', () => {
      const product = offlineProductStorage.create({
        name: 'Date Filter Product',
        sku: 'DFP-001',
        price: 50.00,
        cost: 25.00,
        quantity: 50,
        minStock: 10
      })

      const warehouseId = 'warehouse-date'

      // Create transactions with different dates
      const baseDate = new Date('2024-01-01')
      const transactions = [
        { date: new Date('2024-01-05'), quantity: 25, reason: 'January entry' },
        { date: new Date('2024-02-10'), quantity: -10, reason: 'February sale' },
        { date: new Date('2024-03-15'), quantity: 15, reason: 'March restock' },
        { date: new Date('2024-04-20'), quantity: -8, reason: 'April sale' }
      ]

      let currentQuantity = 50
      transactions.forEach(transaction => {
        const previousQuantity = currentQuantity
        currentQuantity += transaction.quantity

        offlineStockTransactionStorage.create({
          productId: product.id,
          warehouseId: warehouseId,
          type: transaction.quantity > 0 ? 'entry' : 'exit',
          quantity: transaction.quantity,
          previousQuantity: previousQuantity,
          newQuantity: currentQuantity,
          reason: transaction.reason,
          createdAt: transaction.date.toISOString()
        })
      })

      const allTransactions = offlineStockTransactionStorage.getByProduct(product.id)
      
      // Filter transactions for Q1 2024 (Jan-Mar)
      const q1Start = new Date('2024-01-01')
      const q1End = new Date('2024-03-31')
      
      const q1Transactions = allTransactions.filter(t => {
        const transactionDate = new Date(t.createdAt)
        return transactionDate >= q1Start && transactionDate <= q1End
      })

      expect(q1Transactions).toHaveLength(3)
      expect(q1Transactions.some(t => t.reason === 'January entry')).toBe(true)
      expect(q1Transactions.some(t => t.reason === 'February sale')).toBe(true)
      expect(q1Transactions.some(t => t.reason === 'March restock')).toBe(true)
    })

    it('should track stock movements across multiple warehouses', () => {
      const product = offlineProductStorage.create({
        name: 'Multi-Warehouse Movement Product',
        sku: 'MWMP-001',
        price: 80.00,
        cost: 40.00,
        quantity: 200,
        minStock: 30
      })

      const warehouses = ['wh-main', 'wh-branch-1', 'wh-branch-2']
      
      // Initial distribution
      const initialStocks = [100, 50, 50]
      warehouses.forEach((warehouseId, index) => {
        offlineProductStockStorage.upsert({
          productId: product.id,
          warehouseId: warehouseId,
          quantity: initialStocks[index],
          reason: 'Initial distribution'
        })

        offlineStockTransactionStorage.create({
          productId: product.id,
          warehouseId: warehouseId,
          type: 'entry',
          quantity: initialStocks[index],
          previousQuantity: 0,
          newQuantity: initialStocks[index],
          reason: 'Initial stock distribution',
          reference: 'INIT-001'
        })
      })

      offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: 'wh-main',
        type: 'entry',
        quantity: 50,
        previousQuantity: 100,
        newQuantity: 150,
        reason: 'Stock replenishment',
        reference: 'REP-001'
      })

      // Transfer from main to branch-1
      const transferQty = 25
      const transferRef = 'TRF-MAIN-B1-001'

      // Record transfer out from main
      offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: 'wh-main',
        type: 'transfer_out',
        quantity: -transferQty,
        previousQuantity: 150,
        newQuantity: 125,
        reason: 'Transfer to Branch 1',
        reference: transferRef
      })

      // Record transfer in to branch-1
      offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: 'wh-branch-1',
        type: 'transfer_in',
        quantity: transferQty,
        previousQuantity: 50,
        newQuantity: 75,
        reason: 'Transfer from Main',
        reference: transferRef
      })

      // Get movement history for the transfer
      const allTransactions = offlineStockTransactionStorage.getByProduct(product.id)
      const transferTransactions = allTransactions.filter(t => t.reference === transferRef)
      
      expect(transferTransactions).toHaveLength(2)
      expect(transferTransactions.some(t => t.type === 'transfer_out' && t.warehouseId === 'wh-main')).toBe(true)
      expect(transferTransactions.some(t => t.type === 'transfer_in' && t.warehouseId === 'wh-branch-1')).toBe(true)

      // Verify transfer amounts match
      const outTransaction = transferTransactions.find(t => t.type === 'transfer_out')
      const inTransaction = transferTransactions.find(t => t.type === 'transfer_in')
      expect(Math.abs(outTransaction!.quantity)).toBe(inTransaction!.quantity)
    })
  })

  describe('Stock Movement Analytics', () => {
    it('should calculate stock velocity and turnover', () => {
      const product = offlineProductStorage.create({
        name: 'Velocity Product',
        sku: 'VEL-001',
        price: 60.00,
        cost: 30.00,
        quantity: 100,
        minStock: 25
      })

      const warehouseId = 'warehouse-velocity'

      // Simulate 3 months of sales data
      const salesData = [
        { month: 'Jan', sold: 40 },
        { month: 'Feb', sold: 35 },
        { month: 'Mar', sold: 45 }
      ]

      let currentStock = 100
      salesData.forEach((sale, index) => {
        // Record sale
        offlineStockTransactionStorage.create({
          productId: product.id,
          warehouseId: warehouseId,
          type: 'exit',
          quantity: -sale.sold,
          previousQuantity: currentStock,
          newQuantity: currentStock - sale.sold,
          reason: `${sale.month} sales`,
          reference: `SALES-${sale.month}`
        })

        currentStock -= sale.sold

        // Restock
        const restockQty = sale.sold + 10 // Restock more than sold
        offlineStockTransactionStorage.create({
          productId: product.id,
          warehouseId: warehouseId,
          type: 'entry',
          quantity: restockQty,
          previousQuantity: currentStock,
          newQuantity: currentStock + restockQty,
          reason: `${sale.month} restock`,
          reference: `RESTOCK-${sale.month}`
        })

        currentStock += restockQty
      })

      const transactions = offlineStockTransactionStorage.getByProduct(product.id)
      const salesTransactions = transactions.filter(t => t.type === 'exit')
      
      // Calculate metrics
      const totalSold = salesTransactions.reduce((sum, t) => sum + Math.abs(t.quantity), 0)
      const averageMonthlyUsage = totalSold / 3
      const averageStock = 100 // Simplified - would calculate from stock levels over time
      const turnoverRate = totalSold / averageStock

      expect(totalSold).toBe(120) // 40 + 35 + 45
      expect(averageMonthlyUsage).toBe(40)
      expect(turnoverRate).toBe(1.2) // 120 / 100
    })

    it('should identify fast and slow moving products', () => {
      const products = [
        {
          product: offlineProductStorage.create({
            name: 'Fast Mover',
            sku: 'FAST-001',
            price: 25.00,
            cost: 12.50,
            quantity: 50,
            minStock: 15
          }),
          monthlySales: 45 // High turnover
        },
        {
          product: offlineProductStorage.create({
            name: 'Slow Mover',
            sku: 'SLOW-001',
            price: 100.00,
            cost: 50.00,
            quantity: 20,
            minStock: 5
          }),
          monthlySales: 3 // Low turnover
        },
        {
          product: offlineProductStorage.create({
            name: 'Dead Stock',
            sku: 'DEAD-001',
            price: 75.00,
            cost: 37.50,
            quantity: 30,
            minStock: 10
          }),
          monthlySales: 0 // No movement
        }
      ]

      const warehouseId = 'warehouse-movement'

      products.forEach(({ product, monthlySales }) => {
        if (monthlySales > 0) {
          offlineStockTransactionStorage.create({
            productId: product.id,
            warehouseId: warehouseId,
            type: 'exit',
            quantity: -monthlySales,
            previousQuantity: product.quantity,
            newQuantity: product.quantity - monthlySales,
            reason: 'Monthly sales',
            reference: `SALES-${product.sku}`
          })
        }
      })

      // Analyze movement patterns
      const movementAnalysis = products.map(({ product, monthlySales }) => {
        const turnoverRate = monthlySales / product.quantity
        let category = 'Dead Stock'
        
        if (turnoverRate > 0.5) category = 'Fast Moving'
        else if (turnoverRate > 0.2) category = 'Moderate Moving'
        else if (turnoverRate > 0) category = 'Slow Moving'

        return {
          productId: product.id,
          sku: product.sku,
          turnoverRate,
          category
        }
      })

      expect(movementAnalysis[0].category).toBe('Fast Moving') // 45/50 = 0.9
      expect(movementAnalysis[1].category).toBe('Slow Moving') // 3/20 = 0.15
      expect(movementAnalysis[2].category).toBe('Dead Stock') // 0/30 = 0
    })

    it('should track seasonal movement patterns', () => {
      const product = offlineProductStorage.create({
        name: 'Seasonal Product',
        sku: 'SEASON-001',
        price: 45.00,
        cost: 22.50,
        quantity: 200,
        minStock: 30
      })

      const warehouseId = 'warehouse-seasonal'

      // Simulate seasonal sales pattern (higher in winter months)
      const monthlyData = [
        { month: 'Jan', sales: 50, temp: 'Winter' },
        { month: 'Feb', sales: 45, temp: 'Winter' },
        { month: 'Mar', sales: 30, temp: 'Spring' },
        { month: 'Apr', sales: 25, temp: 'Spring' },
        { month: 'May', sales: 20, temp: 'Spring' },
        { month: 'Jun', sales: 15, temp: 'Summer' },
        { month: 'Jul', sales: 12, temp: 'Summer' },
        { month: 'Aug', sales: 15, temp: 'Summer' },
        { month: 'Sep', sales: 25, temp: 'Fall' },
        { month: 'Oct', sales: 35, temp: 'Fall' },
        { month: 'Nov', sales: 40, temp: 'Fall' },
        { month: 'Dec', sales: 55, temp: 'Winter' }
      ]

      monthlyData.forEach((data, index) => {
        offlineStockTransactionStorage.create({
          productId: product.id,
          warehouseId: warehouseId,
          type: 'adjustment',
          quantity: -5,
          previousQuantity: 100,
          newQuantity: 95,
          reason: 'Investigation required - Discrepancy found during monthly audit. Stock count shows 5 units missing. Security review initiated.',
          reference: 'DISC-INV-001'
        })  
        offlineStockTransactionStorage.create({
          productId: product.id,
          warehouseId: warehouseId,
          type: 'exit',
          quantity: -data.sales,
          previousQuantity: 95,
          newQuantity: 95 - data.sales,
          reason: `${data.month} seasonal sales`,
          reference: `SEASONAL-${data.month}`
        })
      })

      offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: warehouseId,
        type: 'adjustment',
        quantity: 0,
        previousQuantity: 95,
        newQuantity: 95,
        reason: 'Investigation completed. Discrepancy attributed to damaged goods not properly recorded. Process improvement implemented.',
        reference: 'DISC-INV-001'
      })

      const transactions = offlineStockTransactionStorage.getByProduct(product.id)
      
      // Group by season
      const seasonalSales = monthlyData.reduce((seasons, data) => {
        if (!seasons[data.temp]) seasons[data.temp] = 0
        seasons[data.temp] += data.sales
        return seasons
      }, {} as Record<string, number>)

      expect(seasonalSales.Winter).toBe(150) // Jan + Feb + Dec
      expect(seasonalSales.Spring).toBe(75)  // Mar + Apr + May
      expect(seasonalSales.Summer).toBe(42)  // Jun + Jul + Aug
      expect(seasonalSales.Fall).toBe(100)   // Sep + Oct + Nov

      // Winter is the peak season
      const peakSeason = Object.entries(seasonalSales).reduce((max, [season, sales]) => 
        sales > max.sales ? { season, sales } : max
      , { season: '', sales: 0 })

      expect(peakSeason.season).toBe('Winter')
    })
  })

  describe('Stock Audit Trail', () => {
    it('should maintain complete audit trail with user tracking', () => {
      const product = offlineProductStorage.create({
        name: 'Audit Trail Product',
        sku: 'AUDIT-001',
        price: 90.00,
        cost: 45.00,
        quantity: 75,
        minStock: 15
      })

      const warehouseId = 'warehouse-audit'

      // Simulate transactions by different users
      const auditTransactions = [
        {
          type: 'entry' as const,
          quantity: 25,
          reason: 'Purchase order received',
          reference: 'PO-001',
          user: 'john.doe@company.com'
        },
        {
          type: 'exit' as const,
          quantity: -15,
          reason: 'Sale to customer',
          reference: 'SALE-001',
          user: 'jane.smith@company.com'
        },
        {
          type: 'adjustment' as const,
          quantity: -3,
          reason: 'Damaged during handling',
          reference: 'ADJ-001',
          user: 'warehouse.manager@company.com'
        }
      ]

      let currentQuantity = 75
      auditTransactions.forEach(transaction => {
        const previousQuantity = currentQuantity
        currentQuantity += transaction.quantity

        offlineStockTransactionStorage.create({
          productId: product.id,
          warehouseId: warehouseId,
          type: transaction.type,
          quantity: transaction.quantity,
          previousQuantity: previousQuantity,
          newQuantity: currentQuantity,
          reason: `${transaction.reason} - Performed by: ${transaction.user}`,
          reference: transaction.reference
        })
      })

      const auditTrail = offlineStockTransactionStorage.getByProduct(product.id)
      expect(auditTrail).toHaveLength(3)

      // Verify audit information is preserved
      const auditRecords = auditTrail.filter(t => t.reason && t.reason.includes('by:'))
      expect(auditRecords[0].reason).toContain('by: john.doe@company.com')
      expect(auditRecords[1].reason).toContain('by: jane.smith@company.com')
      expect(auditRecords[2].reason).toContain('by: warehouse.manager@company.com')

      // Verify running balance is correct
      expect(auditTrail[0].newQuantity).toBe(100) // 75 + 25
      expect(auditTrail[1].newQuantity).toBe(85)  // 100 - 15
      expect(auditTrail[2].newQuantity).toBe(82)  // 85 - 3
    })

    it('should track stock discrepancies and investigations', () => {
      const product = offlineProductStorage.create({
        name: 'Discrepancy Product',
        sku: 'DISC-001',
        price: 55.00,
        cost: 27.50,
        quantity: 60,
        minStock: 12
      })

      const warehouseId = 'warehouse-discrepancy'

      // System shows 60, physical count shows 55
      const systemQuantity = 60
      const physicalCount = 55
      const discrepancy = physicalCount - systemQuantity

      offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: warehouseId,
        type: 'adjustment',
        quantity: discrepancy,
        previousQuantity: systemQuantity,
        newQuantity: physicalCount,
        reason: 'Physical count discrepancy - Investigation required - Discrepancy found during monthly audit. Possible causes: theft, damage, or recording error. Investigation assigned to security team.',
        reference: 'DISC-INV-001'
      })

      // Follow-up investigation transaction
      offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: warehouseId,
        type: 'adjustment',
        quantity: 0, // No quantity change, just documentation
        previousQuantity: physicalCount,
        newQuantity: physicalCount,
        reason: 'Investigation completed. Discrepancy attributed to damaged goods not properly recorded. Process improvement implemented.',
        reference: 'DISC-INV-001-RESOLVED'
      })

      const discrepancyRecords = offlineStockTransactionStorage.getByProduct(product.id)
      const investigationRecords = discrepancyRecords.filter(t => 
        t.reference?.includes('DISC-INV-001')
      )

      expect(investigationRecords).toHaveLength(2)
      expect(investigationRecords[0].quantity).toBe(-5)
      expect(investigationRecords[0].reason).toContain('Investigation required')
      expect(investigationRecords[1].reason).toContain('Investigation completed')
    })
  })
})
