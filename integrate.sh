#!/bin/bash
#
# HeroStack Kanban Integration Script
# Automates copying plugin files to herostack source
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   HeroStack Kanban Integration        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if HEROSTACK_PATH is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: HeroStack path not provided${NC}"
    echo ""
    echo "Usage: ./integrate.sh /path/to/herostack"
    echo ""
    echo "Example:"
    echo "  ./integrate.sh /home/user/projects/herostack"
    echo "  ./integrate.sh ../herostack"
    exit 1
fi

HEROSTACK_PATH="$1"
PLUGIN_PATH="$(pwd)"

# Validate herostack path
if [ ! -d "$HEROSTACK_PATH" ]; then
    echo -e "${RED}Error: HeroStack directory not found: $HEROSTACK_PATH${NC}"
    exit 1
fi

if [ ! -f "$HEROSTACK_PATH/package.json" ]; then
    echo -e "${RED}Error: Invalid HeroStack directory (package.json not found)${NC}"
    exit 1
fi

echo -e "${YELLOW}HeroStack Path:${NC} $HEROSTACK_PATH"
echo -e "${YELLOW}Plugin Path:${NC} $PLUGIN_PATH"
echo ""

# Confirm before proceeding
read -p "Continue with integration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Integration cancelled."
    exit 0
fi

echo ""
echo -e "${GREEN}Step 1: Creating directories...${NC}"

mkdir -p "$HEROSTACK_PATH/src/app/api/plugins/kanban"
mkdir -p "$HEROSTACK_PATH/src/app/(dashboard)/kanban"
mkdir -p "$HEROSTACK_PATH/src/components/kanban"
mkdir -p "$HEROSTACK_PATH/src/lib/kanban"
mkdir -p "$HEROSTACK_PATH/src/lib/db/schemas"

echo "✓ Directories created"

echo ""
echo -e "${GREEN}Step 2: Copying API routes...${NC}"

cp -r "$PLUGIN_PATH/herostack-integration/api/plugins/kanban/"* \
      "$HEROSTACK_PATH/src/app/api/plugins/kanban/" 2>/dev/null || true

echo "✓ API routes copied to src/app/api/plugins/kanban/"

echo ""
echo -e "${GREEN}Step 3: Copying pages...${NC}"

cp -r "$PLUGIN_PATH/herostack-integration/app/(dashboard)/kanban/"* \
      "$HEROSTACK_PATH/src/app/(dashboard)/kanban/" 2>/dev/null || true

echo "✓ Pages copied to src/app/(dashboard)/kanban/"

echo ""
echo -e "${GREEN}Step 4: Copying components...${NC}"

cp -r "$PLUGIN_PATH/herostack-integration/components/kanban/"* \
      "$HEROSTACK_PATH/src/components/kanban/" 2>/dev/null || true

echo "✓ Components copied to src/components/kanban/"

echo ""
echo -e "${GREEN}Step 5: Copying library utilities...${NC}"

cp -r "$PLUGIN_PATH/lib/"* \
      "$HEROSTACK_PATH/src/lib/kanban/" 2>/dev/null || true

echo "✓ Utilities copied to src/lib/kanban/"

echo ""
echo -e "${GREEN}Step 6: Copying database schema...${NC}"

cp "$PLUGIN_PATH/schema.ts" \
   "$HEROSTACK_PATH/src/lib/db/schemas/kanban.ts"

echo "✓ Schema copied to src/lib/db/schemas/kanban.ts"

echo ""
echo -e "${YELLOW}⚠️  Manual Steps Required:${NC}"
echo ""
echo "1. Add to $HEROSTACK_PATH/src/lib/db/schema.ts:"
echo "   ${GREEN}export * from './schemas/kanban';${NC}"
echo ""
echo "2. Update import paths in plugin files if needed:"
echo "   - Change: import { ... } from '../../lib/permissions'"
echo "   - To:     import { ... } from '@/lib/kanban/permissions'"
echo ""
echo "3. Generate and run database migrations:"
echo "   ${GREEN}cd $HEROSTACK_PATH${NC}"
echo "   ${GREEN}bun drizzle-kit generate${NC}"
echo "   ${GREEN}bun drizzle-kit migrate${NC}"
echo ""
echo "4. Rebuild HeroStack:"
echo "   ${GREEN}bun install${NC}"
echo "   ${GREEN}bun run build${NC}"
echo ""
echo "5. Upload plugin ZIP via Admin UI:"
echo "   - Go to Admin → Plugins"
echo "   - Upload herostack-kanban.zip"
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}Integration files copied successfully!${NC}"
echo -e "${GREEN}Follow manual steps above to complete.${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
