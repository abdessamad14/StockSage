const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const postgres = require('postgres');
const path = require('path');

async function main() {
  console.log('Starting database initialization...');
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  // Connect to the database
  console.log('Connecting to database...');
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);
  
  // Run migrations
  console.log('Running database migrations...');
  try {
    await migrate(db, { migrationsFolder: path.join(__dirname, 'migrations') });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  console.log('Database initialization completed successfully');
  process.exit(0);
}

main().catch((err) => {
  console.error('Unhandled error during database initialization:', err);
  process.exit(1);
});