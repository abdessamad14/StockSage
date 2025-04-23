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
    if (!req.isAuthenticated()) {
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
      if (!req.isAuthenticated()) {
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

  // Create a simple HttpServer instance
  const httpServer = createServer(app);

  return httpServer;
}