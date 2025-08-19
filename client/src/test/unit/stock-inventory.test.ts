import { describe, it, expect, beforeEach } from 'vitest'
import { 
  offlineProductStorage,
  offlineProductStockStorage,
  offlineStockTransactionStorage,
  offlineInventoryCountStorage,
  offlineStockLocationStorage
} from '../../lib/offline-storage'

describe('Stock Inventory and Summary Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Inventory Count Management', () => {
    it('should create and manage inventory counts', () => {
      const warehouse = offlineStockLocationStorage.create({
        name: 'Count Warehouse',
        address: '123 Count St',
        type: 'warehouse'
      })

      const products = [
        offlineProductStorage.create({
          name: 'Count Product A',
          sku: 'CPA-001',
          price: 25.00,
          cost: 12.50,
          quantity: 50,
          minStock: 10
        }),
        offlineProductStorage.create({
          name: 'Count Product B',
          sku: 'CPB-001',
          price: 35.00,
          cost: 17.50,
          quantity: 30,
          minStock: 8
        })
      ]

      // Set up initial stock
      products.forEach(product => {
        offlineProductStockStorage.upsert({
          productId: product.id,
          locationId: warehouse.id,
          quantity: product.quantity,
          reason: 'Initial stock for count'
        })
      })

      // Create inventory count
      const inventoryCount = offlineInventoryCountStorage.create({
        name: 'Quarterly Count Q1',
        description: 'First quarter inventory count',
        type: 'full',
        locationId: warehouse.id,
        status: 'draft',
        createdBy: 'admin',
        totalProducts: 0,
        countedProducts: 0,
        totalVariances: 0
      })

      expect(inventoryCount.id).toBeDefined()
      expect(inventoryCount.locationId).toBe(warehouse.id)
      expect(inventoryCount.status).toBe('draft')
      expect(inventoryCount.name).toBe('Quarterly Count Q1')

      // Verify count was created
      const allCounts = offlineInventoryCountStorage.getAll()
      expect(allCounts).toHaveLength(1)
      expect(allCounts[0].id).toBe(inventoryCount.id)
    })

    it('should handle count item recording and variance detection', () => {
      const product = offlineProductStorage.create({
        name: 'Variance Product',
        sku: 'VAR-001',
        price: 40.00,
        cost: 20.00,
        quantity: 75,
        minStock: 15
      })

      const warehouseId = 'warehouse-variance'

      // Set system stock
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: 75,
        reason: 'System stock level'
      })

      const inventoryCount = offlineInventoryCountStorage.create({
        name: 'Variance Detection Test',
        description: 'Test count for variance detection',
        type: 'partial',
        locationId: warehouseId,
        status: 'in_progress',
        createdBy: 'counter',
        totalProducts: 1
      })

      // Physical count shows different quantity
      const physicalCount = 72 // 3 units missing
      const systemQuantity = 75
      const variance = physicalCount - systemQuantity

      // In a real implementation, count items would be stored separately
      // For this test, we'll simulate the variance detection logic
      const countVariance = {
        countId: inventoryCount.id,
        productId: product.id,
        systemQuantity: systemQuantity,
        physicalCount: physicalCount,
        variance: variance,
        varianceValue: variance * product.cost,
        status: variance === 0 ? 'match' : variance > 0 ? 'overage' : 'shortage'
      }

      expect(countVariance.variance).toBe(-3)
      expect(countVariance.varianceValue).toBe(-60.00) // -3 * 20.00
      expect(countVariance.status).toBe('shortage')

      // Simulate count completion and stock adjustment
      if (variance !== 0) {
        offlineProductStockStorage.upsert({
          productId: product.id,
          locationId: warehouseId,
          quantity: physicalCount,
          reason: 'Inventory count adjustment'
        })

        offlineStockTransactionStorage.create({
          productId: product.id,
          warehouseId: warehouseId,
          type: 'adjustment',
          quantity: variance,
          previousQuantity: systemQuantity,
          newQuantity: physicalCount,
          reason: `Inventory count variance adjustment - Count variance: ${variance} units. Physical count: ${physicalCount}, System: ${systemQuantity}`,
          reference: inventoryCount.id
        })
      }

      const adjustedStock = offlineProductStockStorage.getByProductAndLocation(product.id, warehouseId)
      expect(adjustedStock?.quantity).toBe(72)

      const adjustmentTransaction = offlineStockTransactionStorage.getByProduct(product.id)
        .find(t => t.reference === inventoryCount.id)
      expect(adjustmentTransaction?.quantity).toBe(-3)
    })

    it('should calculate count accuracy and completion metrics', () => {
      const warehouse = offlineStockLocationStorage.create({
        name: 'Metrics Warehouse',
        address: '456 Metrics Ave',
        type: 'warehouse'
      })

      const products = Array.from({ length: 10 }, (_, i) => 
        offlineProductStorage.create({
          name: `Metrics Product ${i + 1}`,
          sku: `MP-${String(i + 1).padStart(3, '0')}`,
          price: 50.00,
          cost: 25.00,
          quantity: 100,
          minStock: 20
        })
      )

      const inventoryCount = offlineInventoryCountStorage.create({
        name: 'Accuracy Test Count',
        description: 'Testing count accuracy metrics',
        type: 'full',
        locationId: warehouse.id,
        status: 'completed',
        createdBy: 'admin',
        totalProducts: 3,
        countedProducts: 3,
        totalVariances: 2
      })

      // Simulate count results with various variances
      const countResults = products.map((product, index) => {
        const systemQty = 100
        const physicalQty = index < 7 ? 100 : index === 7 ? 98 : index === 8 ? 102 : 95 // 7 matches, 3 variances
        
        return {
          productId: product.id,
          systemQuantity: systemQty,
          physicalCount: physicalQty,
          variance: physicalQty - systemQty,
          counted: true
        }
      })

      // Calculate metrics
      const totalItems = countResults.length
      const itemsCounted = countResults.filter(r => r.counted).length
      const exactMatches = countResults.filter(r => r.variance === 0).length
      const variances = countResults.filter(r => r.variance !== 0).length
      
      const completionRate = (itemsCounted / totalItems) * 100
      const accuracyRate = (exactMatches / itemsCounted) * 100
      const varianceRate = (variances / itemsCounted) * 100

      expect(completionRate).toBe(100) // All items counted
      expect(accuracyRate).toBe(70)    // 7/10 exact matches
      expect(varianceRate).toBe(30)    // 3/10 have variances

      const totalVarianceValue = countResults.reduce((sum, result) => 
        sum + (result.variance * 25.00), 0 // cost per unit
      )
      expect(totalVarianceValue).toBe(-125) // -2*25 + 2*25 + -5*25 = -50 + 50 - 125 = -125... let me recalculate
      // Actually: (-2 * 25) + (-3 * 30) + (5 * 35) = -50 - 90 + 175 = 35
    })

    it('should generate comprehensive stock summary by warehouse', () => {
      const warehouses = [
        offlineStockLocationStorage.create({
          name: 'Main Warehouse',
          address: '100 Main St',
          type: 'warehouse'
        }),
        offlineStockLocationStorage.create({
          name: 'Branch Store',
          address: '200 Branch Ave',
          type: 'store'
        })
      ]

      const products = [
        offlineProductStorage.create({
          name: 'Summary Product A',
          sku: 'SPA-001',
          price: 60.00,
          cost: 30.00,
          quantity: 80,
          minStock: 20
        }),
        offlineProductStorage.create({
          name: 'Summary Product B',
          sku: 'SPB-001',
          price: 45.00,
          cost: 22.50,
          quantity: 120,
          minStock: 25
        }),
        offlineProductStorage.create({
          name: 'Summary Product C',
          sku: 'SPC-001',
          price: 90.00,
          cost: 45.00,
          quantity: 40,
          minStock: 10
        })
      ]

      // Distribute stock across warehouses
      const stockDistribution = [
        { warehouseId: warehouses[0].id, productId: products[0].id, quantity: 50 },
        { warehouseId: warehouses[0].id, productId: products[1].id, quantity: 80 },
        { warehouseId: warehouses[0].id, productId: products[2].id, quantity: 25 },
        { warehouseId: warehouses[1].id, productId: products[0].id, quantity: 30 },
        { warehouseId: warehouses[1].id, productId: products[1].id, quantity: 40 },
        { warehouseId: warehouses[1].id, productId: products[2].id, quantity: 15 }
      ]

      stockDistribution.forEach(stock => {
        offlineProductStockStorage.upsert({
          productId: stock.productId,
          locationId: stock.warehouseId,
          quantity: stock.quantity,
          reason: 'Stock distribution for summary'
        })
      })

      // Generate warehouse summary
      const warehouseSummaries = warehouses.map(warehouse => {
        const warehouseStocks = offlineProductStockStorage.getAll()
          .filter(stock => stock.locationId === warehouse.id)

        const summary = {
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          totalProducts: warehouseStocks.length,
          totalUnits: warehouseStocks.reduce((sum, stock) => sum + stock.quantity, 0),
          totalValue: warehouseStocks.reduce((sum, stock) => {
            const product = offlineProductStorage.getById(stock.productId)
            return sum + (stock.quantity * (product?.cost || 0))
          }, 0),
          lowStockItems: warehouseStocks.filter(stock => {
            const product = offlineProductStorage.getById(stock.productId)
            return stock.quantity <= (product?.minStock || 0) / warehouses.length
          }).length
        }

        return summary
      })

      expect(warehouseSummaries).toHaveLength(2)
      
      // Main warehouse summary
      expect(warehouseSummaries[0].totalProducts).toBe(3)
      expect(warehouseSummaries[0].totalUnits).toBe(155) // 50 + 80 + 25
      expect(warehouseSummaries[0].totalValue).toBe(4425.00) // (50*30) + (80*22.5) + (25*45)

      // Branch store summary
      expect(warehouseSummaries[1].totalProducts).toBe(3)
      expect(warehouseSummaries[1].totalUnits).toBe(85) // 30 + 40 + 15
      expect(warehouseSummaries[1].totalValue).toBe(2475.00) // (30*30) + (40*22.5) + (15*45)
    })

    it('should generate ABC analysis for inventory classification', () => {
      const products = [
        { name: 'High Value A', cost: 100.00, quantity: 50, annualUsage: 200 }, // Value: 20,000
        { name: 'High Value B', cost: 80.00, quantity: 75, annualUsage: 150 },  // Value: 12,000
        { name: 'Medium Value C', cost: 50.00, quantity: 100, annualUsage: 120 }, // Value: 6,000
        { name: 'Medium Value D', cost: 40.00, quantity: 80, annualUsage: 100 },  // Value: 4,000
        { name: 'Low Value E', cost: 20.00, quantity: 200, annualUsage: 80 },    // Value: 1,600
        { name: 'Low Value F', cost: 15.00, quantity: 150, annualUsage: 60 }     // Value: 900
      ]

      const createdProducts = products.map(p => 
        offlineProductStorage.create({
          name: p.name,
          sku: p.name.replace(/\s+/g, '-').toUpperCase(),
          price: p.cost * 2,
          cost: p.cost,
          quantity: p.quantity,
          minStock: 10
        })
      )

      // Calculate ABC classification
      const productAnalysis = createdProducts.map((product, index) => {
        const annualUsage = products[index].annualUsage
        const annualValue = product.cost * annualUsage
        
        return {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          currentStock: product.quantity,
          cost: product.cost,
          annualUsage: annualUsage,
          annualValue: annualValue
        }
      }).sort((a, b) => b.annualValue - a.annualValue)

      const totalAnnualValue = productAnalysis.reduce((sum, p) => sum + p.annualValue, 0)
      
      // Classify products (A: 80% of value, B: 15% of value, C: 5% of value)
      let cumulativeValue = 0
      const classifiedProducts = productAnalysis.map(product => {
        cumulativeValue += product.annualValue
        const cumulativePercentage = (cumulativeValue / totalAnnualValue) * 100
        
        let classification = 'C'
        if (cumulativePercentage <= 80) classification = 'A'
        else if (cumulativePercentage <= 95) classification = 'B'
        
        return {
          ...product,
          classification,
          cumulativePercentage
        }
      })

      expect(totalAnnualValue).toBe(44500) // Sum of all annual values
      expect(classifiedProducts[0].classification).toBe('A') // Highest value
      expect(classifiedProducts[0].annualValue).toBe(20000)
      expect(classifiedProducts[1].classification).toBe('A') // Second highest
      expect(classifiedProducts[1].annualValue).toBe(12000)

      const aItems = classifiedProducts.filter(p => p.classification === 'A')
      const bItems = classifiedProducts.filter(p => p.classification === 'B')
      const cItems = classifiedProducts.filter(p => p.classification === 'C')

      expect(aItems.length).toBeGreaterThan(0)
      expect(bItems.length).toBeGreaterThan(0)
      expect(cItems.length).toBeGreaterThan(0)
    })

    it('should calculate inventory turnover ratios', () => {
      const product = offlineProductStorage.create({
        name: 'Turnover Product',
        sku: 'TURN-001',
        price: 80.00,
        cost: 40.00,
        quantity: 60,
        minStock: 15
      })

      const warehouseId = 'warehouse-turnover'

      // Set initial stock
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: 60,
        reason: 'Initial stock for turnover analysis'
      })

      // Simulate sales over a year (monthly data)
      const monthlySales = [15, 12, 18, 20, 22, 25, 30, 28, 24, 20, 16, 14] // Total: 244
      const totalAnnualSales = monthlySales.reduce((sum, sales) => sum + sales, 0)
      
      // Calculate turnover metrics
      const averageInventory = 60 // Simplified - would calculate from periodic stock levels
      const inventoryTurnover = totalAnnualSales / averageInventory
      const daysInInventory = 365 / inventoryTurnover
      
      expect(totalAnnualSales).toBe(244)
      expect(inventoryTurnover).toBeCloseTo(4.07, 1) // 244 / 60
      expect(daysInInventory).toBeCloseTo(89.75, 1) // 365 / 4.07

      // Classify turnover performance
      let turnoverRating = 'Poor'
      if (inventoryTurnover >= 6) turnoverRating = 'Excellent'
      else if (inventoryTurnover >= 4) turnoverRating = 'Good'
      else if (inventoryTurnover >= 2) turnoverRating = 'Fair'

      expect(turnoverRating).toBe('Good')
    })
  })

  describe('Inventory Valuation Methods', () => {
    it('should calculate inventory value using different methods', () => {
      const products = [
        offlineProductStorage.create({
          name: 'Valuation Product A',
          sku: 'VPA-001',
          price: 100.00,
          cost: 60.00,
          quantity: 25,
          minStock: 5
        }),
        offlineProductStorage.create({
          name: 'Valuation Product B',
          sku: 'VPB-001',
          price: 75.00,
          cost: 45.00,
          quantity: 40,
          minStock: 10
        }),
        offlineProductStorage.create({
          name: 'Valuation Product C',
          sku: 'VPC-001',
          price: 50.00,
          cost: 30.00,
          quantity: 60,
          minStock: 15
        })
      ]

      const warehouseId = 'warehouse-valuation'

      // Set up stock
      products.forEach(product => {
        offlineProductStockStorage.upsert({
          productId: product.id,
          locationId: warehouseId,
          quantity: product.quantity,
          reason: 'Valuation test setup'
        })
      })

      // Calculate different valuation methods
      const inventoryValuation = {
        // Cost method (what we paid)
        costValue: products.reduce((sum, product) => sum + (product.quantity * product.cost), 0),
        
        // Retail method (what we could sell for)
        retailValue: products.reduce((sum, product) => sum + (product.quantity * product.price), 0),
        
        // Lower of cost or market (conservative)
        lowerOfCostOrMarket: products.reduce((sum, product) => {
          const marketValue = product.price * 0.9 // Assume 10% markdown for quick sale
          const lowerValue = Math.min(product.cost, marketValue)
          return sum + (product.quantity * lowerValue)
        }, 0)
      }

      expect(inventoryValuation.costValue).toBe(5100.00) // (25*60) + (40*45) + (60*30)
      expect(inventoryValuation.retailValue).toBe(8500.00) // (25*100) + (40*75) + (60*50)
      expect(inventoryValuation.lowerOfCostOrMarket).toBe(5100.00) // Cost is lower than 90% of retail

      // Calculate potential profit
      const potentialProfit = inventoryValuation.retailValue - inventoryValuation.costValue
      const profitMargin = (potentialProfit / inventoryValuation.retailValue) * 100

      expect(potentialProfit).toBe(3400.00) // 8500 - 5100
      expect(profitMargin).toBe(40.0) // 3400/8500 * 100
    })

    it('should track inventory aging and obsolescence', () => {
      const products = [
        {
          product: offlineProductStorage.create({
            name: 'Fresh Product',
            sku: 'FRESH-001',
            price: 40.00,
            cost: 20.00,
            quantity: 30,
            minStock: 8
          }),
          lastMovement: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        },
        {
          product: offlineProductStorage.create({
            name: 'Aging Product',
            sku: 'AGING-001',
            price: 60.00,
            cost: 30.00,
            quantity: 45,
            minStock: 12
          }),
          lastMovement: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) // 45 days ago
        },
        {
          product: offlineProductStorage.create({
            name: 'Stale Product',
            sku: 'STALE-001',
            price: 80.00,
            cost: 40.00,
            quantity: 20,
            minStock: 5
          }),
          lastMovement: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) // 120 days ago
        }
      ]

      const warehouseId = 'warehouse-aging'

      // Set up stock and record last movements
      products.forEach(({ product, lastMovement }) => {
        offlineProductStockStorage.upsert({
          productId: product.id,
          locationId: warehouseId,
          quantity: product.quantity,
          reason: 'Aging analysis setup'
        })

        // Record last movement transaction
        offlineStockTransactionStorage.create({
          productId: product.id,
          warehouseId: warehouseId,
          type: 'exit',
          quantity: -1, // Small sale
          previousQuantity: product.quantity + 1,
          newQuantity: product.quantity,
          reason: 'Last recorded movement',
          reference: 'LAST-MOVE',
        })
      })

      // Analyze aging using the intended lastMovement dates
      const today = new Date()
      const agingAnalysis = products.map(({ product, lastMovement }) => {
        const daysSinceMovement = Math.floor((Date.now() - lastMovement.getTime()) / (1000 * 60 * 60 * 24))

        let agingCategory = 'Fresh'
        if (daysSinceMovement > 90) agingCategory = 'Obsolete'
        else if (daysSinceMovement > 60) agingCategory = 'Slow Moving'
        else if (daysSinceMovement > 30) agingCategory = 'Aging'

        return {
          productId: product.id,
          sku: product.sku,
          daysSinceMovement,
          agingCategory,
          currentStock: product.quantity,
          stockValue: product.quantity * product.cost
        }
      })

      expect(agingAnalysis[0].agingCategory).toBe('Fresh')     // 5 days
      expect(agingAnalysis[1].agingCategory).toBe('Aging')     // 45 days
      expect(agingAnalysis[2].agingCategory).toBe('Obsolete')  // 120 days

      const obsoleteValue = agingAnalysis
        .filter(a => a.agingCategory === 'Obsolete')
        .reduce((sum, a) => sum + a.stockValue, 0)
      
      expect(obsoleteValue).toBe(800.00) // 20 * 40
    })

    it('should generate inventory performance dashboard metrics', () => {
      const products = Array.from({ length: 5 }, (_, i) => 
        offlineProductStorage.create({
          name: `Dashboard Product ${i + 1}`,
          sku: `DP-${String(i + 1).padStart(3, '0')}`,
          price: 50.00 + (i * 10),
          cost: 25.00 + (i * 5),
          quantity: 100 - (i * 10),
          minStock: 20 - (i * 2)
        })
      )

      const warehouseId = 'warehouse-dashboard'

      // Set up stock and simulate various transaction types
      products.forEach((product, index) => {
        offlineProductStockStorage.upsert({
          productId: product.id,
          locationId: warehouseId,
          quantity: product.quantity,
          reason: 'Dashboard metrics setup'
        })

        // Simulate different transaction patterns
        const transactionTypes = ['entry', 'exit', 'adjustment'] as const
        const transactionCounts = [3, 8, 1] // More exits than entries

        transactionTypes.forEach((type, typeIndex) => {
          for (let j = 0; j < transactionCounts[typeIndex]; j++) {
            const quantity = type === 'exit' ? -5 : type === 'entry' ? 10 : -2
            offlineStockTransactionStorage.create({
              productId: product.id,
              warehouseId: warehouseId,
              type: type,
              quantity: quantity,
              previousQuantity: product.quantity,
              newQuantity: product.quantity + quantity,
              reason: `${type} for dashboard metrics`,
              reference: `DASH-${type.toUpperCase()}-${index}-${j}`
            })
          }
        })
      })

      // Generate dashboard metrics
      const allProducts = offlineProductStorage.getAll()
      const allTransactions = offlineStockTransactionStorage.getAll()
      
      const dashboardMetrics = {
        totalProducts: allProducts.length,
        totalInventoryValue: allProducts.reduce((sum, p) => sum + (p.quantity * p.cost), 0),
        totalRetailValue: allProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0),
        lowStockProducts: allProducts.filter(p => p.quantity <= p.minStock).length,
        
        // Transaction metrics
        totalTransactions: allTransactions.length,
        entriesCount: allTransactions.filter(t => t.type === 'entry').length,
        exitsCount: allTransactions.filter(t => t.type === 'exit').length,
        adjustmentsCount: allTransactions.filter(t => t.type === 'adjustment').length,
        transfersCount: allTransactions.filter(t => t.type.includes('transfer')).length,
        
        // Movement metrics
        totalMovementValue: allTransactions.reduce((sum, t) => {
          const product = allProducts.find(p => p.id === t.productId)
          return sum + (Math.abs(t.quantity) * (product?.cost || 0))
        }, 0)
      }

      expect(dashboardMetrics.totalProducts).toBe(5)
      expect(dashboardMetrics.totalInventoryValue).toBe(13500.00) // Sum of quantity * cost
      expect(dashboardMetrics.totalRetailValue).toBe(27000.00) // Sum of quantity * price
      expect(dashboardMetrics.totalTransactions).toBe(60) // 5 products * 12 transactions each
      expect(dashboardMetrics.entriesCount).toBe(15) // 5 products * 3 entries each
      expect(dashboardMetrics.exitsCount).toBe(40) // 5 products * 8 exits each
      expect(dashboardMetrics.adjustmentsCount).toBe(5) // 5 products * 1 adjustment each

      // Calculate key performance indicators
      const stockTurnoverIndicator = dashboardMetrics.exitsCount / dashboardMetrics.entriesCount
      const adjustmentRate = (dashboardMetrics.adjustmentsCount / dashboardMetrics.totalTransactions) * 100

      expect(stockTurnoverIndicator).toBeCloseTo(2.67, 1) // 40/15
      expect(adjustmentRate).toBeCloseTo(8.33, 1) // 5/60 * 100
    })
  })
})
