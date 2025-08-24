import express from 'express';
import { db } from './db';
import { products, customers, suppliers, sales, saleItems, inventoryAdjustments, inventoryAdjustmentItems, orderItems } from '@shared/sqlite-schema';
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
    
    // Create the product
    const newProduct = await db.insert(products).values({
      tenantId: 'default',
      ...req.body
    }).returning();
    
    const product = newProduct[0];
    console.log('Product created:', product);
    
    // If product has initial quantity > 0, create stock history entry
    if (product.quantity > 0) {
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

router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedProduct = await db.update(products)
      .set(req.body)
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
    res.json(allSales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

router.post('/sales', async (req, res) => {
  try {
    const { items, ...saleData } = req.body;
    
    // Create sale
    const newSale = await db.insert(sales).values({
      tenantId: 'default',
      ...saleData
    }).returning();
    
    // Create sale items
    if (items && items.length > 0) {
      const saleItemsData = items.map((item: any) => ({
        tenantId: 'default',
        saleId: newSale[0].id,
        ...item
      }));
      
      await db.insert(saleItems).values(saleItemsData);
    }
    
    res.json(newSale[0]);
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

export { router as offlineApiRouter };
