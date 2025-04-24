#!/bin/bash

# Stop any existing containers
echo "Stopping any existing containers..."
docker-compose down

# Build and start all services
echo "Building and starting all services..."
docker-compose up -d --build

echo ""
echo "🚀 iGoodar Stock is now running!"
echo "Access the application at http://localhost:5000"
echo ""
echo "Default login credentials:"
echo "- Administrator: superadmin / admin123 (tenant_1)"
echo "- Demo User: demo / demo123 (demo-tenant)"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop the application: docker-compose down"