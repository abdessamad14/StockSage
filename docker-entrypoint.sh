#!/bin/sh
set -e

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until nc -z postgres 5432; do
  sleep 1
done
echo "PostgreSQL is ready!"

# Push the database schema if needed
echo "Applying database migrations..."
npm run db:push

# Start the application
echo "Starting the application..."
exec npm start