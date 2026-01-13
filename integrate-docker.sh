#!/bin/bash
#
# HeroStack Kanban - Docker Integration Script
# Integrates plugin into Docker container or Docker build
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "\n${GREEN}[STEP $1/${2}]${NC} $3"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗ Error:${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Header
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  HeroStack Kanban - Docker Integration       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Check arguments
if [ -z "$1" ]; then
    print_error "HeroStack path not provided"
    echo ""
    echo "Usage: ./integrate-docker.sh /path/to/herostack [mode]"
    echo ""
    echo "Modes:"
    echo "  dev       - Development mode (for running container)"
    echo "  build     - Build mode (prepare for Docker build)"
    echo ""
    echo "Example:"
    echo "  ./integrate-docker.sh /home/user/herostack dev"
    echo "  ./integrate-docker.sh /home/user/herostack build"
    exit 1
fi

HEROSTACK_PATH="$1"
MODE="${2:-build}"
PLUGIN_PATH="$(pwd)"

# Validate herostack path
if [ ! -d "$HEROSTACK_PATH" ]; then
    print_error "HeroStack directory not found: $HEROSTACK_PATH"
    exit 1
fi

if [ ! -f "$HEROSTACK_PATH/package.json" ]; then
    print_error "Invalid HeroStack directory (package.json not found)"
    exit 1
fi

print_info "HeroStack Path: $HEROSTACK_PATH"
print_info "Plugin Path: $PLUGIN_PATH"
print_info "Mode: $MODE"
echo ""

if [ "$MODE" == "dev" ]; then
    # ============================================================
    # DEVELOPMENT MODE - Integrate into running container
    # ============================================================

    print_info "Development mode: Integrating into Docker container..."
    echo ""

    # Check if container is running
    CONTAINER_NAME="herostack-app"

    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_error "Container '$CONTAINER_NAME' is not running"
        echo ""
        echo "Please start the container first:"
        echo "  cd $HEROSTACK_PATH"
        echo "  docker-compose up -d"
        exit 1
    fi

    print_success "Container is running"
    echo ""

    TOTAL_STEPS=5

    # Step 1: Copy plugin files to container
    print_step 1 $TOTAL_STEPS "Copying plugin files to container..."

    docker exec $CONTAINER_NAME mkdir -p /tmp/herostack-kanban
    docker cp "$PLUGIN_PATH/." $CONTAINER_NAME:/tmp/herostack-kanban/

    print_success "Files copied to container"

    # Step 2: Run integration script inside container
    print_step 2 $TOTAL_STEPS "Running integration inside container..."

    docker exec $CONTAINER_NAME sh -c "cd /tmp/herostack-kanban && chmod +x integrate-auto.sh && ./integrate-auto.sh /app --skip-confirm"

    print_success "Integration completed"

    # Step 3: Install dependencies inside container
    print_step 3 $TOTAL_STEPS "Installing dependencies in container..."

    docker exec $CONTAINER_NAME sh -c "cd /app && bun install"

    print_success "Dependencies installed"

    # Step 4: Run migrations
    print_step 4 $TOTAL_STEPS "Running database migrations..."

    docker exec $CONTAINER_NAME sh -c "cd /app && bun drizzle-kit generate && bun drizzle-kit migrate"

    print_success "Migrations completed"

    # Step 5: Restart container
    print_step 5 $TOTAL_STEPS "Restarting container..."

    docker restart $CONTAINER_NAME

    print_success "Container restarted"

    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}   ✓ Docker Integration Completed!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════${NC}"
    echo ""

    print_info "Next steps:"
    echo "  1. Wait for container to start (20-30 seconds)"
    echo "  2. Open: http://localhost:3056/kanban/boards"
    echo ""

elif [ "$MODE" == "build" ]; then
    # ============================================================
    # BUILD MODE - Prepare for Docker build
    # ============================================================

    print_info "Build mode: Preparing HeroStack for Docker build with plugin..."
    echo ""

    # Run normal integration
    "$PLUGIN_PATH/integrate-auto.sh" "$HEROSTACK_PATH" --skip-confirm

    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}   ✓ Build Integration Completed!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════${NC}"
    echo ""

    print_info "HeroStack is now ready for Docker build"
    echo ""
    echo "Next steps:"
    echo "  1. Build Docker image:"
    echo "     cd $HEROSTACK_PATH"
    echo "     docker-compose build"
    echo ""
    echo "  2. Start containers:"
    echo "     docker-compose up -d"
    echo ""
    echo "  3. Open: http://localhost:3056/kanban/boards"
    echo ""
else
    print_error "Invalid mode: $MODE"
    echo "Valid modes: dev, build"
    exit 1
fi
