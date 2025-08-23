#!/bin/bash

# N8N Export Script
# Creates a complete backup package that can be imported on another machine

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_NAME="n8n-local"
EXPORT_DIR="n8n-export-$(date +%Y%m%d_%H%M%S)"

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

# Function to export everything
export_complete() {
    print_header "Creating Complete N8N Export Package"
    
    # Create export directory
    mkdir -p "$EXPORT_DIR"
    
    print_status "Export directory: $EXPORT_DIR"
    
    # 1. Copy configuration files
    print_status "Copying configuration files..."
    cp docker-compose.yml "$EXPORT_DIR/"
    cp .env "$EXPORT_DIR/"
    cp init-data.sh "$EXPORT_DIR/"
    cp start-n8n.sh "$EXPORT_DIR/"
    if [[ -f README.md ]]; then
        cp README.md "$EXPORT_DIR/"
    fi
    
    # Copy custom nodes if they exist
    if [[ -d custom_nodes ]]; then
        cp -r custom_nodes "$EXPORT_DIR/"
        print_status "Copied custom nodes directory"
    fi
    
    # 2. Export workflows via n8n CLI (if accessible)
    print_status "Attempting to export workflows via API..."
    export_workflows_api "$EXPORT_DIR"
    
    # 3. Create database backup
    print_status "Creating database backup..."
    docker exec "${PROJECT_NAME}_postgres_1" pg_dump -U n8n_user -d n8n --no-password > "$EXPORT_DIR/database_backup.sql" 2>/dev/null || \
    docker exec n8n_postgres pg_dump -U n8n_user -d n8n --no-password > "$EXPORT_DIR/database_backup.sql" || \
    print_warning "Could not create database backup - container may not be running"
    
    # 4. Backup Docker volumes
    print_status "Creating volume backups..."
    
    # Backup n8n data volume
    docker run --rm -v "${PROJECT_NAME}_n8n_data":/data -v "$(pwd)/$EXPORT_DIR":/backup alpine tar czf /backup/n8n_data_volume.tar.gz -C /data . 2>/dev/null || \
    print_warning "Could not backup n8n data volume"
    
    # Backup postgres data volume  
    docker run --rm -v "${PROJECT_NAME}_postgres_data":/data -v "$(pwd)/$EXPORT_DIR":/backup alpine tar czf /backup/postgres_data_volume.tar.gz -C /data . 2>/dev/null || \
    print_warning "Could not backup postgres data volume"
    
    # 5. Create import script
    create_import_script "$EXPORT_DIR"
    
    # 6. Create package info
    create_package_info "$EXPORT_DIR"
    
    # 7. Create final archive
    print_status "Creating final archive..."
    tar czf "${EXPORT_DIR}.tar.gz" "$EXPORT_DIR"
    
    print_status "Export completed successfully!"
    echo -e "${GREEN}Package created: ${YELLOW}${EXPORT_DIR}.tar.gz${NC}"
    echo -e "${GREEN}Directory: ${YELLOW}${EXPORT_DIR}/${NC}"
    
    echo ""
    print_header "Export Contents"
    ls -la "$EXPORT_DIR/"
    
    echo ""
    print_header "Next Steps"
    echo "1. Copy ${EXPORT_DIR}.tar.gz to your target machine"
    echo "2. Extract: tar xzf ${EXPORT_DIR}.tar.gz"
    echo "3. Run: cd ${EXPORT_DIR} && ./import-n8n.sh"
}

