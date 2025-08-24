#!/usr/bin/env node

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Create data directory if it doesn't exist
const dataDir = join(process.cwd(), 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
  console.log('✅ Created data directory');
}

// SQLite database file path
const dbPath = join(dataDir, 'stocksage.db');

// Create SQLite connection
const sqlite = new Database(dbPath);

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');

// Create drizzle instance
const db = drizzle(sqlite);

try {
  // Run migrations
  console.log('🔄 Running database migrations...');
  migrate(db, { migrationsFolder: './drizzle' });
  console.log('✅ Database migrations completed successfully');
  
  // Check if database has data
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log(`✅ Database initialized with ${tables.length} tables`);
  
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
} finally {
  sqlite.close();
}

console.log('🎉 SQLite database ready at:', dbPath);
