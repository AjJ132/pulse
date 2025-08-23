#!/bin/bash

# N8N Docker Startup Script
# This script helps manage your local n8n development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
PROJECT_NAME="n8n-local"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if required files exist
check_files() {
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        print_error "docker-compose.yml not found!"
        exit 1
    fi
    
    if [[ ! -f "$ENV_FILE" ]]; then
        print_error ".env file not found!"
        exit 1
    fi
    
    if [[ ! -f "init-data.sh" ]]; then
        print_warning "init-data.sh not found - database initialization may not work properly"
    fi
}

# Function to start n8n
start_n8n() {
    print_header "Starting N8N Development Environment"
    
    # Make sure init script is executable
    if [[ -f "init-data.sh" ]]; then
        chmod +x init-data.sh
    fi
    
    # Create custom_nodes directory if it doesn't exist
    if [[ ! -d "custom_nodes" ]]; then
        mkdir -p custom_nodes
        print_status "Created custom_nodes directory for custom n8n nodes"
    fi
    
    # Pull latest images
    print_status "Pulling latest Docker images..."
    docker-compose -f "$COMPOSE_FILE" --project-name "$PROJECT_NAME" pull
    
    # Start services
    print_status "Starting services..."
    docker-compose -f "$COMPOSE_FILE" --project-name "$PROJECT_NAME" up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to start..."
    sleep 10
    
    # Check if services are running
    if docker-compose -f "$COMPOSE_FILE" --project-name "$PROJECT_NAME" ps | grep -q "Up"; then
        print_status "Services started successfully!"
        print_status "N8N is available at: http://localhost:$(grep N8N_PORT .env | cut -d'=' -f2)"
        
        # Display login credentials if basic auth is enabled
        if grep -q "N8N_BASIC_AUTH_ACTIVE=true" .env; then
            AUTH_USER=$(grep N8N_BASIC_AUTH_USER .env | cut -d'=' -f2)
            AUTH_PASS=$(grep N8N_BASIC_AUTH_PASSWORD .env | cut -d'=' -f2)
            echo -e "${GREEN}Login Credentials:${NC}"
            echo -e "  Username: ${YELLOW}$AUTH_USER${NC}"
            echo -e "  Password: ${YELLOW}$AUTH_PASS${NC}"
        fi
    else
        print_error "Failed to start some services. Check logs with: $0 logs"
        exit 1
    fi
}

# Function to stop n8n
stop_n8n() {
    print_header "Stopping N8N Development Environment"
    docker-compose -f "$COMPOSE_FILE" --project-name "$PROJECT_NAME" down
    print_status "Services stopped successfully!"
}

# Function to restart n8n
restart_n8n() {
    print_header "Restarting N8N Development Environment"
    stop_n8n
    sleep 2
    start_n8n
}

# Function to show logs
show_logs() {
    if [[ $# -gt 1 ]]; then
        docker-compose -f "$COMPOSE_FILE" --project-name "$PROJECT_NAME" logs -f "$2"
    else
        docker-compose -f "$COMPOSE_FILE" --project-name "$PROJECT_NAME" logs -f
    fi
}

# Function to show status
show_status() {
    print_header "N8N Service Status"
    docker-compose -f "$COMPOSE_FILE" --project-name "$PROJECT_NAME" ps
}

# Function to backup data
backup_data() {
    print_header "Backing up N8N Data"
    BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup n8n data
    docker run --rm -v "${PROJECT_NAME}_n8n_data":/data -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/n8n_data.tar.gz -C /data .
    
    # Backup postgres data
    docker run --rm -v "${PROJECT_NAME}_postgres_data":/data -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .
    
    print_status "Backup created in: $BACKUP_DIR"
}

# Function to clean up everything
clean_all() {
    print_header "Cleaning up N8N Environment"
    print_warning "This will remove all containers, volumes, and data!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose -f "$COMPOSE_FILE" --project-name "$PROJECT_NAME" down -v --remove-orphans
        docker system prune -f
        print_status "Cleanup completed!"
    else
        print_status "Cleanup cancelled."
    fi
}

# Function to export for migration
export_for_migration() {
    print_header "Exporting N8N for Migration"
    
    if [[ -f "export-n8n.sh" ]]; then
        chmod +x export-n8n.sh
        ./export-n8n.sh complete
    else
        print_warning "export-n8n.sh script not found"
        print_status "Creating basic backup instead..."
        backup_data
    fi
}

# Function to show help
show_help() {
    echo -e "${BLUE}N8N Docker Management Script${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start     Start N8N and all services"
    echo "  stop      Stop all services"
    echo "  restart   Restart all services"
    echo "  status    Show service status"
    echo "  logs      Show logs (use 'logs [service]' for specific service)"
    echo "  backup    Backup all data"
    echo "  export    Export complete environment for migration"
    echo "  clean     Remove all containers and volumes"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 export        # Creates complete migration package"
    echo "  $0 logs n8n"
    echo "  $0 logs postgres"
    echo ""
}

# Main script logic
main() {
    check_files
    
    case "${1:-start}" in
        "start")
            start_n8n
            ;;
        "stop")
            stop_n8n
            ;;
        "restart")
            restart_n8n
            ;;
        "logs")
            show_logs "$@"
            ;;
        "status")
            show_status
            ;;
        "backup")
            backup_data
            ;;
        "export")
            export_for_migration
            ;;
        "clean")
            clean_all
            ;;
        "help")
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"