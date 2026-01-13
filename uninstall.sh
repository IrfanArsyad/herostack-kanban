#!/bin/bash
#
# HeroStack Kanban - Uninstall Script
# Removes all plugin files from HeroStack
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_error() {
    echo -e "${RED}✗ Error:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Header
echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║  HeroStack Kanban - Uninstall Script         ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Check if HEROSTACK_PATH is provided
if [ -z "$1" ]; then
    print_error "HeroStack path not provided"
    echo ""
    echo "Usage: ./uninstall.sh /path/to/herostack"
    echo ""
    echo "Example:"
    echo "  ./uninstall.sh /home/user/projects/herostack"
    exit 1
fi

HEROSTACK_PATH="$1"

# Validate herostack path
if [ ! -d "$HEROSTACK_PATH" ]; then
    print_error "HeroStack directory not found: $HEROSTACK_PATH"
    exit 1
fi

echo -e "${YELLOW}WARNING: This will remove all Kanban plugin files!${NC}"
echo -e "${YELLOW}Your database data will NOT be deleted.${NC}"
echo ""
echo "Files to be removed:"
echo "  • src/app/api/plugins/kanban/"
echo "  • src/app/(dashboard)/kanban/"
echo "  • src/components/kanban/"
echo "  • src/lib/kanban/"
echo "  • src/lib/db/schemas/kanban.ts"
echo ""

read -p "Continue with uninstallation? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Uninstallation cancelled."
    exit 0
fi

echo ""

# Create backup before uninstall
BACKUP_DIR="$HEROSTACK_PATH/.kanban-uninstall-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Creating backup before uninstall..."

[ -d "$HEROSTACK_PATH/src/app/api/plugins/kanban" ] && \
    cp -r "$HEROSTACK_PATH/src/app/api/plugins/kanban" "$BACKUP_DIR/" 2>/dev/null
[ -d "$HEROSTACK_PATH/src/app/(dashboard)/kanban" ] && \
    cp -r "$HEROSTACK_PATH/src/app/(dashboard)/kanban" "$BACKUP_DIR/" 2>/dev/null
[ -d "$HEROSTACK_PATH/src/components/kanban" ] && \
    cp -r "$HEROSTACK_PATH/src/components/kanban" "$BACKUP_DIR/" 2>/dev/null
[ -d "$HEROSTACK_PATH/src/lib/kanban" ] && \
    cp -r "$HEROSTACK_PATH/src/lib/kanban" "$BACKUP_DIR/" 2>/dev/null
[ -f "$HEROSTACK_PATH/src/lib/db/schemas/kanban.ts" ] && \
    cp "$HEROSTACK_PATH/src/lib/db/schemas/kanban.ts" "$BACKUP_DIR/" 2>/dev/null

print_success "Backup created at: $BACKUP_DIR"
echo ""

# Remove directories
echo "Removing plugin files..."

rm -rf "$HEROSTACK_PATH/src/app/api/plugins/kanban" 2>/dev/null && \
    print_success "Removed API routes" || print_warning "API routes not found"

rm -rf "$HEROSTACK_PATH/src/app/(dashboard)/kanban" 2>/dev/null && \
    print_success "Removed pages" || print_warning "Pages not found"

rm -rf "$HEROSTACK_PATH/src/components/kanban" 2>/dev/null && \
    print_success "Removed components" || print_warning "Components not found"

rm -rf "$HEROSTACK_PATH/src/lib/kanban" 2>/dev/null && \
    print_success "Removed utilities" || print_warning "Utilities not found"

rm -f "$HEROSTACK_PATH/src/lib/db/schemas/kanban.ts" 2>/dev/null && \
    print_success "Removed schema file" || print_warning "Schema file not found"

# Remove export from main schema.ts
SCHEMA_FILE="$HEROSTACK_PATH/src/lib/db/schema.ts"
if [ -f "$SCHEMA_FILE" ]; then
    # Remove the export line and the comment before it
    sed -i '/\/\/ Kanban Plugin Schema/d' "$SCHEMA_FILE"
    sed -i "/export \* from '.\/schemas\/kanban';/d" "$SCHEMA_FILE"
    print_success "Removed schema export from main schema.ts"
fi

# Remove plugin from database
echo ""
echo "Removing plugin registration from database..."

if [ -f "$HEROSTACK_PATH/.env" ]; then
    export $(grep -v '^#' "$HEROSTACK_PATH/.env" | xargs)

    if [ -n "$DATABASE_URL" ] && command -v psql &> /dev/null; then
        psql "$DATABASE_URL" -c "UPDATE plugins SET status = 'inactive' WHERE plugin_id = 'herostack-kanban';" > /dev/null 2>&1
        print_success "Plugin marked as inactive in database"
    else
        print_warning "Could not update database. Please deactivate manually in Admin UI"
    fi
else
    print_warning ".env file not found. Please deactivate plugin manually in Admin UI"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✓ Uninstallation Completed${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""

print_warning "Note: Database tables still exist. To remove data, run:"
echo "  DROP TABLE kanban_activities;"
echo "  DROP TABLE kanban_attachments;"
echo "  DROP TABLE kanban_comments;"
echo "  DROP TABLE kanban_checklist_items;"
echo "  DROP TABLE kanban_cards;"
echo "  DROP TABLE kanban_columns;"
echo "  DROP TABLE kanban_board_members;"
echo "  DROP TABLE kanban_boards;"
echo "  DROP TABLE kanban_templates;"
echo ""

print_success "Backup saved at: $BACKUP_DIR"
echo ""
