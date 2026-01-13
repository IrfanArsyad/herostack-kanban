#!/bin/bash
#
# HeroStack Kanban - Update Script
# Updates an existing plugin installation
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗ Error:${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Header
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  HeroStack Kanban - Update Script            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Check if HEROSTACK_PATH is provided
if [ -z "$1" ]; then
    print_error "HeroStack path not provided"
    echo ""
    echo "Usage: ./update.sh /path/to/herostack"
    echo ""
    echo "Example:"
    echo "  ./update.sh /home/user/projects/herostack"
    exit 1
fi

HEROSTACK_PATH="$1"
PLUGIN_PATH="$(pwd)"

# Validate herostack path
if [ ! -d "$HEROSTACK_PATH" ]; then
    print_error "HeroStack directory not found: $HEROSTACK_PATH"
    exit 1
fi

# Check if plugin is installed
if [ ! -d "$HEROSTACK_PATH/src/app/api/plugins/kanban" ]; then
    print_error "Kanban plugin is not installed in HeroStack"
    echo ""
    echo "Please run './integrate-auto.sh $HEROSTACK_PATH' first to install"
    exit 1
fi

print_info "Updating Kanban plugin..."
echo ""

# Pull latest changes from git (if it's a git repo)
if [ -d "$PLUGIN_PATH/.git" ]; then
    echo "Pulling latest changes from git..."
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || print_info "Could not pull from git (already up to date or not a git repo)"
fi

# Run the integration script with skip confirm flag
print_info "Running integration script..."
echo ""

"$PLUGIN_PATH/integrate-auto.sh" "$HEROSTACK_PATH" --skip-confirm

echo ""
print_success "Plugin updated successfully! 🎉"
echo ""
print_info "Please restart your development server:"
echo -e "  ${GREEN}cd $HEROSTACK_PATH && bun run dev${NC}"
echo ""
