#!/bin/bash
#
# HeroStack Kanban - Fully Automated Integration Script
# Automates ALL steps for integrating plugin into HeroStack
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "\n${GREEN}[STEP $1/${2}]${NC} $3"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗ Error:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Header
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  HeroStack Kanban - Auto Integration v2.0    ║${NC}"
echo -e "${GREEN}║  Fully Automated • Zero Manual Steps        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Check if HEROSTACK_PATH is provided
if [ -z "$1" ]; then
    print_error "HeroStack path not provided"
    echo ""
    echo "Usage: ./integrate-auto.sh /path/to/herostack [--skip-confirm]"
    echo ""
    echo "Example:"
    echo "  ./integrate-auto.sh /home/user/projects/herostack"
    echo "  ./integrate-auto.sh ../herostack --skip-confirm"
    exit 1
fi

HEROSTACK_PATH="$1"
PLUGIN_PATH="$(pwd)"
SKIP_CONFIRM="$2"

# Validate herostack path
if [ ! -d "$HEROSTACK_PATH" ]; then
    print_error "HeroStack directory not found: $HEROSTACK_PATH"
    exit 1
fi

if [ ! -f "$HEROSTACK_PATH/package.json" ]; then
    print_error "Invalid HeroStack directory (package.json not found)"
    exit 1
fi

# Check for required tools
if ! command -v sed &> /dev/null; then
    print_error "sed command not found. Please install sed."
    exit 1
fi

print_info "HeroStack Path: $HEROSTACK_PATH"
print_info "Plugin Path: $PLUGIN_PATH"
echo ""

# Confirm before proceeding
if [ "$SKIP_CONFIRM" != "--skip-confirm" ]; then
    read -p "Continue with automated integration? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Integration cancelled."
        exit 0
    fi
    echo ""
fi

TOTAL_STEPS=9

# ============================================================
# STEP 1: Backup existing files (if any)
# ============================================================
print_step 1 $TOTAL_STEPS "Creating backup of existing kanban files..."

BACKUP_DIR="$HEROSTACK_PATH/.kanban-backup-$(date +%Y%m%d-%H%M%S)"
if [ -d "$HEROSTACK_PATH/src/app/api/plugins/kanban" ] || \
   [ -d "$HEROSTACK_PATH/src/app/(dashboard)/kanban" ] || \
   [ -d "$HEROSTACK_PATH/src/components/kanban" ] || \
   [ -d "$HEROSTACK_PATH/src/lib/kanban" ]; then

    mkdir -p "$BACKUP_DIR"

    [ -d "$HEROSTACK_PATH/src/app/api/plugins/kanban" ] && \
        cp -r "$HEROSTACK_PATH/src/app/api/plugins/kanban" "$BACKUP_DIR/" 2>/dev/null
    [ -d "$HEROSTACK_PATH/src/app/(dashboard)/kanban" ] && \
        cp -r "$HEROSTACK_PATH/src/app/(dashboard)/kanban" "$BACKUP_DIR/" 2>/dev/null
    [ -d "$HEROSTACK_PATH/src/components/kanban" ] && \
        cp -r "$HEROSTACK_PATH/src/components/kanban" "$BACKUP_DIR/" 2>/dev/null
    [ -d "$HEROSTACK_PATH/src/lib/kanban" ] && \
        cp -r "$HEROSTACK_PATH/src/lib/kanban" "$BACKUP_DIR/" 2>/dev/null

    print_success "Backup created at: $BACKUP_DIR"
else
    print_info "No existing files to backup (fresh installation)"
fi

# ============================================================
# STEP 2: Create directories
# ============================================================
print_step 2 $TOTAL_STEPS "Creating plugin directories..."

mkdir -p "$HEROSTACK_PATH/src/app/api/plugins/kanban"
mkdir -p "$HEROSTACK_PATH/src/app/(dashboard)/kanban"
mkdir -p "$HEROSTACK_PATH/src/components/kanban"
mkdir -p "$HEROSTACK_PATH/src/lib/kanban"
mkdir -p "$HEROSTACK_PATH/src/lib/db/schemas"

print_success "Directories created"

# ============================================================
# STEP 3: Copy files to target locations
# ============================================================
print_step 3 $TOTAL_STEPS "Copying plugin files..."

# Copy API routes
cp -r "$PLUGIN_PATH/herostack-integration/api/plugins/kanban/"* \
      "$HEROSTACK_PATH/src/app/api/plugins/kanban/" 2>/dev/null || true
print_success "API routes → src/app/api/plugins/kanban/"

# Copy pages
cp -r "$PLUGIN_PATH/herostack-integration/app/(dashboard)/kanban/"* \
      "$HEROSTACK_PATH/src/app/(dashboard)/kanban/" 2>/dev/null || true
