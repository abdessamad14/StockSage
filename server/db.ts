import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "../shared/sqlite-schema.js";
import { join } from 'path';
import { existsSync } from 'fs';

// Determine database path (production or development)
let userDataPath: string;
let dbPath: string;

// Check if we're in development mode (source files exist)
const isDevMode = existsSync(join(process.cwd(), 'server', 'db.ts')) ||
                  existsSync(join(process.cwd(), 'tsconfig.json'));

if (isDevMode) {
  // Development mode: use local data folder
  userDataPath = join(process.cwd(), 'data');
  dbPath = join(userDataPath, 'stocksage.db');
  console.log(`📁 Development mode - using local data folder: ${userDataPath}`);
  console.log(`🗄️  Database path: ${dbPath}`);
} else {
  // Production mode: use safe user data path
  // This import will work in production because user-data-path.js exists
  const { getDatabasePath, getUserDataPath } = await import("./user-data-path.js");
  userDataPath = getUserDataPath();
  dbPath = getDatabasePath();
  console.log(`📁 User data directory: ${userDataPath}`);
  console.log(`🗄️  Database path: ${dbPath}`);
}

// Create SQLite connection
const sqlite = new Database(dbPath);

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');

// Create drizzle instance
export const db = drizzle(sqlite, { schema });

// Export sqlite instance for direct queries if needed
export { sqlite };