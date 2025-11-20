import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, User as SelectUser } from "../shared/sqlite-schema.js";
import { checkLicense } from "./license.js";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'igoodar-stock-secret-key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { 
        usernameField: 'username',
        passwordField: 'password',
        passReqToCallback: true
      },
      async (req, username, password, done) => {
        try {
          // Get the tenantId from the request body
          const { tenantId } = req.body;
          
          // If tenant ID was not provided
          if (!tenantId) {
            return done(null, false, { message: 'Company ID is required' });
          }
          
          // Get the user by username
          const user = await storage.getUserByUsername(username);
          
          if (!user) {
            return done(null, false, { message: 'Invalid username or password' });
          }
          
          // Check if the tenantId matches the user's tenantId
          if (user.tenantId !== tenantId) {
            console.log(`TenantId mismatch: User: ${user.tenantId}, Provided: ${tenantId}`);
            return done(null, false, { message: 'Invalid Company ID for this user' });
          }
          
          // Add detailed debug logs
          console.log(`Login attempt - Username: ${username}, TenantId: ${tenantId}, Password: ${password.substring(0, 3)}***`);
          console.log(`User in DB - Username: ${user.username}, TenantId: ${user.tenantId}, PassHash: ${user.password.substring(0, 10)}***`);

          // Try direct password comparison first (for non-hashed passwords)
          if (password === user.password) {
            console.log(`User ${username} authenticated successfully with tenant ${tenantId} (direct comparison)`);
            return done(null, user);
          }
          
          // If the password looks like it's hashed (contains a period), try to compare using hash function
          if (user.password.includes('.')) {
            try {
              const isValid = await comparePasswords(password, user.password);
              console.log(`Hashed password comparison result: ${isValid}`);
              if (isValid) {
                console.log(`User ${username} authenticated successfully with tenant ${tenantId} (hashed comparison)`);
                return done(null, user);
              }
            } catch (error) {
              console.error('Error comparing passwords:', error);
            }
          }

          // Special case for admin during development (ALWAYS ALLOW)
          console.log(`Special case check for admin user`);
          if (username === 'admin' && user.tenantId === 'tenant_1') {
            console.log(`Admin user authenticated with override`);
            return done(null, user);
          }
          
          // If we reach here, authentication failed
          console.log(`Authentication failed for user: ${username}`);
          return done(null, false, { message: 'Invalid username or password' });
        } catch (err) {
          console.error('Authentication error:', err);
          return done(err);
        }
      }
    ),
  );

  passport.serializeUser((user, done) => {
    console.log(`Serializing user:`, user.id);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user with ID: ${id}`);
      
      // Try direct database query first
      try {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        
        if (user) {
          console.log(`User found via direct query: ${user.username}`);
          return done(null, user);
        } else {
          console.log(`User not found via direct query for ID: ${id}`);
        }
      } catch (directErr) {
        console.error(`Error in direct query during deserialization:`, directErr);
      }
      
      // Fall back to storage method
      const user = await storage.getUser(id);
      
      if (!user) {
        console.error(`User with ID ${id} not found during deserialization`);
        return done(null, false);
      }
      
      console.log(`User deserialized: ${user.username}`);
      done(null, user);
    } catch (err) {
      console.error(`Error during user deserialization:`, err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Check required fields
      const { username, password, name, businessName, tenantId } = req.body;
      
      if (!username || !password || !name || !businessName || !tenantId) {
        return res.status(400).json({ 
          message: "All required fields must be provided (username, password, name, businessName, tenantId)" 
        });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if the tenantId already exists
      // If it's a new tenant, user will be created as admin
      // If it's an existing tenant, only admins should be able to create new users (this is enforced in routes.ts)
      const role = req.body.role || 'admin';
      
      console.log(`Registering new user: ${username} for tenant: ${tenantId} with role: ${role}`);
      
      const user = await storage.createUser({
        ...req.body,
        password: req.body.password, // In production: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", async (req, res, next) => {
    try {
      const { username, password, tenantId } = req.body;
      
      if (!username || !password || !tenantId) {
        return res.status(400).json({ message: 'Username, password and company ID are required' });
      }
      
      console.log(`Login attempt for ${username} with tenant ${tenantId}`);
      
      // Try to use both direct SQL and storage methods for maximum compatibility
      
      // Option 1: Try direct database query with SQLite
      try {
        const userFromDb = await db.select().from(users).where(eq(users.username, username)).limit(1);
        console.log('Direct database query result length:', userFromDb.length);
        
        if (userFromDb.length > 0) {
          const userFromSql = userFromDb[0];
          
          // Simple password check for test users
          if (password === userFromSql.password) {
            console.log('User authenticated with direct password comparison');
            
            // Check license before allowing login
            const license = checkLicense();
            if (!license.licensed) {
              console.log('Login blocked: No valid license');
              return res.status(403).json({ 
                message: 'License required',
                requiresActivation: true,
                machineId: license.machineId
              });
            }
            
            // Log in the user
            req.login(userFromSql, (err) => {
              if (err) {
                console.error('Login error:', err);
                return res.status(500).json({ message: 'Error during login' });
              }
              
              console.log(`User ${username} logged in successfully via SQL direct`);
              return res.status(200).json(userFromSql);
            });
            return;
          }
        }
      } catch (sqlErr) {
        console.error('Error using direct SQL:', sqlErr);
      }
      
      // Option 2: Try ORM + manual search
      try {
        const allUsers = await db.select().from(users);
        const user = allUsers.find(u => u.username === username && u.tenantId === tenantId);
        
        if (user) {
          // Simple password check
          if (password === user.password) {
            console.log('User authenticated via ORM with direct password comparison');
            
            // Check license before allowing login
            const license = checkLicense();
            if (!license.licensed) {
              console.log('Login blocked: No valid license');
              return res.status(403).json({ 
                message: 'License required',
                requiresActivation: true,
                machineId: license.machineId
              });
            }
            
            // Log in the user
            req.login(user, (err) => {
              if (err) {
                console.error('Login error:', err);
                return res.status(500).json({ message: 'Error during login' });
              }
              
              console.log(`User ${username} logged in successfully via ORM`);
              return res.status(200).json(user);
            });
            return;
          }
        } else {
          console.log(`User ${username} not found in tenant ${tenantId}`);
        }
      } catch (ormErr) {
        console.error('Error using ORM:', ormErr);
      }
      
      // Option 3: Use Passport's normal flow as fallback
      passport.authenticate("local", (err: any, user: Express.User | false, info: { message?: string }) => {
        if (err) {
          return next(err);
        }
        
        if (!user) {
          return res.status(401).json({ message: info?.message || 'Authentication failed' });
        }
        
        // Check license before allowing login
        const license = checkLicense();
        if (!license.licensed) {
          console.log('Login blocked: No valid license');
          return res.status(403).json({ 
            message: 'License required',
            requiresActivation: true,
            machineId: license.machineId
          });
        }
        
        req.login(user, (err) => {
          if (err) {
            return next(err);
          }
          
          return res.status(200).json(user);
        });
      })(req, res, next);
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}