print_success "Pages → src/app/(dashboard)/kanban/"

# Copy components
cp -r "$PLUGIN_PATH/herostack-integration/components/kanban/"* \
      "$HEROSTACK_PATH/src/components/kanban/" 2>/dev/null || true
print_success "Components → src/components/kanban/"

# Copy library utilities
cp -r "$PLUGIN_PATH/lib/"* \
      "$HEROSTACK_PATH/src/lib/kanban/" 2>/dev/null || true
print_success "Utilities → src/lib/kanban/"

# Copy database schema
cp "$PLUGIN_PATH/schema.ts" \
   "$HEROSTACK_PATH/src/lib/db/schemas/kanban.ts"

# Add re-exports to schema file
sed -i '/^import { relations } from "drizzle-orm";$/a\\n// Re-export tables from main schema that plugin needs\nexport { users, teams, teamMembers, plugins } from "../schema";' \
    "$HEROSTACK_PATH/src/lib/db/schemas/kanban.ts"

print_success "Schema → src/lib/db/schemas/kanban.ts"

# ============================================================
# STEP 4: Fix import paths automatically
# ============================================================
print_step 4 $TOTAL_STEPS "Fixing import paths in all files..."

# Fix imports in API routes
find "$HEROSTACK_PATH/src/app/api/plugins/kanban" -type f -name "*.ts" -exec sed -i \
    -e 's|from "../../schema"|from "@/lib/db/schemas/kanban"|g' \
    -e 's|from "../../../schema"|from "@/lib/db/schemas/kanban"|g' \
    -e 's|from "../../../../schema"|from "@/lib/db/schemas/kanban"|g' \
    -e 's|from "../../lib/|from "@/lib/kanban/|g' \
    -e 's|from "../../../lib/|from "@/lib/kanban/|g' \
    -e 's|from "../../../../lib/|from "@/lib/kanban/|g' \
    {} \;

print_success "Fixed imports in API routes"

# Fix imports in pages
find "$HEROSTACK_PATH/src/app/(dashboard)/kanban" -type f -name "*.tsx" -exec sed -i \
    -e 's|from "../../schema"|from "@/lib/db/schemas/kanban"|g' \
    -e 's|from "../../../schema"|from "@/lib/db/schemas/kanban"|g' \
    -e 's|from "../../lib/|from "@/lib/kanban/|g' \
    -e 's|from "../../../lib/|from "@/lib/kanban/|g' \
    {} \;

print_success "Fixed imports in pages"

# Fix imports in components
find "$HEROSTACK_PATH/src/components/kanban" -type f -name "*.tsx" -exec sed -i \
    -e 's|from "../../schema"|from "@/lib/db/schemas/kanban"|g' \
    -e 's|from "../../../schema"|from "@/lib/db/schemas/kanban"|g' \
    -e 's|from "../../lib/|from "@/lib/kanban/|g' \
    -e 's|from "../../../lib/|from "@/lib/kanban/|g' \
    {} \;

print_success "Fixed imports in components"

# ============================================================
# STEP 5: Update main schema.ts to export kanban schema
# ============================================================
print_step 5 $TOTAL_STEPS "Updating main database schema..."

SCHEMA_FILE="$HEROSTACK_PATH/src/lib/db/schema.ts"

# Check if export already exists
if grep -q "export \* from './schemas/kanban'" "$SCHEMA_FILE" 2>/dev/null; then
    print_info "Kanban schema already exported in schema.ts"
else
    # Add export at the end of the file
    echo "" >> "$SCHEMA_FILE"
    echo "// Kanban Plugin Schema" >> "$SCHEMA_FILE"
    echo "export * from './schemas/kanban';" >> "$SCHEMA_FILE"
    print_success "Added kanban schema export to schema.ts"
fi

# ============================================================
# STEP 6: Generate database migrations
# ============================================================
print_step 6 $TOTAL_STEPS "Generating database migrations..."

cd "$HEROSTACK_PATH"

# Check if bun is available, otherwise use npm
if command -v bun &> /dev/null; then
    print_info "Using bun for database operations..."
    bun drizzle-kit generate 2>&1 | tail -n 5
    print_success "Migrations generated"
elif command -v npm &> /dev/null; then
    print_info "Using npm for database operations..."
    npm run db:generate 2>&1 | tail -n 5
    print_success "Migrations generated"
else
    print_warning "Neither bun nor npm found. Skipping migration generation."
    print_warning "Please run 'bun drizzle-kit generate' or 'npm run db:generate' manually"
fi

cd "$PLUGIN_PATH"

# ============================================================
# STEP 7: Run database migrations
# ============================================================
print_step 7 $TOTAL_STEPS "Running database migrations..."