# Function to export workflows via API
export_workflows_api() {
    local export_dir="$1"
    
    # Get credentials from .env
    local auth_user=$(grep N8N_BASIC_AUTH_USER .env 2>/dev/null | cut -d'=' -f2 || echo "admin")
    local auth_pass=$(grep N8N_BASIC_AUTH_PASSWORD .env 2>/dev/null | cut -d'=' -f2 || echo "admin123")
    local n8n_port=$(grep N8N_PORT .env 2>/dev/null | cut -d'=' -f2 || echo "5678")
    
    # Try to export workflows
    mkdir -p "$export_dir/workflows"
    
    # Check if n8n is running and accessible
    if curl -s --fail "http://localhost:$n8n_port/healthz" > /dev/null 2>&1; then
        print_status "N8N is running, attempting to export workflows..."
        
        # Get all workflows
        local workflows=$(curl -s -u "$auth_user:$auth_pass" "http://localhost:$n8n_port/api/v1/workflows" 2>/dev/null || echo '{"data":[]}')
        
        if echo "$workflows" | jq '.data' > /dev/null 2>&1; then
            echo "$workflows" > "$export_dir/workflows/all_workflows.json"
            
            # Export individual workflows
            echo "$workflows" | jq -r '.data[].id' | while read -r workflow_id; do
                if [[ -n "$workflow_id" && "$workflow_id" != "null" ]]; then
                    workflow_data=$(curl -s -u "$auth_user:$auth_pass" "http://localhost:$n8n_port/api/v1/workflows/$workflow_id" 2>/dev/null)
                    if [[ -n "$workflow_data" ]]; then
                        workflow_name=$(echo "$workflow_data" | jq -r '.name' | sed 's/[^a-zA-Z0-9._-]/_/g')
                        echo "$workflow_data" > "$export_dir/workflows/workflow_${workflow_id}_${workflow_name}.json"
                    fi
                fi
            done
            
            print_status "Exported workflows via API"
        else
            print_warning "Could not parse workflows from API response"
        fi
    else
        print_warning "N8N is not accessible - workflows not exported via API"
    fi
}

# Function to create import script
create_import_script() {
    local export_dir="$1"
    
    cat > "$export_dir/import-n8n.sh" << 'EOF'
#!/bin/bash

# N8N Import Script
# Restores a complete n8n environment from backup

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_header "N8N Environment Import"

# Check if we're in the right directory
if [[ ! -f "docker-compose.yml" ]]; then
    echo -e "${RED}Error: docker-compose.yml not found. Are you in the right directory?${NC}"
    exit 1
fi

# Make scripts executable
chmod +x start-n8n.sh 2>/dev/null || true

# Stop any running containers
print_status "Stopping any existing containers..."
./start-n8n.sh stop 2>/dev/null || true

# Import volume data if available
if [[ -f "n8n_data_volume.tar.gz" ]]; then
    print_status "Restoring n8n data volume..."
    docker volume create n8n-local_n8n_data 2>/dev/null || true
    docker run --rm -v n8n-local_n8n_data:/data -v "$(pwd)":/backup alpine tar xzf /backup/n8n_data_volume.tar.gz -C /data
fi

if [[ -f "postgres_data_volume.tar.gz" ]]; then
    print_status "Restoring postgres data volume..."
    docker volume create n8n-local_postgres_data 2>/dev/null || true
    docker run --rm -v n8n-local_postgres_data:/data -v "$(pwd)":/backup alpine tar xzf /backup/postgres_data_volume.tar.gz -C /data
fi

# Start services
print_status "Starting services..."
./start-n8n.sh start

# Wait for services to be ready
sleep 15

# Import database if volume restore didn't work
if [[ -f "database_backup.sql" ]] && ! docker volume ls | grep -q "n8n-local_postgres_data"; then
    print_status "Importing database backup..."
    sleep 5
    docker exec -i n8n_postgres psql -U n8n_user -d n8n < database_backup.sql || \
    print_warning "Database import failed - this is normal if volume restore worked"
fi

# Import workflows if available
if [[ -d "workflows" ]] && [[ -f "workflows/all_workflows.json" ]]; then
    print_status "Workflow files available in ./workflows/ directory"
    print_status "You can manually import them via the n8n interface"
fi

print_header "Import Complete!"
echo -e "${GREEN}N8N should be available at: http://localhost:$(grep N8N_PORT .env | cut -d'=' -f2)${NC}"

if grep -q "N8N_BASIC_AUTH_ACTIVE=true" .env; then
    AUTH_USER=$(grep N8N_BASIC_AUTH_USER .env | cut -d'=' -f2)
    AUTH_PASS=$(grep N8N_BASIC_AUTH_PASSWORD .env | cut -d'=' -f2)
    echo -e "${GREEN}Login credentials:${NC}"
    echo -e "  Username: ${YELLOW}$AUTH_USER${NC}"
    echo -e "  Password: ${YELLOW}$AUTH_PASS${NC}"
fi

echo ""
echo "Next steps:"
echo "1. Open http://localhost:$(grep N8N_PORT .env | cut -d'=' -f2) in your browser"
echo "2. If workflows weren't automatically imported, use Settings → Import in n8n"
echo "3. Check that all your workflows and data are present"
EOF
    
    chmod +x "$export_dir/import-n8n.sh"
}

