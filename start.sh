#!/bin/bash
set -e

echo "Starting StockSage Inventory System..."

if [ ! -d "node_modules" ] || [ ! -d "dist/public" ]; then
  echo "Running initial setup (this may take a moment)..."
  npm run setup
else
  echo "Dependencies and build artefacts detected. Skipping setup."
fi

echo "Launching application..."
npm start
