#!/bin/bash

# Define colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Detect environment
if [ -n "$REPL_ID" ] && [ -n "$REPL_OWNER" ]; then
  ENV="replit"
else
  ENV="local"
fi

echo -e "${YELLOW}Detected environment: ${ENV}${NC}"

# Replit environment setup
if [ "$ENV" == "replit" ]; then
  echo -e "${BLUE}Setting up for Replit environment...${NC}"
  node scripts/replit-setup.js
  echo -e "${GREEN}Setup complete! The application will start via the Replit workflow.${NC}"
# Local environment setup
else
  echo -e "${BLUE}Setting up for local environment...${NC}"
  
  # Check if we want to use Docker
  if [ "$1" == "docker" ]; then
    echo -e "${BLUE}Setting up with Docker...${NC}"
    
    # Development or production mode
    if [ "$2" == "dev" ]; then
      echo -e "${BLUE}Using development mode...${NC}"
      ./scripts/start-docker.sh dev
    else
      echo -e "${BLUE}Using production mode...${NC}"
      ./scripts/start-docker.sh
    fi
  else
    # Standard setup without Docker
    echo -e "${BLUE}Setting up without Docker...${NC}"
    node scripts/setup-environment.js
    
    echo -e "${GREEN}Setup complete! Start the application with:${NC}"
    echo -e "npm run dev"
  fi
fi