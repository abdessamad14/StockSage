import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "../shared/sqlite-schema.js";
import { getDatabasePath, getUserDataPath } from "./user-data-path.js";

// Use safe user data path (persists across updates)
const userDataPath = getUserDataPath();
console.log(`📁 User data directory: ${userDataPath}`);

// SQLite database file path (in safe location)
const dbPath = getDatabasePath();
console.log(`🗄️  Database path: ${dbPath}`);

// Create SQLite connection
const sqlite = new Database(dbPath);

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');

// Create drizzle instance
export const db = drizzle(sqlite, { schema });

// Export sqlite instance for direct queries if needed
export { sqlite };