#!/bin/bash

# Define colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to detect environment
detect_environment() {
  if [ -n "$REPL_ID" ] && [ -n "$REPL_OWNER" ]; then
    echo "replit"
  else
    echo "local"
  fi
}

# Function to load environment variables
load_env() {
  if [ -f .env ]; then
    echo -e "${BLUE}Loading environment variables from .env file${NC}"
    set -a
    source .env
    set +a
  fi
}

# Initialize environment variables
load_env

# Detect environment
ENV=$(detect_environment)
echo -e "${YELLOW}Detected environment: ${ENV}${NC}"

# Stop any existing containers
echo -e "${BLUE}Stopping any existing containers...${NC}"
docker-compose down

if [ "$ENV" == "replit" ]; then
  # Replit-specific configuration
  echo -e "${YELLOW}Configuring for Replit environment...${NC}"
  
  # Ensure database is set up
  if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}No DATABASE_URL found. Using default PostgreSQL configuration.${NC}"
    export POSTGRES_USER=postgres
    export POSTGRES_PASSWORD=postgres
    export POSTGRES_DB=igoodar
    export DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/$POSTGRES_DB"
  fi
  
  # Start database only
  echo -e "${BLUE}Starting PostgreSQL database...${NC}"
  docker-compose up -d postgres
  
  # Wait for PostgreSQL to be ready
  echo -e "${BLUE}Waiting for PostgreSQL to be ready...${NC}"
  docker-compose run --rm db-setup
  
  echo -e "${GREEN}Database is ready. Use the Replit workflow to start the application.${NC}"
else
  # Local environment
  echo -e "${YELLOW}Configuring for local environment...${NC}"
  
  # Check if we want development or production mode
  if [ "$1" == "dev" ]; then
    # Start development mode with volumes for live reloading
    echo -e "${BLUE}Starting in DEVELOPMENT mode...${NC}"
    docker-compose --profile dev up -d --build
  else
    # Start production mode
    echo -e "${BLUE}Starting in PRODUCTION mode...${NC}"
    docker-compose --profile prod up -d --build
  fi
  
  echo -e "${GREEN}🚀 iGoodar Stock is now running!${NC}"
  echo -e "Access the application at http://localhost:${PORT:-5000}"
fi

echo -e "\n${BLUE}Default login credentials:${NC}"
echo -e "- Administrator: superadmin / admin123 (tenant_1)"
echo -e "- Demo User: demo / demo123 (demo-tenant)"
echo -e "\n${BLUE}Useful commands:${NC}"
echo -e "- View logs: docker-compose logs -f"
echo -e "- Stop the application: docker-compose down"
echo -e "- Development mode: ./scripts/start-docker.sh dev"