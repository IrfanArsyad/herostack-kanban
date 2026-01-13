# Docker Deployment Guide - HeroStack Kanban Plugin

Complete guide for deploying HeroStack Kanban plugin in Docker environments.

## Quick Start (TL;DR)

### For Existing Docker Deployment

```bash
# 1. Clone plugin next to HeroStack
git clone https://github.com/yourusername/herostack-kanban.git

# 2. Integrate and rebuild
cd herostack-kanban
./integrate-docker.sh /path/to/herostack build

# 3. Rebuild and start containers
cd /path/to/herostack
docker-compose build
docker-compose up -d
```

**Time: 2-3 minutes** ⏱️

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Integration Methods](#integration-methods)
3. [Method 1: Build-Time Integration (Production)](#method-1-build-time-integration-production)
4. [Method 2: Runtime Integration (Development)](#method-2-runtime-integration-development)
5. [Method 3: Custom Dockerfile](#method-3-custom-dockerfile)
6. [Environment Variables](#environment-variables)
7. [Database Migrations](#database-migrations)
8. [Troubleshooting](#troubleshooting)
9. [Production Best Practices](#production-best-practices)

---

## Prerequisites

Before deploying with Docker, ensure you have:

- ✅ Docker installed (version 20.10+)
- ✅ Docker Compose installed (version 2.0+)
- ✅ HeroStack with Docker support
- ✅ PostgreSQL container running
- ✅ At least 2GB RAM available for containers

---

## Integration Methods

There are **3 ways** to integrate the Kanban plugin with Docker:

| Method | When to Use | Difficulty | Build Time |
|--------|-------------|------------|------------|
| **Build-Time** | Production deployments | ⭐ Easy | 2-3 min |
| **Runtime** | Active development | ⭐⭐ Medium | 1-2 min |
| **Custom Dockerfile** | Advanced customization | ⭐⭐⭐ Advanced | 3-5 min |

---

## Method 1: Build-Time Integration (Production)

**Recommended for:** Production deployments, CI/CD pipelines

### Overview

The plugin is integrated into your HeroStack source **before** building the Docker image. This creates a self-contained image with the plugin baked in.

### Step-by-Step

#### 1. Clone Plugin Repository

```bash
# Clone plugin to a temporary location
git clone https://github.com/yourusername/herostack-kanban.git
cd herostack-kanban
```

#### 2. Run Build Integration

```bash
./integrate-docker.sh /path/to/herostack build
```

This will:
- ✅ Copy plugin files to HeroStack source
- ✅ Fix all import paths
- ✅ Update database schema
- ✅ Install dependencies
- ✅ Prepare for Docker build

#### 3. Build Docker Image

```bash
cd /path/to/herostack
docker-compose build
```

#### 4. Start Containers

```bash
docker-compose up -d
```

#### 5. Run Migrations

```bash
# Run migrations inside container
docker-compose exec app bun drizzle-kit migrate
```

#### 6. Verify Installation

```bash
# Check if containers are running
docker-compose ps

# View logs
docker-compose logs -f app

# Open browser
open http://localhost:3056/kanban/boards
```

### Pros & Cons

**Pros:**
- ✅ Self-contained image
- ✅ Faster container startup
- ✅ No runtime dependencies
- ✅ Perfect for production

**Cons:**
- ⚠️ Requires rebuild for updates
- ⚠️ Larger image size

---

## Method 2: Runtime Integration (Development)

**Recommended for:** Development, testing plugin changes

### Overview

The plugin is integrated into an **already running** container. Perfect for development when you're making frequent changes.

### Step-by-Step

#### 1. Start HeroStack Containers

```bash
cd /path/to/herostack
docker-compose up -d
```

Wait for containers to be healthy:
```bash
docker-compose ps
```

#### 2. Clone Plugin Repository

```bash
git clone https://github.com/yourusername/herostack-kanban.git
cd herostack-kanban
```

#### 3. Run Runtime Integration

```bash
./integrate-docker.sh /path/to/herostack dev
```

This will:
- ✅ Copy plugin to running container
- ✅ Run integration script inside container
- ✅ Install dependencies
- ✅ Run migrations
- ✅ Restart container

#### 4. Verify Installation

```bash
# Wait for container to restart (20-30 seconds)
docker-compose logs -f app

# Open browser
open http://localhost:3056/kanban/boards
```

### Updating Plugin in Dev Mode

```bash
# Make changes to plugin code
vim herostack-kanban/herostack-integration/components/kanban/card.tsx

# Re-run integration
./integrate-docker.sh /path/to/herostack dev
```

### Pros & Cons

**Pros:**
- ✅ Fast iteration
- ✅ No image rebuild needed
- ✅ Perfect for development

**Cons:**
- ⚠️ Changes lost if container recreated
- ⚠️ Not suitable for production

---

## Method 3: Custom Dockerfile

**Recommended for:** Advanced users, custom deployment scenarios

### Overview

Modify HeroStack's Dockerfile to integrate the plugin during build process.

### Step-by-Step

#### 1. Prepare Directory Structure

```bash
your-project/
├── herostack/                 # HeroStack source
├── herostack-kanban/          # Plugin source
└── docker-compose.yml         # Your compose file
```

#### 2. Use Custom Dockerfile

We provide `Dockerfile.with-plugin` as a template. Copy it to your HeroStack:

```bash
cp herostack-kanban/Dockerfile.with-plugin herostack/Dockerfile
```

#### 3. Update docker-compose.yml

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    # Add plugin source to build context
    volumes:
      - ./herostack-kanban:/tmp/herostack-kanban:ro
    # ... rest of config
```

**OR** use a parent directory context:

```yaml
services:
  app:
    build:
      context: ..  # Parent directory
      dockerfile: herostack/Dockerfile
    # ... rest of config
```

Then update Dockerfile to:
```dockerfile
# Copy plugin from parent context
COPY herostack-kanban /tmp/herostack-kanban
```

#### 4. Build and Run

```bash
docker-compose build
docker-compose up -d
```

### Pros & Cons

**Pros:**
- ✅ Full control over build process
- ✅ Can customize integration steps
- ✅ Reusable build configuration

**Cons:**
- ⚠️ Requires Dockerfile knowledge
- ⚠️ Manual maintenance

---

## Environment Variables

The plugin uses HeroStack's existing environment variables. No additional vars needed!

### Required Variables (HeroStack)

```env
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/herostack

# Auth
NEXTAUTH_URL=http://localhost:3056
NEXTAUTH_SECRET=your-secret-key

# Optional: OAuth providers
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
```

### Plugin-Specific Settings

Plugin settings are configured in `plugin.json` (baked into image):

```json
{
  "settings": {
    "enableRealtime": true,
    "maxAttachmentSize": 10485760,
    "allowedFileTypes": ["image/*", "application/pdf"],
    "enableComments": true,
    "enableMentions": true
  }
}
```

To customize, edit `plugin.json` before running integration script.

---

## Database Migrations

### Automatic Migrations (Recommended)

The integration scripts handle migrations automatically. But if needed:

### Manual Migration Inside Container

```bash
# Generate migrations
docker-compose exec app bun drizzle-kit generate

# Apply migrations
docker-compose exec app bun drizzle-kit migrate

# Check migration status
docker-compose exec app bun drizzle-kit check
```

### Migration Files

Migrations are stored in:
```
herostack/src/lib/db/migrations/
├── 0001_initial.sql
├── 0002_add_teams.sql
└── 0003_add_kanban.sql  # Plugin tables
```

### Verify Tables Created

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U herostack -d herostack

# List kanban tables
\dt kanban_*

# Expected output:
# kanban_boards
# kanban_board_members
# kanban_columns
# kanban_cards
# kanban_checklist_items
# kanban_comments
# kanban_attachments
# kanban_activities
# kanban_templates
```

---

## Troubleshooting

### Container Won't Start After Integration

**Problem:** Container crashes or won't start

**Solutions:**

1. Check logs:
   ```bash
   docker-compose logs app
   ```

2. Verify integration completed:
   ```bash
   docker-compose exec app ls -la /app/src/app/api/plugins/kanban
   ```

3. Check for TypeScript errors:
   ```bash
   docker-compose exec app bun run build
   ```

4. Rollback and retry:
   ```bash
   docker-compose down
   docker volume rm herostack_app_data  # If using volume
   docker-compose build --no-cache
   docker-compose up -d
   ```

---

### Database Connection Errors

**Problem:** `Error: connect ECONNREFUSED postgresql://...`

**Solutions:**

1. Check if PostgreSQL is running:
   ```bash
   docker-compose ps postgres
   ```

2. Verify DATABASE_URL:
   ```bash
   docker-compose exec app env | grep DATABASE_URL
   ```

3. Wait for PostgreSQL to be ready:
   ```bash
   docker-compose logs postgres | grep "ready to accept connections"
   ```

4. Manually test connection:
   ```bash
   docker-compose exec app bun -e "console.log(process.env.DATABASE_URL)"
   ```

---

### Migration Failures

**Problem:** `Error: relation "kanban_boards" already exists`

**Solutions:**

1. Check existing tables:
   ```bash
   docker-compose exec postgres psql -U herostack -d herostack -c "\dt kanban_*"
   ```

2. If tables exist but incomplete, drop them:
   ```bash
   docker-compose exec postgres psql -U herostack -d herostack -c "
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   "
   ```

3. Re-run migrations:
   ```bash
   docker-compose exec app bun drizzle-kit migrate
   ```

---

### Plugin Not Showing in Sidebar

**Problem:** Menu items don't appear

**Solutions:**

1. Check if plugin is registered:
   ```bash
   docker-compose exec postgres psql -U herostack -d herostack -c "
   SELECT plugin_id, name, status FROM plugins WHERE plugin_id = 'herostack-kanban';
   "
   ```

2. If not found, register manually:
   ```bash
   docker-compose exec postgres psql -U herostack -d herostack -c "
   INSERT INTO plugins (id, plugin_id, name, version, status, path, menu_items, installed_at, updated_at)
   VALUES (
     gen_random_uuid(),
     'herostack-kanban',
     'Kanban Board',
     '1.0.0',
     'active',
     'src/app/api/plugins/kanban',
     '[{\"title\":\"Kanban Boards\",\"href\":\"/kanban/boards\"}]',
     NOW(),
     NOW()
   );
   "
   ```

3. Restart container:
   ```bash
   docker-compose restart app
   ```

---

### File Permission Errors

**Problem:** `EACCES: permission denied`

**Solutions:**

1. Check file ownership in container:
   ```bash
   docker-compose exec app ls -la /app/src/app/api/plugins/kanban
   ```

2. Fix permissions:
   ```bash
   docker-compose exec --user root app chown -R nextjs:nodejs /app
   ```

3. Rebuild with correct permissions:
   Add to Dockerfile before `USER nextjs`:
   ```dockerfile
   RUN chown -R nextjs:nodejs /app
   ```

---

## Production Best Practices

### 1. Multi-Stage Build

Always use multi-stage builds to minimize image size:

```dockerfile
# ✅ Good - Multi-stage
FROM oven/bun:1-alpine AS builder
# ... build steps

FROM oven/bun:1-alpine AS runner
COPY --from=builder /app/.next ./

# ❌ Bad - Single stage
FROM oven/bun:1-alpine
COPY . .
RUN bun build
```

### 2. Environment Variables

Never hardcode secrets in Dockerfile:

```dockerfile
# ❌ Bad
ENV DATABASE_URL=postgresql://user:password@host/db

# ✅ Good
# Pass at runtime via docker-compose.yml or .env
```

### 3. Health Checks

Always include health checks:

```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3056/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 4. Resource Limits

Set resource limits to prevent container from consuming all resources:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 5. Volume Mounts

Use named volumes for persistent data:

```yaml
volumes:
  - herostack_data:/var/lib/postgresql/data  # Database
  - uploads_data:/app/public/uploads          # File uploads
```

### 6. Logging

Configure logging driver:

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 7. Security

- Run as non-root user (already done in Dockerfile)
- Use secrets for sensitive data
- Keep base images updated
- Scan images for vulnerabilities

```bash
# Scan image
docker scout cves herostack-app:latest
```

### 8. CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Clone Kanban Plugin
        run: git clone https://github.com/yourusername/herostack-kanban.git

      - name: Integrate Plugin
        run: |
          cd herostack-kanban
          ./integrate-docker.sh ../herostack build

      - name: Build Docker Image
        run: |
          cd herostack
          docker-compose build

      - name: Push to Registry
        run: docker-compose push
```

---

## Updating Plugin in Production

### Zero-Downtime Update

```bash
# 1. Pull latest plugin
cd herostack-kanban
git pull origin main

# 2. Integrate into HeroStack source
./integrate-docker.sh /path/to/herostack build

# 3. Build new image with different tag
cd /path/to/herostack
docker-compose build
docker tag herostack-app:latest herostack-app:v1.1.0

# 4. Update docker-compose to use new tag
# Edit docker-compose.yml: image: herostack-app:v1.1.0

# 5. Rolling update
docker-compose up -d --no-deps --build app

# 6. Verify new version
docker-compose exec app cat /app/package.json | grep version

# 7. If successful, remove old image
docker image rm herostack-app:v1.0.0
```

---

## Summary

### Quick Reference

| Task | Command |
|------|---------|
| **Production deploy** | `./integrate-docker.sh /path build && docker-compose up -d --build` |
| **Development** | `./integrate-docker.sh /path dev` |
| **Update plugin** | Same as production deploy |
| **View logs** | `docker-compose logs -f app` |
| **Run migrations** | `docker-compose exec app bun drizzle-kit migrate` |
| **Check plugin** | `docker-compose exec postgres psql -U herostack -c "SELECT * FROM plugins"` |
| **Restart** | `docker-compose restart app` |
| **Rebuild** | `docker-compose build --no-cache` |

---

## Support

For Docker-specific issues:

1. Check [Troubleshooting](#troubleshooting) section above
2. Review Docker logs: `docker-compose logs app`
3. Report issues at: https://github.com/yourusername/herostack-kanban/issues
4. Include:
   - Docker version: `docker --version`
   - Docker Compose version: `docker-compose --version`
   - Container logs
   - docker-compose.yml (sanitized)

---

**Happy Dockerizing! 🐳**
