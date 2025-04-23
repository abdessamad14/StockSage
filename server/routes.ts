import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  loginSchema, 
  insertUserSchema,
  insertProductSchema,
  insertCustomerSchema, 
  insertSupplierSchema,
  insertSaleSchema,
  insertOrderSchema,
  insertInventoryAdjustmentSchema
} from "@shared/schema";
import { ZodError } from "zod";
import jwt from "jsonwebtoken";

// JWT secret - in production, this would be an environment variable
const JWT_SECRET = process.env.JWT_SECRET || "igoodar-stock-secret-key";

// Augment the Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        tenantId: string;
        role: string;
      };
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  const authenticate = async (req: Request, res: Response, next: Function) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number, tenantId: string, role: string };
      
      req.user = {
        id: decoded.userId,
        tenantId: decoded.tenantId,
        role: decoded.role
      };
      
      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
  
  // Role-based access middleware
  const authorize = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: Function) => {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      next();
    };
  };
  
  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const credentials = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(credentials.username);
      
      if (!user || user.password !== credentials.password) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // In a real app, we would verify the password hash here
      
      const token = jwt.sign(
        { userId: user.id, tenantId: user.tenantId, role: user.role },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      const settings = await storage.getSettings(user.tenantId);
      
      return res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          businessName: user.businessName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          tenantId: user.tenantId,
          language: settings?.language || 'fr'
        }
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // User routes
  app.get('/api/users', authenticate, authorize(['admin']), async (req, res) => {
    try {
      const users = Array.from(await storage.getUser(1) ? [await storage.getUser(1)] : []);
      return res.json(users);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/users', authenticate, authorize(['admin']), async (req, res) => {
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
  app.get('/api/products', authenticate, async (req, res) => {
    try {
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
  
  app.get('/api/products/:id', authenticate, async (req, res) => {
    try {
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
  
  app.post('/api/products', authenticate, authorize(['admin', 'cashier']), async (req, res) => {
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
  
  app.put('/api/products/:id', authenticate, authorize(['admin', 'cashier']), async (req, res) => {
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
  
  app.delete('/api/products/:id', authenticate, authorize(['admin']), async (req, res) => {
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
  app.get('/api/customers', authenticate, async (req, res) => {
    try {
      const search = req.query.search as string;
      const customers = await storage.getCustomers(req.user.tenantId, search);
      return res.json(customers);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/customers/:id', authenticate, async (req, res) => {
    try {
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
  
  app.post('/api/customers', authenticate, authorize(['admin', 'cashier']), async (req, res) => {
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
  
  app.put('/api/customers/:id', authenticate, authorize(['admin', 'cashier']), async (req, res) => {
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
  app.get('/api/suppliers', authenticate, async (req, res) => {
    try {
      const search = req.query.search as string;
      const suppliers = await storage.getSuppliers(req.user.tenantId, search);
      return res.json(suppliers);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/suppliers/:id', authenticate, async (req, res) => {
    try {
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
  
  app.post('/api/suppliers', authenticate, authorize(['admin']), async (req, res) => {
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
  
  // Sales routes
  app.get('/api/sales', authenticate, async (req, res) => {
    try {
      const options: any = {};
      
      if (req.query.startDate) {
        options.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        options.endDate = new Date(req.query.endDate as string);
      }
      
      if (req.query.customerId) {
        options.customerId = parseInt(req.query.customerId as string);
      }
      
      const sales = await storage.getSales(req.user.tenantId, options);
      return res.json(sales);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get('/api/sales/:id', authenticate, async (req, res) => {
    try {
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
  
  app.post('/api/sales', authenticate, authorize(['admin', 'cashier']), async (req, res) => {
    try {
      const { sale, items } = req.body;
      
      const saleData = insertSaleSchema.parse({
        ...sale,
        tenantId: req.user.tenantId,
        createdBy: req.user.id
      });
      
      const newSale = await storage.createSale(saleData, items);
      return res.status(201).json(newSale);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Orders routes
  app.get('/api/orders', authenticate, async (req, res) => {
    try {
      const options: any = {};
      
      if (req.query.status) {
        options.status = req.query.status as string;
      }
      
      if (req.query.supplierId) {
        options.supplierId = parseInt(req.query.supplierId as string);
      }
      
      const orders = await storage.getOrders(req.user.tenantId, options);
      return res.json(orders);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post('/api/orders', authenticate, authorize(['admin']), async (req, res) => {
    try {
      const { order, items } = req.body;
      
      const orderData = insertOrderSchema.parse({
        ...order,
        tenantId: req.user.tenantId,
        createdBy: req.user.id
      });
      
      const newOrder = await storage.createOrder(orderData, items);
      return res.status(201).json(newOrder);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.patch('/api/orders/:id/status', authenticate, authorize(['admin']), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['pending', 'received', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const order = await storage.updateOrderStatus(id, req.user.tenantId, status);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      return res.json(order);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Inventory routes
  app.post('/api/inventory/adjustments', authenticate, authorize(['admin']), async (req, res) => {
    try {
      const { adjustment, items } = req.body;
      
      const adjustmentData = insertInventoryAdjustmentSchema.parse({
        ...adjustment,
        tenantId: req.user.tenantId,
        createdBy: req.user.id
      });
      
      const newAdjustment = await storage.createInventoryAdjustment(adjustmentData, items);
      return res.status(201).json(newAdjustment);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Dashboard route
  app.get('/api/dashboard', authenticate, async (req, res) => {
    try {
      const dashboardData = await storage.getDashboardData(req.user.tenantId);
      return res.json(dashboardData);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Settings routes
  app.get('/api/settings', authenticate, async (req, res) => {
    try {
      const settings = await storage.getSettings(req.user.tenantId);
      return res.json(settings);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  app.put('/api/settings', authenticate, authorize(['admin']), async (req, res) => {
    try {
      const settings = await storage.updateSettings(req.user.tenantId, req.body);
      return res.json(settings);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Sync route
  app.post('/api/sync', authenticate, async (req, res) => {
    try {
      const { deviceId, entityType, data } = req.body;
      
      if (!deviceId || !entityType || !Array.isArray(data)) {
        return res.status(400).json({ message: "Invalid sync data" });
      }
      
      const success = await storage.syncData(req.user.tenantId, req.user.id, deviceId, entityType, data);
      
      if (!success) {
        return res.status(500).json({ message: "Sync failed" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Barcode lookup
  app.get('/api/products/barcode/:barcode', authenticate, async (req, res) => {
    try {
      const barcode = req.params.barcode;
      const product = await storage.getProductByBarcode(barcode, req.user.tenantId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      return res.json(product);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
