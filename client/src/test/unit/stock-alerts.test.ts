import { describe, it, expect, beforeEach } from 'vitest'
import { 
  offlineProductStorage,
  offlineProductStockStorage,
  offlineStockTransactionStorage,
  offlineStockLocationStorage
} from '../../lib/offline-storage'

describe('Stock Alerts and Multi-Warehouse Management Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Low Stock Alerts', () => {
    it('should identify products with low stock across all warehouses', () => {
      const products = [
        offlineProductStorage.create({
          name: 'Low Stock Product A',
          sku: 'LSA-001',
          price: 25.00,
          cost: 12.50,
          quantity: 8,
          minStock: 15 // Below minimum
        }),
        offlineProductStorage.create({
          name: 'Normal Stock Product B',
          sku: 'NSB-001',
          price: 35.00,
          cost: 17.50,
          quantity: 25,
          minStock: 10 // Above minimum
        }),
        offlineProductStorage.create({
          name: 'Critical Stock Product C',
          sku: 'CSC-001',
          price: 45.00,
          cost: 22.50,
          quantity: 2,
          minStock: 20 // Critical low
        })
      ]

      const warehouses = ['wh-main', 'wh-branch']

      // Set up stock in warehouses
      products.forEach(product => {
        warehouses.forEach(warehouseId => {
          const warehouseStock = warehouseId === 'wh-main' 
            ? Math.floor(product.quantity * 0.7) 
            : Math.floor(product.quantity * 0.3)

          offlineProductStockStorage.upsert({
            productId: product.id,
            locationId: warehouseId,
            quantity: warehouseStock,
            reason: 'Initial stock distribution'
          })
        })
      })

      // Get all products and check stock levels
      const allProducts = offlineProductStorage.getAll()
      const lowStockProducts = allProducts.filter(product => {
        const totalStock = offlineProductStockStorage.getByProduct(product.id)
          .reduce((sum, stock) => sum + stock.quantity, 0)
        return totalStock <= product.minStock
      })

      expect(lowStockProducts).toHaveLength(2) // LSA-001 and CSC-001
      expect(lowStockProducts.some(p => p.sku === 'LSA-001')).toBe(true)
      expect(lowStockProducts.some(p => p.sku === 'CSC-001')).toBe(true)

      // Critical stock (below 50% of minimum)
      const criticalStockProducts = allProducts.filter(product => {
        const totalStock = offlineProductStockStorage.getByProduct(product.id)
          .reduce((sum, stock) => sum + stock.quantity, 0)
        return totalStock <= (product.minStock * 0.5)
      })

      expect(criticalStockProducts).toHaveLength(2) // LSA-001 and CSC-001 both critical
      expect(criticalStockProducts.some(p => p.sku === 'LSA-001')).toBe(true) // 8 <= 7.5 (15 * 0.5)
      expect(criticalStockProducts.some(p => p.sku === 'CSC-001')).toBe(true) // 2 <= 10 (20 * 0.5)
    })

    it('should generate low stock alerts with warehouse details', () => {
      const product = offlineProductStorage.create({
        name: 'Alert Product',
        sku: 'ALERT-001',
        price: 40.00,
        cost: 20.00,
        quantity: 30,
        minStock: 25
      })

      const warehouses = [
        { id: 'wh-main', name: 'Main Warehouse', stock: 18 },
        { id: 'wh-branch-1', name: 'Branch Store 1', stock: 7 },
        { id: 'wh-branch-2', name: 'Branch Store 2', stock: 5 }
      ]

      // Create warehouse locations
      warehouses.forEach(warehouse => {
        offlineStockLocationStorage.create({
          name: warehouse.name,
          address: `Address for ${warehouse.name}`,
          type: 'warehouse'
        })

        offlineProductStockStorage.upsert({
          productId: product.id,
          locationId: warehouse.id,
          quantity: warehouse.stock,
          reason: 'Initial stock'
        })
      })

      const productStocks = offlineProductStockStorage.getByProduct(product.id)
      const totalStock = productStocks.reduce((sum, stock) => sum + stock.quantity, 0)
      
      // Generate alert details
      const alert = {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        totalStock: totalStock,
        minStock: product.minStock,
        shortfall: product.minStock - totalStock,
        severity: totalStock <= (product.minStock * 0.3) ? 'critical' : 'warning',
        warehouseBreakdown: productStocks.map(stock => ({
          warehouseId: stock.locationId,
          quantity: stock.quantity,
          isLow: stock.quantity <= (product.minStock / warehouses.length) // Proportional minimum
        }))
      }

      expect(alert.totalStock).toBe(30) // 18 + 7 + 5
      expect(alert.shortfall).toBe(-5) // 25 - 30 (actually above minimum)
      expect(alert.severity).toBe('warning')
      expect(alert.warehouseBreakdown).toHaveLength(3)
      expect(alert.warehouseBreakdown.some(w => w.isLow)).toBe(true) // Some warehouses are low
    })

    it('should prioritize restock recommendations', () => {
      const products = [
        {
          product: offlineProductStorage.create({
            name: 'High Priority Restock',
            sku: 'HPR-001',
            price: 100.00,
            cost: 50.00,
            quantity: 5,
            minStock: 50
          }),
          salesVelocity: 15 // Units per week
        },
        {
          product: offlineProductStorage.create({
            name: 'Medium Priority Restock',
            sku: 'MPR-001',
            price: 60.00,
            cost: 30.00,
            quantity: 12,
            minStock: 20
          }),
          salesVelocity: 5 // Units per week
        },
        {
          product: offlineProductStorage.create({
            name: 'Low Priority Restock',
            sku: 'LPR-001',
            price: 30.00,
            cost: 15.00,
            quantity: 18,
            minStock: 25
          }),
          salesVelocity: 2 // Units per week
        }
      ]

      const warehouseId = 'warehouse-restock'

      const restockRecommendations = products.map(({ product, salesVelocity }) => {
        const currentStock = product.quantity
        const daysUntilStockout = Math.floor(currentStock / (salesVelocity / 7))
        const urgencyScore = (product.minStock - currentStock) * salesVelocity
        
        return {
          productId: product.id,
          sku: product.sku,
          currentStock,
          minStock: product.minStock,
          salesVelocity,
          daysUntilStockout,
          urgencyScore,
          recommendedOrderQty: Math.max(product.minStock * 2 - currentStock, 0)
        }
      }).sort((a, b) => b.urgencyScore - a.urgencyScore) // Sort by urgency

      expect(restockRecommendations[0].sku).toBe('HPR-001') // Highest urgency
      expect(restockRecommendations[0].daysUntilStockout).toBeLessThan(5)
      expect(restockRecommendations[0].recommendedOrderQty).toBe(95) // (50 * 2) - 5

      expect(restockRecommendations[2].sku).toBe('LPR-001') // Lowest urgency
      expect(restockRecommendations[2].recommendedOrderQty).toBe(32) // (25 * 2) - 18
    })
  })

  describe('Multi-Warehouse Stock Management', () => {
    it('should balance stock across warehouses', () => {
      const product = offlineProductStorage.create({
        name: 'Balance Product',
        sku: 'BAL-001',
        price: 70.00,
        cost: 35.00,
        quantity: 150,
        minStock: 30
      })

      const warehouses = [
        { id: 'wh-main', currentStock: 100, targetStock: 75 },
        { id: 'wh-branch-1', currentStock: 30, targetStock: 50 },
        { id: 'wh-branch-2', currentStock: 20, targetStock: 25 }
      ]

      // Set current stock levels
      warehouses.forEach(warehouse => {
        offlineProductStockStorage.upsert({
          productId: product.id,
          locationId: warehouse.id,
          quantity: warehouse.currentStock,
          reason: 'Current stock level'
        })
      })

      // Calculate rebalancing needs
      const rebalancingPlan = warehouses.map(warehouse => {
        const difference = warehouse.targetStock - warehouse.currentStock
        return {
          warehouseId: warehouse.id,
          currentStock: warehouse.currentStock,
          targetStock: warehouse.targetStock,
          transferNeeded: difference,
          action: difference > 0 ? 'receive' : difference < 0 ? 'send' : 'none'
        }
      })

      const sendingWarehouses = rebalancingPlan.filter(w => w.action === 'send')
      const receivingWarehouses = rebalancingPlan.filter(w => w.action === 'receive')

      expect(sendingWarehouses).toHaveLength(1) // wh-main needs to send 25
      expect(receivingWarehouses).toHaveLength(2) // wh-branch-1 and wh-branch-2 need stock

      expect(sendingWarehouses[0].warehouseId).toBe('wh-main')
      expect(sendingWarehouses[0].transferNeeded).toBe(-25) // 75 - 100

      const totalToSend = Math.abs(sendingWarehouses.reduce((sum, w) => sum + w.transferNeeded, 0))
      const totalToReceive = receivingWarehouses.reduce((sum, w) => sum + w.transferNeeded, 0)
      
      expect(totalToSend).toBe(totalToReceive) // Balanced transfers
    })

    it('should optimize stock allocation based on demand patterns', () => {
      const product = offlineProductStorage.create({
        name: 'Demand Optimization Product',
        sku: 'DOP-001',
        price: 85.00,
        cost: 42.50,
        quantity: 200,
        minStock: 40
      })

      const warehouseDemand = [
        { 
          id: 'wh-high-demand', 
          name: 'High Demand Store',
          currentStock: 50,
          weeklyDemand: 25,
          leadTime: 2 // days
        },
        { 
          id: 'wh-medium-demand', 
          name: 'Medium Demand Store',
          currentStock: 75,
          weeklyDemand: 15,
          leadTime: 3 // days
        },
        { 
          id: 'wh-low-demand', 
          name: 'Low Demand Store',
          currentStock: 75,
          weeklyDemand: 8,
          leadTime: 1 // days
        }
      ]

      // Calculate optimal stock allocation
      const optimizedAllocation = warehouseDemand.map(warehouse => {
        const dailyDemand = warehouse.weeklyDemand / 7
        const safetyStock = dailyDemand * warehouse.leadTime * 2 // 2x lead time coverage
        const optimalStock = Math.ceil(safetyStock + (dailyDemand * 14)) // 2 weeks demand + safety
        
        return {
          ...warehouse,
          dailyDemand,
          safetyStock,
          optimalStock,
          stockGap: optimalStock - warehouse.currentStock
        }
      })

      expect(optimizedAllocation[0].dailyDemand).toBeCloseTo(3.57, 1) // 25/7
      expect(optimizedAllocation[0].safetyStock).toBeCloseTo(14.28, 1) // 3.57 * 2 * 2
      expect(optimizedAllocation[0].optimalStock).toBe(65) // Ceil(14.28 + 50)

      // High demand warehouse needs more stock
      expect(optimizedAllocation[0].stockGap).toBeGreaterThan(0)
      
      // Low demand warehouse may have excess
      expect(optimizedAllocation[2].stockGap).toBeLessThan(optimizedAllocation[0].stockGap)
    })

    it('should generate automated reorder points', () => {
      const product = offlineProductStorage.create({
        name: 'Reorder Point Product',
        sku: 'ROP-001',
        price: 95.00,
        cost: 47.50,
        quantity: 40,
        minStock: 30
      })

      const warehouseId = 'warehouse-reorder'

      // Set current stock
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: 40,
        reason: 'Current stock level'
      })

      // Calculate reorder point based on demand and lead time
      const averageDailyUsage = 3.5 // units per day
      const supplierLeadTime = 7 // days
      const safetyStockDays = 5 // extra safety buffer
      
      const reorderPoint = Math.ceil(averageDailyUsage * (supplierLeadTime + safetyStockDays))
      const economicOrderQuantity = Math.ceil(averageDailyUsage * 30) // 30 days supply

      expect(reorderPoint).toBe(42) // 3.5 * 12 = 42
      expect(economicOrderQuantity).toBe(105) // 3.5 * 30 = 105

      // Check if reorder is needed
      const currentStock = offlineProductStockStorage.getByProductAndLocation(product.id, warehouseId)
      const shouldReorder = (currentStock?.quantity || 0) <= reorderPoint

      expect(shouldReorder).toBe(true) // 40 <= 42

      if (shouldReorder) {
        const reorderRecommendation = {
          productId: product.id,
          currentStock: currentStock?.quantity || 0,
          reorderPoint: reorderPoint,
          recommendedOrderQty: economicOrderQuantity,
          urgency: (currentStock?.quantity || 0) <= (reorderPoint * 0.5) ? 'critical' : 'normal'
        }

        expect(reorderRecommendation.urgency).toBe('normal') // 40 > 21 (42 * 0.5)
        expect(reorderRecommendation.recommendedOrderQty).toBe(105)
      }
    })

    it('should track stock alert history and resolution', () => {
      const product = offlineProductStorage.create({
        name: 'Alert History Product',
        sku: 'AHP-001',
        price: 65.00,
        cost: 32.50,
        quantity: 15,
        minStock: 25
      })

      const warehouseId = 'warehouse-alert-history'

      // Initial low stock situation
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: 30,
        reason: 'Low stock alert test setup'
      })

      // Record alert generation
      const alertDate = new Date()
      offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: warehouseId,
        type: 'adjustment',
        quantity: 0, // No quantity change, just documentation
        previousQuantity: 15,
        newQuantity: 15,
        reason: 'Low stock alert generated - Stock level (15) below minimum (25). Reorder recommended.',
        reference: 'ALERT-001'
      })

      // Simulate restock to resolve alert
      const restockQty = 35
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: warehouseId,
        quantity: 15 + restockQty,
        reason: 'Restock - Alert resolution'
      })

      offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: warehouseId,
        type: 'entry',
        quantity: restockQty,
        previousQuantity: 15,
        newQuantity: 15 + restockQty,
        reason: `Restock to resolve low stock alert - Restocked ${restockQty} units. New level: ${15 + restockQty}`,
        reference: 'RESTOCK-001'
      })

      const alertHistory = offlineStockTransactionStorage.getByProduct(product.id)
      const alertTransactions = alertHistory.filter(t => 
        t.reference?.includes('ALERT') || (t.reason && t.reason.includes('alert'))
      )

      expect(alertTransactions).toHaveLength(2)
      expect(alertTransactions[0].reason).toContain('alert generated')
      expect(alertTransactions[1].reason).toContain('resolve low stock alert')

      // Verify alert was resolved
      const finalStock = offlineProductStockStorage.getByProductAndLocation(product.id, warehouseId)
      expect(finalStock?.quantity).toBe(50)
      expect(finalStock!.quantity > product.minStock).toBe(true)
    })
  })

  describe('Multi-Warehouse Coordination', () => {
    it('should coordinate stock levels across warehouse network', () => {
      const product = offlineProductStorage.create({
        name: 'Network Coordination Product',
        sku: 'NCP-001',
        price: 120.00,
        cost: 60.00,
        quantity: 300,
        minStock: 60
      })

      const warehouseNetwork = [
        { 
          id: 'wh-central', 
          name: 'Central Distribution',
          role: 'distribution',
          currentStock: 150,
          capacity: 200,
          demandLevel: 'low'
        },
        { 
          id: 'wh-retail-a', 
          name: 'Retail Store A',
          role: 'retail',
          currentStock: 75,
          capacity: 100,
          demandLevel: 'high'
        },
        { 
          id: 'wh-retail-b', 
          name: 'Retail Store B',
          role: 'retail',
          currentStock: 75,
          capacity: 80,
          demandLevel: 'medium'
        }
      ]

      // Set up warehouse network
      warehouseNetwork.forEach(warehouse => {
        offlineStockLocationStorage.create({
          name: warehouse.name,
          address: `Address for ${warehouse.name}`,
          type: warehouse.role === 'distribution' ? 'warehouse' : 'store'
        })

        offlineProductStockStorage.upsert({
          productId: product.id,
          locationId: warehouse.id,
          quantity: warehouse.currentStock,
          reason: 'Network setup'
        })
      })

      // Simulate high demand at retail-a (stock running low)
      const retailAStock = offlineProductStockStorage.getByProductAndLocation(product.id, 'wh-retail-a')
      const newRetailAStock = 25 // Dropped to 25 from 75

      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: 'wh-retail-a',
        quantity: newRetailAStock,
        reason: 'High sales demand'
      })

      offlineStockTransactionStorage.create({
        productId: product.id,
        warehouseId: 'wh-retail-a',
        type: 'exit',
        quantity: -50, // 75 - 25
        previousQuantity: 75,
        newQuantity: 25,
        reason: 'High demand sales period',
        reference: 'DEMAND-SPIKE-001'
      })

      // Check if replenishment from central is needed
      const centralStock = offlineProductStockStorage.getByProductAndLocation(product.id, 'wh-central')
      const retailACurrentStock = offlineProductStockStorage.getByProductAndLocation(product.id, 'wh-retail-a')
      
      const replenishmentNeeded = (retailACurrentStock?.quantity || 0) < (product.minStock / 2) // Retail minimum
      const replenishmentQty = replenishmentNeeded ? 50 : 0

      expect(replenishmentNeeded).toBe(true) // 25 < 30 (60/2)
      expect(centralStock?.quantity).toBeGreaterThanOrEqual(replenishmentQty) // Can fulfill

      if (replenishmentNeeded && (centralStock?.quantity || 0) >= replenishmentQty) {
        // Execute replenishment transfer
        const transferRef = 'REPLENISH-001'

        // Central warehouse sends stock
        offlineStockTransactionStorage.create({
          productId: product.id,
          warehouseId: 'wh-central',
          type: 'transfer_out',
          quantity: -replenishmentQty,
          previousQuantity: centralStock?.quantity || 0,
          newQuantity: (centralStock?.quantity || 0) - replenishmentQty,
          reason: 'Replenishment to Retail Store A',
          reference: transferRef
        })

        // Retail store receives stock
        offlineStockTransactionStorage.create({
          productId: product.id,
          warehouseId: 'wh-retail-a',
          type: 'transfer_in',
          quantity: replenishmentQty,
          previousQuantity: retailACurrentStock?.quantity || 0,
          newQuantity: (retailACurrentStock?.quantity || 0) + replenishmentQty,
          reason: 'Replenishment from Central Distribution',
          reference: transferRef
        })

        const replenishmentTransactions = offlineStockTransactionStorage.getAll()
          .filter(t => t.reference === transferRef)
        
        expect(replenishmentTransactions).toHaveLength(2)
        expect(replenishmentTransactions.some(t => t.type === 'transfer_out')).toBe(true)
        expect(replenishmentTransactions.some(t => t.type === 'transfer_in')).toBe(true)
      }
    })

    it('should handle emergency stock requests between warehouses', () => {
      const product = offlineProductStorage.create({
        name: 'Emergency Request Product',
        sku: 'ERP-001',
        price: 150.00,
        cost: 75.00,
        quantity: 80,
        minStock: 20
      })

      const warehouses = [
        { id: 'wh-emergency', currentStock: 3, emergencyLevel: true },
        { id: 'wh-helper-1', currentStock: 40, canHelp: true },
        { id: 'wh-helper-2', currentStock: 37, canHelp: true }
      ]

      warehouses.forEach(warehouse => {
        offlineProductStockStorage.upsert({
          productId: product.id,
          locationId: warehouse.id,
          quantity: warehouse.currentStock,
          reason: 'Emergency scenario setup'
        })
      })

      // Emergency warehouse critically low (below 5 units)
      const emergencyWarehouse = warehouses.find(w => w.emergencyLevel)
      const helperWarehouses = warehouses.filter(w => w.canHelp)

      const emergencyThreshold = 5
      const isEmergency = (emergencyWarehouse?.currentStock || 0) < emergencyThreshold

      expect(isEmergency).toBe(true)

      if (isEmergency) {
        // Find nearest warehouse with available stock
        const emergencyTransferQty = 20
        const sourceWarehouse = helperWarehouses.find(w => w.currentStock >= emergencyTransferQty)

        expect(sourceWarehouse).toBeDefined()
        expect(sourceWarehouse?.id).toBe('wh-helper-1') // Has 40 units

        // Execute emergency transfer
        const emergencyRef = 'EMERGENCY-001'

        offlineStockTransactionStorage.create({
          productId: product.id,
          warehouseId: sourceWarehouse!.id,
          type: 'transfer_out',
          quantity: -emergencyTransferQty,
          previousQuantity: sourceWarehouse!.currentStock,
          newQuantity: sourceWarehouse!.currentStock - emergencyTransferQty,
          reason: 'PRIORITY: Emergency transfer - Critical stock level to prevent stockout',
          reference: emergencyRef
        })

        offlineStockTransactionStorage.create({
          productId: product.id,
          warehouseId: emergencyWarehouse!.id,
          type: 'transfer_in',
          quantity: emergencyTransferQty,
          previousQuantity: emergencyWarehouse!.currentStock,
          newQuantity: emergencyWarehouse!.currentStock + emergencyTransferQty,
          reason: 'PRIORITY: Emergency stock received to resolve critical shortage',
          reference: emergencyRef
        })

        const emergencyTransactions = offlineStockTransactionStorage.getAll()
          .filter(t => t.reference === emergencyRef)

        expect(emergencyTransactions).toHaveLength(2)
        expect(emergencyTransactions.every(t => t.reason?.includes('PRIORITY'))).toBe(true)
      }
    })
  })

  describe('Stock Level Monitoring and Reporting', () => {
    it('should generate comprehensive stock level report', () => {
      const products = [
        offlineProductStorage.create({
          name: 'Report Product A',
          sku: 'RPA-001',
          price: 30.00,
          cost: 15.00,
          quantity: 45,
          minStock: 20
        }),
        offlineProductStorage.create({
          name: 'Report Product B',
          sku: 'RPB-001',
          price: 50.00,
          cost: 25.00,
          quantity: 12,
          minStock: 25
        }),
        offlineProductStorage.create({
          name: 'Report Product C',
          sku: 'RPC-001',
          price: 75.00,
          cost: 37.50,
          quantity: 60,
          minStock: 15
        })
      ]

      const warehouses = ['wh-main', 'wh-branch']

      // Distribute stock across warehouses
      products.forEach(product => {
        warehouses.forEach((warehouseId, index) => {
          const warehouseStock = index === 0 
            ? Math.floor(product.quantity * 0.6) 
            : Math.ceil(product.quantity * 0.4)

          offlineProductStockStorage.upsert({
            productId: product.id,
            locationId: warehouseId,
            quantity: warehouseStock,
            reason: 'Stock distribution for reporting'
          })
        })
      })

      // Generate stock level report
      const stockReport = products.map(product => {
        const warehouseStocks = offlineProductStockStorage.getByProduct(product.id)
        const totalStock = warehouseStocks.reduce((sum, stock) => sum + stock.quantity, 0)
        const stockStatus = totalStock <= product.minStock ? 'low' : 'normal'
        
        return {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          totalStock: totalStock,
          minStock: product.minStock,
          stockStatus: stockStatus,
          warehouseBreakdown: warehouseStocks.map(stock => ({
            warehouseId: stock.locationId,
            quantity: stock.quantity
          })),
          stockValue: totalStock * product.cost
        }
      })

      expect(stockReport).toHaveLength(3)
      expect(stockReport[0].stockStatus).toBe('normal') // 45 > 20
      expect(stockReport[1].stockStatus).toBe('low')    // 12 <= 25
      expect(stockReport[2].stockStatus).toBe('normal') // 60 > 15

      // Calculate total inventory value
      const totalInventoryValue = stockReport.reduce((sum, item) => sum + item.stockValue, 0)
      expect(totalInventoryValue).toBe(3225) // (45*15) + (12*25) + (60*37.50)

      // Count low stock items
      const lowStockCount = stockReport.filter(item => item.stockStatus === 'low').length
      expect(lowStockCount).toBe(1)
    })
  })
})
