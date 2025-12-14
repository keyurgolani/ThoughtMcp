#!/bin/bash
# ThoughtMCP Database Migration Script
# Manages database schema migrations and version tracking

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="${SCRIPT_DIR}/migrations"

# Default database connection (can be overridden by environment variables)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-thoughtmcp_dev}"
DB_USER="${DB_USER:-thoughtmcp_dev}"
DB_PASSWORD="${DB_PASSWORD:-dev_password}"

# Construct connection string
export PGPASSWORD="${DB_PASSWORD}"
PSQL_CMD="psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME}"

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_database_connection() {
    print_info "Checking database connection..."
    if ! $PSQL_CMD -c "SELECT 1" > /dev/null 2>&1; then
        print_error "Cannot connect to database"
        print_error "Host: ${DB_HOST}:${DB_PORT}, Database: ${DB_NAME}, User: ${DB_USER}"
        exit 1
    fi
    print_info "Database connection successful"
}

get_current_version() {
    local version=$($PSQL_CMD -t -c "SELECT COALESCE(MAX(version), 0) FROM schema_version" 2>/dev/null || echo "0")
    echo "$version" | tr -d ' '
}

apply_migration() {
    local migration_file=$1
    local version=$(basename "$migration_file" | cut -d'_' -f1)
    local description=$(basename "$migration_file" .sql | cut -d'_' -f2-)
    
    print_info "Applying migration ${version}: ${description}"
    
    # Execute migration in a transaction
    $PSQL_CMD <<EOF
BEGIN;
\i ${migration_file}
INSERT INTO schema_version (version, description) VALUES (${version}, '${description}');
COMMIT;
EOF
    
    if [ $? -eq 0 ]; then
        print_info "Migration ${version} applied successfully"
        return 0
    else
        print_error "Migration ${version} failed"
        return 1
    fi
}

run_migrations() {
    check_database_connection
    
    local current_version=$(get_current_version)
    print_info "Current database version: ${current_version}"
    
    # Create migrations directory if it doesn't exist
    mkdir -p "${MIGRATIONS_DIR}"
    
    # Find and sort migration files
    local migration_files=$(find "${MIGRATIONS_DIR}" -name "*.sql" | sort)
    
    if [ -z "$migration_files" ]; then
        print_info "No migrations found"
        return 0
    fi
    
    local applied_count=0
    for migration_file in $migration_files; do
        local version=$(basename "$migration_file" | cut -d'_' -f1)
        
        if [ "$version" -gt "$current_version" ]; then
            if apply_migration "$migration_file"; then
                applied_count=$((applied_count + 1))
            else
                print_error "Migration failed, stopping"
                exit 1
            fi
        fi
    done
    
    if [ $applied_count -eq 0 ]; then
        print_info "Database is up to date"
    else
        print_info "Applied ${applied_count} migration(s)"
    fi
}

rollback_migration() {
    local target_version=$1
    
    check_database_connection
    
    local current_version=$(get_current_version)
    print_info "Current database version: ${current_version}"
    
    if [ "$target_version" -ge "$current_version" ]; then
        print_warning "Target version ${target_version} is not less than current version ${current_version}"
        return 0
    fi
    
    print_warning "Rolling back to version ${target_version}"
    print_warning "This operation may result in data loss!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_info "Rollback cancelled"
        return 0
    fi
    
    # Look for rollback script
    local rollback_file="${MIGRATIONS_DIR}/rollback_${target_version}.sql"
    
    if [ ! -f "$rollback_file" ]; then
        print_error "Rollback script not found: ${rollback_file}"
        exit 1
    fi
    
    print_info "Executing rollback script"
    $PSQL_CMD <<EOF
BEGIN;
\i ${rollback_file}
DELETE FROM schema_version WHERE version > ${target_version};
COMMIT;
EOF
    
    if [ $? -eq 0 ]; then
        print_info "Rollback to version ${target_version} completed"
    else
        print_error "Rollback failed"
        exit 1
    fi
}

show_status() {
    check_database_connection
    
    local current_version=$(get_current_version)
    
    print_info "Database Migration Status"
    echo "=========================="
    echo "Database: ${DB_NAME}"
    echo "Host: ${DB_HOST}:${DB_PORT}"
    echo "Current Version: ${current_version}"
    echo ""
    
    print_info "Applied Migrations:"
    $PSQL_CMD -c "SELECT version, description, applied_at FROM schema_version ORDER BY version"
    
    echo ""
    print_info "Pending Migrations:"
    local pending_count=0
    for migration_file in $(find "${MIGRATIONS_DIR}" -name "*.sql" | sort); do
        local version=$(basename "$migration_file" | cut -d'_' -f1)
        if [ "$version" -gt "$current_version" ]; then
            echo "  - $(basename "$migration_file")"
            pending_count=$((pending_count + 1))
        fi
    done
    
    if [ $pending_count -eq 0 ]; then
        print_info "No pending migrations"
    fi
}

create_migration() {
    local description=$1
    
    if [ -z "$description" ]; then
        print_error "Migration description required"
        echo "Usage: $0 create <description>"
        exit 1
    fi
    
    # Get next version number
    local current_version=$(get_current_version)
    local next_version=$((current_version + 1))
    
    # Create migration file
    local filename="${next_version}_${description}.sql"
    local filepath="${MIGRATIONS_DIR}/${filename}"
    
    mkdir -p "${MIGRATIONS_DIR}"
    
    cat > "$filepath" <<EOF
-- Migration ${next_version}: ${description}
-- Created: $(date)

BEGIN;

-- Add your migration SQL here


COMMIT;
EOF
    
    print_info "Created migration file: ${filepath}"
    print_info "Edit the file and add your migration SQL"
}

# Main script
case "${1:-}" in
    migrate|up)
        run_migrations
        ;;
    rollback|down)
        if [ -z "${2:-}" ]; then
            print_error "Target version required"
            echo "Usage: $0 rollback <version>"
            exit 1
        fi
        rollback_migration "$2"
        ;;
    status)
        show_status
        ;;
    create)
        create_migration "${2:-}"
        ;;
    *)
        echo "ThoughtMCP Database Migration Tool"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  migrate, up          Apply pending migrations"
        echo "  rollback, down <ver> Rollback to specific version"
        echo "  status               Show migration status"
        echo "  create <description> Create new migration file"
        echo ""
        echo "Environment Variables:"
        echo "  DB_HOST     Database host (default: localhost)"
        echo "  DB_PORT     Database port (default: 5432)"
        echo "  DB_NAME     Database name (default: thoughtmcp_dev)"
        echo "  DB_USER     Database user (default: thoughtmcp_dev)"
        echo "  DB_PASSWORD Database password (default: dev_password)"
        exit 1
        ;;
esac
