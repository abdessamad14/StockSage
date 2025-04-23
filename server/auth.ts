import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

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
          
          // Get the user by username
          const user = await storage.getUserByUsername(username);
          
          if (!user) {
            return done(null, false, { message: 'Invalid username or password' });
          }
          
          // If tenant ID is provided, check if it matches the user's tenant
          if (tenantId && user.tenantId !== tenantId) {
            return done(null, false, { message: 'Invalid company ID' });
          }
          
          // For demo purposes, allow direct password comparison
          if (password === user.password) {
            return done(null, user);
          }
          
          // In a production app, we would use password hashing
          // if (!(await comparePasswords(password, user.password))) {
          //   return done(null, false, { message: 'Invalid username or password' });
          // }
          
          return done(null, false, { message: 'Invalid username or password' });
        } catch (err) {
          return done(err);
        }
      }
    ),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const user = await storage.createUser({
        ...req.body,
        password: req.body.password, // In production: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: { message?: string }) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Authentication failed' });
      }
      
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        
        return res.status(200).json(user);
      });
    })(req, res, next);
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