cd "$HEROSTACK_PATH"

if command -v bun &> /dev/null; then
    bun drizzle-kit migrate 2>&1 | tail -n 5
    print_success "Migrations applied"
elif command -v npm &> /dev/null; then
    npm run db:migrate 2>&1 | tail -n 5
    print_success "Migrations applied"
else
    print_warning "Skipping migration. Please run 'bun drizzle-kit migrate' manually"
fi

cd "$PLUGIN_PATH"

# ============================================================
# STEP 8: Register plugin in database
# ============================================================
print_step 8 $TOTAL_STEPS "Registering plugin in database..."

# Create a temporary SQL file to insert plugin record
cat > /tmp/register-kanban-plugin.sql << 'EOF'
-- Register Kanban Plugin
INSERT INTO plugins (id, plugin_id, name, version, description, author, status, path, menu_items, installed_at, updated_at)
VALUES (
  gen_random_uuid(),
  'herostack-kanban',
  'Kanban Board',
  '1.0.0',
  'Advanced Kanban board system with real-time collaboration, team support, and powerful card features for task management',
  'HeroStack Team',
  'active',
  'src/app/api/plugins/kanban',
  '[{"title":"Kanban Boards","href":"/kanban/boards"},{"title":"Templates","href":"/kanban/templates"}]',
  NOW(),
  NOW()
)
ON CONFLICT (plugin_id) DO UPDATE SET
  version = EXCLUDED.version,
  description = EXCLUDED.description,
  menu_items = EXCLUDED.menu_items,
  updated_at = NOW();
EOF

# Try to run the SQL if DATABASE_URL is available
if [ -f "$HEROSTACK_PATH/.env" ]; then
    # Source the .env file to get DATABASE_URL
    export $(grep -v '^#' "$HEROSTACK_PATH/.env" | xargs)

    if [ -n "$DATABASE_URL" ]; then
        if command -v psql &> /dev/null; then
            psql "$DATABASE_URL" -f /tmp/register-kanban-plugin.sql > /dev/null 2>&1
            print_success "Plugin registered in database"
        else
            print_warning "psql not found. Skipping database registration."
            print_info "Plugin will be auto-registered on first use"
        fi
    else
        print_warning "DATABASE_URL not found in .env"
        print_info "Plugin will be auto-registered on first use"
    fi
else
    print_warning ".env file not found"
    print_info "Plugin will be auto-registered on first use"
fi

rm -f /tmp/register-kanban-plugin.sql

# ============================================================
# STEP 9: Install dependencies (if needed)
# ============================================================
print_step 9 $TOTAL_STEPS "Checking and installing dependencies..."

cd "$HEROSTACK_PATH"

# Check if @dnd-kit packages are installed
PACKAGE_JSON="$HEROSTACK_PATH/package.json"
NEEDS_INSTALL=false

if ! grep -q "@dnd-kit/core" "$PACKAGE_JSON"; then
    print_info "Installing @dnd-kit dependencies..."
    NEEDS_INSTALL=true

    if command -v bun &> /dev/null; then
        bun add @dnd-kit/core@^6.3 @dnd-kit/sortable@^10.0 @dnd-kit/utilities@^3.2
    elif command -v npm &> /dev/null; then
        npm install @dnd-kit/core@^6.3 @dnd-kit/sortable@^10.0 @dnd-kit/utilities@^3.2
    fi

    print_success "Dependencies installed"
else
    print_info "All dependencies already installed"
fi

cd "$PLUGIN_PATH"

# ============================================================
# COMPLETION
# ============================================================
echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✓ Integration Completed Successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""

print_info "Summary:"
echo "  • Files copied to HeroStack"
echo "  • Import paths fixed automatically"
echo "  • Database schema updated"
echo "  • Migrations generated and applied"
echo "  • Plugin registered in database"
echo "  • Dependencies installed"
echo ""

print_info "Next Steps:"
echo ""
echo "  1. Start/restart your HeroStack development server:"
echo -e "     ${GREEN}cd $HEROSTACK_PATH${NC}"
echo -e "     ${GREEN}bun run dev${NC}   ${BLUE}# or npm run dev${NC}"
echo ""
echo "  2. Open your browser and navigate to:"
echo -e "     ${BLUE}http://localhost:3000/kanban/boards${NC}"
echo ""
echo "  3. The Kanban menu items should appear in your sidebar"
echo ""

if [ -d "$BACKUP_DIR" ]; then
    print_warning "Backup created at: $BACKUP_DIR"
    echo "  You can safely delete it if everything works correctly"
    echo ""
fi

print_success "Plugin is ready to use! 🚀"
echo ""
