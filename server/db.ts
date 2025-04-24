// Import the schema
import * as schema from "@shared/schema";

console.log("Current environment variables:");
console.log("DATABASE_URL:", process.env.DATABASE_URL);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Determine if we're running locally or in the cloud
const isLocalEnvironment = process.env.DATABASE_URL.includes('localhost') || 
                          process.env.DATABASE_URL.includes('127.0.0.1') ||
                          process.env.DATABASE_URL.includes('postgres:5432');

const isReplitEnvironment = process.env.REPL_ID !== undefined || 
                           process.env.REPL_OWNER !== undefined;

console.log(`Database connection: ${isLocalEnvironment ? 'Local PostgreSQL' : 'Neon Database'}`);
console.log(`Environment: ${isReplitEnvironment ? 'Replit' : 'Local'}`);

let pool;
let db;

if (isReplitEnvironment || !isLocalEnvironment) {
  // For Replit or other cloud environments using Neon Database
  console.log('Using Neon Database connection');
  import('@neondatabase/serverless').then(async (neonModule) => {
    const { Pool, neonConfig } = neonModule;
    // Import ws for WebSocket support in Neon
    const ws = await import('ws').then(m => m.default);
    neonConfig.webSocketConstructor = ws;
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Import drizzle for Neon
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    db = drizzle(pool, { schema });
  });
} else {
  // For local development with standard PostgreSQL
  console.log('Using standard PostgreSQL connection for local development');
  import('pg').then(async (pgModule) => {
    console.log('pgModule:', pgModule);
    const { Pool } = pgModule.default || pgModule;
    console.log('Pool constructor:', typeof Pool);
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Import drizzle for node-postgres
    const { drizzle } = await import('drizzle-orm/node-postgres');
    db = drizzle(pool, { schema });
  });
}

// Export the pool and db for use in the application
export { pool, db };