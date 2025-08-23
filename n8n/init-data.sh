#!/bin/bash
set -e

# This script initializes the PostgreSQL database for n8n
# It will be executed when the PostgreSQL container starts for the first time

echo "Initializing n8n database..."

# Create the database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Grant all privileges to the n8n user
    GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;
    
    -- Create extensions that might be useful
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    
    -- Set timezone
    SET timezone = 'UTC';
EOSQL

echo "Database initialization completed successfully!"