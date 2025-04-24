#!/bin/bash

# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)

# Optional: Apply database schema
echo "Do you want to initialize/update the database schema? (y/n)"
read answer
if [ "$answer" = "y" ]; then
  echo "Applying database schema..."
  node push-schema.ts
fi

# Start the application
echo "Starting the application..."
npm run dev