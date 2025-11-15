import express, { Express, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Server, createServer } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, products, customers, suppliers, sales, saleItems } from "../shared/sqlite-schema.js";
import {
  loginSchema,
  InsertOrderItem,
  InsertInventoryAdjustmentItem,
  InsertOrder,
  InsertSale,
  InsertCustomer,
  InsertSupplier,
  InsertProduct,
  InsertProductCategory,
  InsertInventoryAdjustment,
  insertUserSchema,
  insertProductSchema,
  insertProductCategorySchema,
  insertCustomerSchema,
  insertSupplierSchema,
  insertSaleSchema,
  insertOrderSchema,
  insertInventoryAdjustmentSchema
} from "@shared/schema";

// Role-based access control middleware
const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    return next();
  };
};

// Tenant separation middleware - ensures all data access is restricted to user's tenant
const ensureTenantSeparation = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Set tenant ID in res.locals for use in routes
  res.locals.tenantId = req.user.tenantId;
  console.log(`Request authorized for tenant: ${req.user.tenantId}`);
  
  return next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware to parse JSON
  app.use(express.json());
  
  // Middleware to handle errors
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  });
  
  // Setup authentication (this adds /api/login, /api/logout, /api/register, and /api/user endpoints)
  setupAuth(app);
  
  // Debug endpoint to list all users in the database - FOR TESTING ONLY!
  app.get('/api/debug/users', async (req, res) => {
    try {
      // Get all users in the database
      const allUsers = await db.select().from(users);
      console.log(`Found ${allUsers.length} users in database`);
      
      // Return only public user info, not passwords
      const safeUsers = allUsers.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        tenantId: user.tenantId,
        role: user.role
      }));
      
      return res.json(safeUsers);
    } catch (error) {
      console.error("Error in debug endpoint:", error);
      return res.status(500).json({ message: "Server error", error: String(error) });
    }
  });
  
  // Add a special dev login endpoint for testing purposes
  app.post('/api/test-login', async (req, res) => {
    try {
      const { username, tenantId } = req.body;
      
      if (!username || !tenantId) {
        return res.status(400).json({ message: 'Username and tenantId are required' });
      }
      
      console.log(`Test login attempt for ${username} with tenant ${tenantId}`);
      
      // Let's add some extra debugging
      if (username === 'superadmin') {
        console.log('Trying direct superadmin login');
        
        // Try direct database query
        const result = await db.select().from(users).where(eq(users.username, 'superadmin')).limit(1);
        console.log('Direct database query result:', result);
        
        if (result.length > 0) {
          const userFromSql = result[0];
          console.log('User found via direct SQL. Logging in...');
          
          // Log in using the result from SQL
          req.login(userFromSql, (err) => {
            if (err) {
              console.error('SQL login error:', err);
              return res.status(500).json({ message: 'Error during SQL login' });
            }
            
            console.log(`Superadmin logged in via SQL`);
            return res.status(200).json(userFromSql);
          });
          return;
        } else {
          console.log('User not found even with direct SQL');
        }
      }
      
      // Try our ORM approach
      try {
        const allUsers = await db.select().from(users);
        console.log('All users in DB:', allUsers.map(u => `${u.id}: ${u.username} (${u.tenantId})`));
        
        // Manual search for matching username
        const matchingUsers = allUsers.filter(u => u.username === username);
        console.log('Matching users:', matchingUsers.length);
        
        if (matchingUsers.length > 0) {
          const user = matchingUsers[0];
          
          // Check tenant ID
          if (user.tenantId !== tenantId) {
            console.log(`TenantId mismatch: User: ${user.tenantId}, Provided: ${tenantId}`);
            return res.status(401).json({ message: 'Invalid tenant ID' });
          }
          
          // Log in the user directly
          req.login(user, (err) => {
            if (err) {
              console.error('Login error:', err);
              return res.status(500).json({ message: 'Error during login' });
            }
            
            console.log(`User ${username} logged in via manual search`);
            return res.status(200).json(user);
          });
          return;
        }
      } catch (error) {
        console.error('Error during ORM search:', error);
      }
      
      // If we get here, we couldn't find the user
      console.log(`User ${username} not found`);
      return res.status(401).json({ message: 'User not found' });
    } catch (error) {
      console.error('Test login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // User routes
  app.get('/api/users', authorize(['admin']), ensureTenantSeparation, async (req, res) => {
    try {
      console.log(`Getting users for tenant: ${req.user.tenantId}`);
      
      // Try direct SQL query first
      try {
        console.log('Trying direct database query for users');
        const result = await db.select().from(users).where(eq(users.tenantId, req.user.tenantId));
        console.log(`Direct database found ${result.length} users`);
        
        if (result.length > 0) {
          return res.json(result);
        }
      } catch (sqlError) {
        console.error('Error with direct SQL query for users:', sqlError);
      }
      
      // Then try ORM method
      try {
        console.log('Trying ORM method for users');
        const usersViaOrm = await storage.getUsersByTenant(req.user.tenantId);
        console.log(`ORM found ${usersViaOrm.length} users`);
        
        return res.json(usersViaOrm);
      } catch (ormError) {
        console.error('Error with ORM method for users:', ormError);
        throw ormError; // Re-throw to be caught by outer catch
      }
    } catch (error) {
      console.error("Error getting users:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/users/:id', authorize(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      // Only allow access to users in the same tenant
      if (!user || user.tenantId !== req.user.tenantId) {
        return res.status(404).json({ message: "User not found" });
      }
      
      return res.json(user);
    } catch (error) {
      console.error("Error getting user:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/users', authorize(['admin']), async (req, res) => {
    try {
      // Create new user with admin's tenant ID
      const userData = insertUserSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId, // Ensure the user is created in the same tenant
        businessName: req.user.businessName // Use the same business name as the admin
      });
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      return res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.patch('/api/users/:id', authorize(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the user to be updated
      const existingUser = await storage.getUser(id);
      
      // Check if user exists and belongs to admin's tenant
      if (!existingUser || existingUser.tenantId !== req.user.tenantId) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Handle password updates
      const updates = { ...req.body };
      
      // If password field is empty or not provided, remove it from updates
      if (!updates.password) {
        delete updates.password;
      }
      
      // Never allow changing tenant ID or username
      delete updates.tenantId;
      delete updates.username;
      
      const updatedUser = await storage.updateUser(id, updates);
      return res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete('/api/users/:id', authorize(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the user to be deleted
      const existingUser = await storage.getUser(id);
      
      // Check if user exists and belongs to admin's tenant
      if (!existingUser || existingUser.tenantId !== req.user.tenantId) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't allow deleting the last admin
      if (existingUser.role === 'admin') {
        const admins = (await storage.getUsersByTenant(req.user.tenantId))
          .filter(u => u.role === 'admin');
        
        if (admins.length <= 1) {
          return res.status(400).json({ message: "Cannot delete the last admin user" });
        }
      }
      
      // Check if the user is trying to delete themselves
      if (existingUser.id === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete user" });
      }
      
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Product routes
  app.get('/api/products', ensureTenantSeparation, async (req, res) => {
    try {
      const options = {
        search: req.query.search as string,
        category: req.query.category as string,
        lowStock: req.query.lowStock === 'true'
      };
      
      const products = await storage.getProducts(req.user.tenantId, options);
      
      // Log the tenant-based filtering
      console.log(`Found ${products.length} products for tenant ${req.user.tenantId}`);
      
      return res.json(products);
    } catch (error) {
      console.error("Error getting products:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/products/:id', ensureTenantSeparation, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id, req.user.tenantId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      return res.json(product);
    } catch (error) {
      console.error("Error getting product details:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/products', authorize(['admin', 'cashier']), async (req, res) => {
    try {
      const productData = insertProductSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId
      });
      
      const product = await storage.createProduct(productData);
      return res.status(201).json(product);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put('/api/products/:id', authorize(['admin', 'cashier']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const product = await storage.updateProduct(id, req.user.tenantId, updates);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      return res.json(product);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete('/api/products/:id', authorize(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProduct(id, req.user.tenantId);
      
      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Product Categories routes
  app.get('/api/product-categories', ensureTenantSeparation, async (req, res) => {
    try {
      const categories = await storage.getProductCategories(req.user.tenantId);
      console.log(`Found ${categories.length} product categories for tenant ${req.user.tenantId}`);
      return res.json(categories);
    } catch (error) {
      console.error("Error getting product categories:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/product-categories/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const category = await storage.getProductCategory(id, req.user.tenantId);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      return res.json(category);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/product-categories', authorize(['admin']), async (req, res) => {
    try {
      const categoryData = insertProductCategorySchema.parse({
        ...req.body,
        tenantId: req.user.tenantId
      });
      
      const category = await storage.createProductCategory(categoryData);
      return res.status(201).json(category);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put('/api/product-categories/:id', authorize(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const category = await storage.updateProductCategory(id, req.user.tenantId, updates);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      return res.json(category);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete('/api/product-categories/:id', authorize(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProductCategory(id, req.user.tenantId);
      
      if (!success) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Customer routes
  app.get('/api/customers', ensureTenantSeparation, async (req, res) => {
    try {
      const search = req.query.search as string;
      const customers = await storage.getCustomers(req.user.tenantId, search);
      console.log(`Found ${customers.length} customers for tenant ${req.user.tenantId}`);
      return res.json(customers);
    } catch (error) {
      console.error("Error getting customers:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/customers/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id, req.user.tenantId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      return res.json(customer);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/customers', authorize(['admin', 'cashier']), async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId
      });
      
      const customer = await storage.createCustomer(customerData);
      return res.status(201).json(customer);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put('/api/customers/:id', authorize(['admin', 'cashier']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const customer = await storage.updateCustomer(id, req.user.tenantId, updates);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      return res.json(customer);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Supplier routes
  app.get('/api/suppliers', ensureTenantSeparation, async (req, res) => {
    try {
      const search = req.query.search as string;
      const suppliers = await storage.getSuppliers(req.user.tenantId, search);
      console.log(`Found ${suppliers.length} suppliers for tenant ${req.user.tenantId}`);
      return res.json(suppliers);
    } catch (error) {
      console.error("Error getting suppliers:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/suppliers/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const supplier = await storage.getSupplier(id, req.user.tenantId);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      return res.json(supplier);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/suppliers', authorize(['admin']), async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId
      });
      
      const supplier = await storage.createSupplier(supplierData);
      return res.status(201).json(supplier);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Orders routes
  app.get('/api/orders', authorize(['admin']), async (req, res) => {
    try {
      const options = {
        status: req.query.status as string,
        supplierId: req.query.supplierId ? parseInt(req.query.supplierId as string) : undefined
      };
      
      const orders = await storage.getOrders(req.user.tenantId, options);
      return res.json(orders);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/orders/:id', authorize(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id, req.user.tenantId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      return res.json(order);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/orders', authorize(['admin']), async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse({
        ...req.body.order,
        tenantId: req.user.tenantId,
        date: new Date(),
        createdBy: req.user.id
      });
      
      const items = req.body.items;
      const order = await storage.createOrder(orderData, items);
      return res.status(201).json(order);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Sales routes
  app.get('/api/sales', ensureTenantSeparation, async (req, res) => {
    try {
      const options = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined
      };
      
      const sales = await storage.getSales(req.user.tenantId, options);
      console.log(`Found ${sales.length} sales for tenant ${req.user.tenantId}`);
      return res.json(sales);
    } catch (error) {
      console.error("Error getting sales:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/sales/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const sale = await storage.getSale(id, req.user.tenantId);
      
      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }
      
      return res.json(sale);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/sales', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const saleData = insertSaleSchema.parse({
        ...req.body.sale,
        tenantId: req.user.tenantId,
        date: new Date(),
        createdBy: req.user.id
      });
      
      const items = req.body.items;
      const sale = await storage.createSale(saleData, items);
      return res.status(201).json(sale);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Settings routes
  app.get('/api/settings', authorize(['admin']), ensureTenantSeparation, async (req, res) => {
    try {
      const settings = await storage.getSettings(req.user.tenantId);
      console.log(`Fetched settings for tenant ${req.user.tenantId}`);
      return res.json(settings || {});
    } catch (error) {
      console.error("Error getting settings:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put('/api/settings', authorize(['admin']), async (req, res) => {
    try {
      const settings = await storage.updateSettings(req.user.tenantId, req.body);
      return res.json(settings);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Dashboard route
  app.get('/api/dashboard', ensureTenantSeparation, async (req, res) => {
    try {
      const data = await storage.getDashboardData(req.user.tenantId);
      console.log(`Fetched dashboard data for tenant ${req.user.tenantId}`);
      return res.json(data);
    } catch (error) {
      console.error("Error getting dashboard data:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Reports route (admin only)
  app.get('/api/reports', authorize(['admin']), ensureTenantSeparation, async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "reports_admin_only" });
      }
      
      // Here you would typically generate and return reports
      // For now, we'll return a placeholder
      console.log(`Fetched reports for tenant ${req.user.tenantId}`);
      return res.json({
        salesByDay: [],
        topProducts: [],
        stockLevels: []
      });
    } catch (error) {
      console.error("Error getting reports:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Create a simple HttpServer instance
  const httpServer = createServer(app);

  return httpServer;
}