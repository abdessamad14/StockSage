#!/bin/bash

# Set the environment variables
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/igoodar"
export SESSION_SECRET="local_development_secret"
export PORT=5001
export NODE_ENV=development

# Run the application
npm run dev