# Function to create package info
create_package_info() {
    local export_dir="$1"
    
    cat > "$export_dir/EXPORT_INFO.txt" << EOF
N8N Export Package Information
==============================

Export Date: $(date)
Exported From: $(hostname)
Export Directory: $export_dir

Package Contents:
================
- docker-compose.yml: Docker services configuration
- .env: Environment variables and configuration
- init-data.sh: Database initialization script  
- start-n8n.sh: Management script
- import-n8n.sh: Import/restore script (CREATED)
- database_backup.sql: PostgreSQL database backup
- n8n_data_volume.tar.gz: N8N data volume backup
- postgres_data_volume.tar.gz: PostgreSQL data volume backup
- workflows/: Individual workflow exports (if available)
- custom_nodes/: Custom node packages (if any)

Import Instructions:
===================
1. Copy this entire directory to target machine
2. Ensure Docker and Docker Compose are installed
3. Run: chmod +x import-n8n.sh && ./import-n8n.sh
4. Access n8n at http://localhost:$(grep N8N_PORT .env 2>/dev/null | cut -d'=' -f2 || echo "5678")

Notes:
======
- Database backup may be empty if containers weren't running during export
- Volume backups are the most reliable restore method
- Workflows directory contains JSON exports that can be manually imported
- Custom nodes will be automatically available after import

Environment Variables:
=====================
$(cat .env 2>/dev/null || echo "No .env file found")
EOF
}

# Function to export only workflows
export_workflows_only() {
    print_header "Exporting Workflows Only"
    
    local workflows_dir="workflows-export-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$workflows_dir"
    
    export_workflows_api "$workflows_dir"
    
    if [[ -d "$workflows_dir/workflows" ]] && [[ "$(ls -A $workflows_dir/workflows 2>/dev/null)" ]]; then
        print_status "Workflows exported to: $workflows_dir/"
        tar czf "${workflows_dir}.tar.gz" "$workflows_dir"
        print_status "Archive created: ${workflows_dir}.tar.gz"
    else
        print_warning "No workflows were exported"
        rmdir "$workflows_dir" 2>/dev/null || true
    fi
}

# Function to show current status
show_export_status() {
    print_header "Export Status Information"
    
    echo "Docker Containers:"
    docker-compose ps 2>/dev/null || echo "No containers running"
    
    echo ""
    echo "Docker Volumes:"
    docker volume ls | grep -E "(n8n|postgres)" || echo "No n8n volumes found"
    
    echo ""
    echo "Configuration Files:"
    ls -la docker-compose.yml .env init-data.sh start-n8n.sh 2>/dev/null || echo "Some config files missing"
    
    if [[ -d custom_nodes ]]; then
        echo ""
        echo "Custom Nodes:"
        ls -la custom_nodes/
    fi
}

# Main function
main() {
    case "${1:-complete}" in
        "complete"|"full")
            export_complete
            ;;
        "workflows"|"flows")
            export_workflows_only
            ;;
        "status"|"info")
            show_export_status
            ;;
        "help")
            echo "N8N Export Script Usage:"
            echo ""
            echo "  $0 complete    - Export everything (default)"
            echo "  $0 workflows   - Export only workflows"
            echo "  $0 status      - Show export status"
            echo "  $0 help        - Show this help"
            echo ""
            ;;
        *)
            echo "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

main "$@"