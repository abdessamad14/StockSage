import express, { Express, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Server, createServer } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import {
  Product,
  Customer,
  Supplier,
  ProductWithStockStatus,
  loginSchema,
  SaleWithItems,
  OrderWithItems,
  InventoryAdjustment,
  Settings,
  Sale,
  Order,
  InsertSaleItem,
  InsertOrderItem,
  InsertInventoryAdjustmentItem,
  InsertOrder,
  InsertSale,
  InsertCustomer,
  InsertSupplier,
  InsertProduct,
  InsertInventoryAdjustment,
  insertUserSchema,
  insertProductSchema,
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
  
  // User routes
  app.get('/api/users', authorize(['admin']), async (req, res) => {
    try {
      const users = Array.from(await storage.getUser(1) ? [await storage.getUser(1)] : []);
      return res.json(users);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/users', authorize(['admin']), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      return res.status(201).json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Product routes
  app.get('/api/products', async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const options = {
        search: req.query.search as string,
        category: req.query.category as string,
        lowStock: req.query.lowStock === 'true'
      };
      
      const products = await storage.getProducts(req.user.tenantId, options);
      return res.json(products);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/products/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id, req.user.tenantId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      return res.json(product);
    } catch (error) {
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
  
  // Customer routes
  app.get('/api/customers', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const search = req.query.search as string;
      const customers = await storage.getCustomers(req.user.tenantId, search);
      return res.json(customers);
    } catch (error) {
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
  app.get('/api/suppliers', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const search = req.query.search as string;
      const suppliers = await storage.getSuppliers(req.user.tenantId, search);
      return res.json(suppliers);
    } catch (error) {
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
  app.get('/api/sales', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const options = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined
      };
      
      const sales = await storage.getSales(req.user.tenantId, options);
      return res.json(sales);
    } catch (error) {
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
  app.get('/api/settings', authorize(['admin']), async (req, res) => {
    try {
      const settings = await storage.getSettings(req.user.tenantId);
      return res.json(settings || {});
    } catch (error) {
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
  app.get('/api/dashboard', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const data = await storage.getDashboardData(req.user.tenantId);
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Reports route (admin only)
  app.get('/api/reports', authorize(['admin']), async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "reports_admin_only" });
      }
      
      // Here you would typically generate and return reports
      // For now, we'll return a placeholder
      return res.json({
        salesByDay: [],
        topProducts: [],
        stockLevels: []
      });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Create a simple HttpServer instance
  const httpServer = createServer(app);

  return httpServer;
}