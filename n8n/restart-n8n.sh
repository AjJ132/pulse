#!/bin/bash

# Simple N8N Docker Restart Script
# This script restarts all n8n Docker containers

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="n8n"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if docker-compose.yml exists
if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo -e "${YELLOW}[ERROR]${NC} docker-compose.yml not found!"
    exit 1
fi

# Main restart function
restart_containers() {
    print_header "Restarting N8N Docker Containers"
    
    print_status "Stopping all services..."
    docker-compose -f "$COMPOSE_FILE" --project-name "$PROJECT_NAME" down --remove-orphans
    
    print_status "Starting all services..."
    docker-compose -f "$COMPOSE_FILE" --project-name "$PROJECT_NAME" up -d
    
    print_status "Waiting for services to be ready..."
    sleep 10
    
    # Check if services are running
    if docker-compose -f "$COMPOSE_FILE" --project-name "$PROJECT_NAME" ps | grep -q "Up"; then
        print_status "Services restarted successfully!"
        print_status "N8N is available at: http://localhost:$(grep N8N_PORT .env | cut -d'=' -f2 2>/dev/null || echo '5678')"
    else
        echo -e "${YELLOW}[WARNING]${NC} Some services may not be running properly. Check with: docker-compose ps"
    fi
}

# Run the restart
restart_containers
