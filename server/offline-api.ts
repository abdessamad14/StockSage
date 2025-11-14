import express from 'express';
import { db } from './db';
import { products, customers, suppliers, sales, saleItems, inventoryAdjustments, inventoryAdjustmentItems, orderItems, orders, settings, productStock, stockLocations, supplierPayments, stockTransactions, inventoryCounts, inventoryCountItems, productCategories, users } from '@shared/sqlite-schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Products API
router.get('/products', async (req, res) => {
  try {
    const allProducts = await db.select().from(products);
    res.json(allProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/products', async (req, res) => {
  try {
    console.log('POST /products received:', req.body);
    
    // If categoryId is provided, look up the category name
    let categoryName = req.body.category;
    if (req.body.categoryId) {
      const category = await db.select().from(productCategories)
        .where(eq(productCategories.id, parseInt(req.body.categoryId)))
        .limit(1);
      categoryName = category[0]?.name || null;
    }
    
    // Map categoryId to category for database schema
    const productData = {
      ...req.body,
      category: categoryName,
      categoryId: undefined // Remove categoryId as it doesn't exist in DB schema
    };
    
    console.log('Mapped product data:', productData);
    
    // Create the product
    const newProduct = await db.insert(products).values({
      tenantId: 'default',
      ...productData
    }).returning();
    
    const product = newProduct[0];
    console.log('Product created:', product);
    
    // If product has initial quantity > 0, create stock records in principal warehouse
    if (product.quantity > 0) {
      // Get the principal warehouse
      const principalWarehouse = await db.select().from(stockLocations)
        .where(eq(stockLocations.isPrimary, true))
        .limit(1);
      
      const warehouseId = String(principalWarehouse[0]?.id || 1);
      
      // Create product stock record in principal warehouse
      await db.insert(productStock).values({
        tenantId: 'default',
        productId: product.id,
        locationId: warehouseId,
        quantity: product.quantity,
        minStockLevel: product.minStockLevel || 0
      });
      
      console.log(`Created stock record for product ${product.id} in warehouse ${warehouseId} with quantity ${product.quantity}`);
      
      // Create inventory adjustment record for initial stock
      const adjustment = await db.insert(inventoryAdjustments).values({
        tenantId: 'default',
        date: new Date().toISOString(),
        type: 'increase',
        reason: 'Initial stock entry',
        notes: `Initial stock for product: ${product.name}`,
        createdBy: null // No user authentication in offline mode
      }).returning();
      
      // Create inventory adjustment item
      await db.insert(inventoryAdjustmentItems).values({
        tenantId: 'default',
        adjustmentId: adjustment[0].id,
        productId: product.id,
        quantityBefore: 0,
        quantityAfter: product.quantity,
        difference: product.quantity
      });
      
      console.log(`Created stock history for product ${product.id} with initial quantity ${product.quantity}`);
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product', details: error instanceof Error ? error.message : String(error) });
  }
});

// PATCH endpoint for quantity-only updates
router.patch('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Only update the fields provided in the request body
    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    console.log('Updating product quantity with data:', updateData);
    
    const updatedProduct = await db.update(products)
      .set(updateData)
      .where(eq(products.id, parseInt(id)))
      .returning();
    
    if (updatedProduct.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(updatedProduct[0]);
  } catch (error) {
    console.error('Error updating product quantity:', error);
    res.status(500).json({ error: 'Failed to update product quantity' });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get current product to preserve existing values
    const currentProduct = await db.select().from(products)
      .where(eq(products.id, parseInt(id)))
      .limit(1);
    
    if (currentProduct.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const existing = currentProduct[0];
    
    // If categoryId is provided, look up the category name
    let categoryName = existing.category; // Default to existing category
    if (req.body.categoryId !== undefined) {
      if (req.body.categoryId) {
        const category = await db.select().from(productCategories)
          .where(eq(productCategories.id, parseInt(req.body.categoryId)))
          .limit(1);
        categoryName = category[0]?.name || null;
      } else {
        categoryName = null;
      }
    }
    
    // Process the request body to handle undefined values properly and map categoryId to category
    const updateData = {
      name: req.body.name ?? existing.name,
      barcode: req.body.barcode ?? existing.barcode,
      description: req.body.description ?? existing.description,
      category: categoryName,
      costPrice: req.body.costPrice ?? existing.costPrice,
      sellingPrice: req.body.sellingPrice ?? existing.sellingPrice,
      semiWholesalePrice: req.body.semiWholesalePrice ?? existing.semiWholesalePrice,
      wholesalePrice: req.body.wholesalePrice ?? existing.wholesalePrice,
      quantity: req.body.quantity ?? existing.quantity,
      minStockLevel: req.body.minStockLevel ?? existing.minStockLevel,
      unit: req.body.unit ?? existing.unit,
      image: req.body.image ?? existing.image,
      active: req.body.active ?? existing.active,
      updatedAt: new Date().toISOString()
    };
    
    console.log('Updating product with data:', updateData);
    
    const updatedProduct = await db.update(products)
      .set(updateData)
      .where(eq(products.id, parseInt(id)))
      .returning();
    
    if (updatedProduct.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(updatedProduct[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const productId = parseInt(id);
    
    // Delete related records first (outside transaction to avoid FK issues)
    await db.delete(inventoryAdjustmentItems)
      .where(eq(inventoryAdjustmentItems.productId, productId));
    
    await db.delete(saleItems)
      .where(eq(saleItems.productId, productId));
    
    await db.delete(orderItems)
      .where(eq(orderItems.productId, productId));
    
    // Finally delete the product
    const deletedProduct = await db.delete(products)
      .where(eq(products.id, productId))
      .returning();
    
    if (deletedProduct.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Customers API
router.get('/customers', async (req, res) => {
  try {
    const allCustomers = await db.select().from(customers);
    res.json(allCustomers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.post('/customers', async (req, res) => {
  try {
    const newCustomer = await db.insert(customers).values({
      tenantId: 'default',
      ...req.body
    }).returning();
    res.json(newCustomer[0]);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

router.put('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCustomer = await db.update(customers)
      .set(req.body)
      .where(eq(customers.id, parseInt(id)))
      .returning();
    
    if (updatedCustomer.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(updatedCustomer[0]);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Suppliers API
router.get('/suppliers', async (req, res) => {
  try {
    const allSuppliers = await db.select().from(suppliers);
    res.json(allSuppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

router.post('/suppliers', async (req, res) => {
  try {
    const newSupplier = await db.insert(suppliers).values({
      tenantId: 'default',
      ...req.body
    }).returning();
    res.json(newSupplier[0]);
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// Sales API
router.get('/sales', async (req, res) => {
  try {
    const allSales = await db.select().from(sales);
    
    // For each sale, fetch its items with product names
    const salesWithItems = await Promise.all(
      allSales.map(async (sale) => {
        const items = await db.select({
          id: saleItems.id,
          saleId: saleItems.saleId,
          productId: saleItems.productId,
          quantity: saleItems.quantity,
          unitPrice: saleItems.unitPrice,
          totalPrice: saleItems.totalPrice,
          discount: saleItems.discount,
          productName: products.name
        })
        .from(saleItems)
        .leftJoin(products, eq(saleItems.productId, products.id))
        .where(eq(saleItems.saleId, sale.id));
        
        return {
          ...sale,
          items: items
        };
      })
    );
    
    res.json(salesWithItems);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

router.post('/sales', async (req, res) => {
  try {
    const { items, ...saleData } = req.body;
    console.log('Creating sale with items:', items);
    
    // Create sale
    const newSale = await db.insert(sales).values({
      tenantId: 'default',
      ...saleData
    }).returning();
    
    console.log('Created sale:', newSale[0]);
    
    // Create sale items
    let createdItems: any[] = [];
    if (items && items.length > 0) {
      const saleItemsData = items.map((item: any) => ({
        tenantId: 'default',
        saleId: newSale[0].id,
        ...item
      }));
      
      console.log('Creating sale items:', saleItemsData);
      createdItems = await db.insert(saleItems).values(saleItemsData).returning();
      console.log('Created sale items:', createdItems);
    }
    
    // Return sale with items
    const saleWithItems = {
      ...newSale[0],
      items: createdItems
    };
    
    console.log('Returning sale with items:', saleWithItems);
    res.json(saleWithItems);
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Failed to create sale' });
  }
});

// Stock History API
router.get('/stock-history/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Get inventory adjustments for this product
    const adjustments = await db.select({
      adjustmentId: inventoryAdjustments.id,
      date: inventoryAdjustments.date,
      type: inventoryAdjustments.type,
      reason: inventoryAdjustments.reason,
      notes: inventoryAdjustments.notes,
      quantityBefore: inventoryAdjustmentItems.quantityBefore,
      quantityAfter: inventoryAdjustmentItems.quantityAfter,
      difference: inventoryAdjustmentItems.difference
    })
    .from(inventoryAdjustments)
    .innerJoin(inventoryAdjustmentItems, eq(inventoryAdjustments.id, inventoryAdjustmentItems.adjustmentId))
    .where(eq(inventoryAdjustmentItems.productId, parseInt(productId)))
    .orderBy(inventoryAdjustments.date);
    
    // Transform to match frontend expectations
    const transactions = adjustments.map(adj => ({
      id: adj.adjustmentId.toString(),
      date: adj.date,
      type: adj.type === 'increase' ? 'entry' : 'exit',
      location: 'Main Store',
      quantity: Math.abs(adj.difference),
      previous: adj.quantityBefore,
      new: adj.quantityAfter,
      reason: adj.reason,
      reference: adj.notes
    }));
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({ error: 'Failed to fetch stock history' });
  }
});

// Current stock levels API
router.get('/stock-levels/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Get current product quantity
    const product = await db.select({
      quantity: products.quantity
    })
    .from(products)
    .where(eq(products.id, parseInt(productId)))
    .limit(1);
    
    if (product.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Return stock levels for Main Store (default location)
    const stockLevels = {
      'Main Store': product[0].quantity
    };
    
    res.json(stockLevels);
  } catch (error) {
    console.error('Error fetching stock levels:', error);
    res.status(500).json({ error: 'Failed to fetch stock levels' });
  }
});

// Sale Items API
router.get('/sale-items/:saleId', async (req, res) => {
  try {
    const { saleId } = req.params;
    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, parseInt(saleId)));
    res.json(items);
  } catch (error) {
    console.error('Error fetching sale items:', error);
    res.status(500).json({ error: 'Failed to fetch sale items' });
  }
});

router.post('/sale-items', async (req, res) => {
  try {
    const newSaleItem = await db.insert(saleItems).values({
      tenantId: 'default',
      ...req.body
    }).returning();
    res.json(newSaleItem[0]);
  } catch (error) {
    console.error('Error creating sale item:', error);
    res.status(500).json({ error: 'Failed to create sale item' });
  }
});

// Orders API
router.get('/orders', async (req, res) => {
  try {
    const allOrders = await db.select().from(orders);
    res.json(allOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const { items, ...orderData } = req.body;
    
    // Create order
    const newOrder = await db.insert(orders).values({
      tenantId: 'default',
      ...orderData
    }).returning();
    
    // Create order items
    if (items && items.length > 0) {
      const orderItemsData = items.map((item: any) => ({
        tenantId: 'default',
        orderId: newOrder[0].id,
        ...item
      }));
      
      await db.insert(orderItems).values(orderItemsData);
    }
    
    res.json(newOrder[0]);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

router.put('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedOrder = await db.update(orders)
      .set(req.body)
      .where(eq(orders.id, parseInt(id)))
      .returning();
    
    if (updatedOrder.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(updatedOrder[0]);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

router.delete('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = parseInt(id);
    
    // Delete order items first
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    
    // Delete the order
    const deletedOrder = await db.delete(orders)
      .where(eq(orders.id, orderId))
      .returning();
    
    if (deletedOrder.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Order Items API
router.get('/order-items/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, parseInt(orderId)));
    res.json(items);
  } catch (error) {
    console.error('Error fetching order items:', error);
    res.status(500).json({ error: 'Failed to fetch order items' });
  }
});

// Settings API
router.get('/settings', async (req, res) => {
  try {
    const allSettings = await db.select().from(settings).limit(1);
    res.json(allSettings[0] || null);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const newSettings = await db.insert(settings).values({
      tenantId: 'default',
      ...req.body
    }).returning();
    res.json(newSettings[0]);
  } catch (error) {
    console.error('Error creating settings:', error);
    res.status(500).json({ error: 'Failed to create settings' });
  }
});

router.put('/settings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSettings = await db.update(settings)
      .set(req.body)
      .where(eq(settings.id, parseInt(id)))
      .returning();
    
    if (updatedSettings.length === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    
    res.json(updatedSettings[0]);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Update/Delete suppliers endpoints
router.put('/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSupplier = await db.update(suppliers)
      .set(req.body)
      .where(eq(suppliers.id, parseInt(id)))
      .returning();
    
    if (updatedSupplier.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    res.json(updatedSupplier[0]);
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

router.delete('/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSupplier = await db.delete(suppliers)
      .where(eq(suppliers.id, parseInt(id)))
      .returning();
    
    if (deletedSupplier.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

router.delete('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCustomer = await db.delete(customers)
      .where(eq(customers.id, parseInt(id)))
      .returning();
    
    if (deletedCustomer.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// Sales update/delete endpoints
router.put('/sales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSale = await db.update(sales)
      .set(req.body)
      .where(eq(sales.id, parseInt(id)))
      .returning();
    
    if (updatedSale.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    res.json(updatedSale[0]);
  } catch (error) {
    console.error('Error updating sale:', error);
    res.status(500).json({ error: 'Failed to update sale' });
  }
});

router.delete('/sales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const saleId = parseInt(id);
    
    // Delete sale items first
    await db.delete(saleItems).where(eq(saleItems.saleId, saleId));
    
    // Delete the sale
    const deletedSale = await db.delete(sales)
      .where(eq(sales.id, saleId))
      .returning();
    
    if (deletedSale.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting sale:', error);
    res.status(500).json({ error: 'Failed to delete sale' });
  }
});

// Product Stock API
router.get('/product-stock', async (req, res) => {
  try {
    const allStock = await db.select().from(productStock);
    res.json(allStock);
  } catch (error) {
    console.error('Error fetching product stock:', error);
    res.status(500).json({ error: 'Failed to fetch product stock' });
  }
});

router.get('/product-stock/:productId/:locationId', async (req, res) => {
  try {
    const { productId, locationId } = req.params;
    const stock = await db.select().from(productStock)
      .where(eq(productStock.productId, parseInt(productId)) && eq(productStock.locationId, locationId));
    
    if (stock.length === 0) {
      return res.status(404).json({ error: 'Product stock not found' });
    }
    
    res.json(stock[0]);
  } catch (error) {
    console.error('Error fetching product stock:', error);
    res.status(500).json({ error: 'Failed to fetch product stock' });
  }
});

router.post('/product-stock', async (req, res) => {
  try {
    const newStock = await db.insert(productStock).values({
      tenantId: 'default',
      ...req.body
    }).returning();
    
    res.json(newStock[0]);
  } catch (error) {
    console.error('Error creating product stock:', error);
    res.status(500).json({ error: 'Failed to create product stock' });
  }
});

router.put('/product-stock/upsert', async (req, res) => {
  try {
    const { productId, locationId, quantity, minStockLevel } = req.body;
    
    // Try to find existing stock record
    const existingStock = await db.select().from(productStock)
      .where(eq(productStock.productId, productId) && eq(productStock.locationId, locationId));
    
    if (existingStock.length > 0) {
      // Update existing record
      const updated = await db.update(productStock)
        .set({
          quantity,
          minStockLevel: minStockLevel || 0,
          updatedAt: new Date().toISOString()
        })
        .where(eq(productStock.id, existingStock[0].id))
        .returning();
      
      res.json(updated[0]);
    } else {
      // Create new record
      const created = await db.insert(productStock).values({
        tenantId: 'default',
        productId,
        locationId,
        quantity,
        minStockLevel: minStockLevel || 0
      }).returning();
      
      res.json(created[0]);
    }
  } catch (error) {
    console.error('Error upserting product stock:', error);
    res.status(500).json({ error: 'Failed to upsert product stock' });
  }
});

router.put('/product-stock/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await db.update(productStock)
      .set({
        ...req.body,
        updatedAt: new Date().toISOString()
      })
      .where(eq(productStock.id, parseInt(id)))
      .returning();
    
    if (updated.length === 0) {
      return res.status(404).json({ error: 'Product stock not found' });
    }
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating product stock:', error);
    res.status(500).json({ error: 'Failed to update product stock' });
  }
});

router.delete('/product-stock/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.delete(productStock)
      .where(eq(productStock.id, parseInt(id)))
      .returning();
    
    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Product stock not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting product stock:', error);
    res.status(500).json({ error: 'Failed to delete product stock' });
  }
});

// Stock Locations API
router.get('/stock-locations', async (req, res) => {
  try {
    const locations = await db.select().from(stockLocations);
    res.json(locations);
  } catch (error) {
    console.error('Error fetching stock locations:', error);
    res.status(500).json({ error: 'Failed to fetch stock locations' });
  }
});

router.post('/stock-locations', async (req, res) => {
  try {
    const newLocation = await db.insert(stockLocations).values({
      tenantId: 'default',
      ...req.body
    }).returning();
    res.json(newLocation[0]);
  } catch (error) {
    console.error('Error creating stock location:', error);
    res.status(500).json({ error: 'Failed to create stock location' });
  }
});

// Supplier Payments API
router.get('/supplier-payments', async (req, res) => {
  try {
    const payments = await db.select().from(supplierPayments);
    res.json(payments);
  } catch (error) {
    console.error('Error fetching supplier payments:', error);
    res.status(500).json({ error: 'Failed to fetch supplier payments' });
  }
});

router.get('/supplier-payments/supplier/:supplierId', async (req, res) => {
  try {
    const { supplierId } = req.params;
    const payments = await db.select().from(supplierPayments)
      .where(eq(supplierPayments.supplierId, parseInt(supplierId)));
    res.json(payments);
  } catch (error) {
    console.error('Error fetching supplier payments:', error);
    res.status(500).json({ error: 'Failed to fetch supplier payments' });
  }
});

router.post('/supplier-payments', async (req, res) => {
  try {
    const newPayment = await db.insert(supplierPayments).values({
      tenantId: 'default',
      ...req.body
    }).returning();
    res.json(newPayment[0]);
  } catch (error) {
    console.error('Error creating supplier payment:', error);
    res.status(500).json({ error: 'Failed to create supplier payment' });
  }
});

// Stock Transactions API
router.get('/stock-transactions', async (req, res) => {
  try {
    const transactions = await db.select().from(stockTransactions);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching stock transactions:', error);
    res.status(500).json({ error: 'Failed to fetch stock transactions' });
  }
});

router.get('/stock-transactions/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const transactions = await db.select().from(stockTransactions)
      .where(eq(stockTransactions.productId, parseInt(productId)));
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching product stock transactions:', error);
    res.status(500).json({ error: 'Failed to fetch product stock transactions' });
  }
});

router.post('/stock-transactions', async (req, res) => {
  try {
    const newTransaction = await db.insert(stockTransactions).values({
      tenantId: 'default',
      ...req.body,
      createdAt: new Date().toISOString()
    }).returning();
    res.json(newTransaction[0]);
  } catch (error) {
    console.error('Error creating stock transaction:', error);
    res.status(500).json({ error: 'Failed to create stock transaction' });
  }
});

// Inventory Counts API
router.get('/inventory-counts', async (req, res) => {
  try {
    const counts = await db.select().from(inventoryCounts);
    res.json(counts);
  } catch (error) {
    console.error('Error fetching inventory counts:', error);
    res.status(500).json({ error: 'Failed to fetch inventory counts' });
  }
});

router.get('/inventory-counts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const count = await db.select().from(inventoryCounts)
      .where(eq(inventoryCounts.id, parseInt(id)));
    
    if (count.length === 0) {
      return res.status(404).json({ error: 'Inventory count not found' });
    }
    
    res.json(count[0]);
  } catch (error) {
    console.error('Error fetching inventory count:', error);
    res.status(500).json({ error: 'Failed to fetch inventory count' });
  }
});

router.post('/inventory-counts', async (req, res) => {
  try {
    const newCount = await db.insert(inventoryCounts).values({
      tenantId: 'default',
      ...req.body
    }).returning();
    res.json(newCount[0]);
  } catch (error) {
    console.error('Error creating inventory count:', error);
    res.status(500).json({ error: 'Failed to create inventory count' });
  }
});

router.put('/inventory-counts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await db.update(inventoryCounts)
      .set({ ...req.body, updatedAt: new Date().toISOString() })
      .where(eq(inventoryCounts.id, parseInt(id)))
      .returning();
    
    if (updated.length === 0) {
      return res.status(404).json({ error: 'Inventory count not found' });
    }
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating inventory count:', error);
    res.status(500).json({ error: 'Failed to update inventory count' });
  }
});

router.delete('/inventory-counts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const countId = parseInt(id);
    
    // Delete all count items first
    await db.delete(inventoryCountItems)
      .where(eq(inventoryCountItems.countId, countId));
    
    // Delete the count
    const deleted = await db.delete(inventoryCounts)
      .where(eq(inventoryCounts.id, countId))
      .returning();
    
    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Inventory count not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting inventory count:', error);
    res.status(500).json({ error: 'Failed to delete inventory count' });
  }
});

// Inventory Count Items API
router.get('/inventory-count-items', async (req, res) => {
  try {
    const items = await db.select().from(inventoryCountItems);
    res.json(items);
  } catch (error) {
    console.error('Error fetching inventory count items:', error);
    res.status(500).json({ error: 'Failed to fetch inventory count items' });
  }
});

router.get('/inventory-count-items/count/:countId', async (req, res) => {
  try {
    const { countId } = req.params;
    const items = await db.select().from(inventoryCountItems)
      .where(eq(inventoryCountItems.countId, parseInt(countId)));
    res.json(items);
  } catch (error) {
    console.error('Error fetching inventory count items:', error);
    res.status(500).json({ error: 'Failed to fetch inventory count items' });
  }
});

router.post('/inventory-count-items', async (req, res) => {
  try {
    const newItem = await db.insert(inventoryCountItems).values({
      tenantId: 'default',
      ...req.body
    }).returning();
    res.json(newItem[0]);
  } catch (error) {
    console.error('Error creating inventory count item:', error);
    res.status(500).json({ error: 'Failed to create inventory count item' });
  }
});

router.put('/inventory-count-items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await db.update(inventoryCountItems)
      .set({ ...req.body, updatedAt: new Date().toISOString() })
      .where(eq(inventoryCountItems.id, parseInt(id)))
      .returning();
    
    if (updated.length === 0) {
      return res.status(404).json({ error: 'Inventory count item not found' });
    }
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating inventory count item:', error);
    res.status(500).json({ error: 'Failed to update inventory count item' });
  }
});

router.delete('/inventory-count-items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.delete(inventoryCountItems)
      .where(eq(inventoryCountItems.id, parseInt(id)))
      .returning();
    
    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Inventory count item not found' });
    }
    
    res.json({ message: 'Inventory count item deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory count item:', error);
    res.status(500).json({ error: 'Failed to delete inventory count item' });
  }
});

// Categories API
router.get('/categories', async (req, res) => {
  try {
    const allCategories = await db.select().from(productCategories);
    res.json(allCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const newCategory = await db.insert(productCategories).values({
      tenantId: 'default',
      name: req.body.name,
      description: req.body.description || null,
      image: req.body.image || null,
      createdAt: now,
      updatedAt: now
    }).returning();
    res.json(newCategory[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCategory = await db.update(productCategories)
      .set({
        name: req.body.name,
        description: req.body.description || null,
        image: req.body.image || null,
        updatedAt: new Date().toISOString()
      })
      .where(eq(productCategories.id, parseInt(id)))
      .returning();
    
    if (updatedCategory.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(updatedCategory[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCategory = await db.delete(productCategories)
      .where(eq(productCategories.id, parseInt(id)))
      .returning();
    
    if (deletedCategory.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Users API
router.get('/users', async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const newUser = await db.insert(users).values({
      tenantId: 'default',
      ...req.body
    }).returning();
    
    res.json(newUser[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedUser = await db.update(users)
      .set(req.body)
      .where(eq(users.id, parseInt(id)))
      .returning();
    
    if (updatedUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(updatedUser[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await db.delete(users)
      .where(eq(users.id, parseInt(id)))
      .returning();
    
    if (deletedUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export { router as offlineApiRouter };
