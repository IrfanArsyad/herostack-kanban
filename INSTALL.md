# Installation Guide - HeroStack Kanban Plugin

Complete guide for installing the HeroStack Kanban plugin.

## Prerequisites

Before you begin, ensure you have:

- ✅ HeroStack instance installed (version 1.0.0 or higher)
- ✅ PostgreSQL database configured
- ✅ Bun or npm installed
- ✅ Git installed
- ✅ Admin access to your HeroStack instance

## Installation Methods

### Method 1: Automated Installation (⚡ Recommended)

This is the **easiest and fastest** way to install the plugin. No manual steps required!

#### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/herostack-kanban.git
cd herostack-kanban
```

#### Step 2: Run the Automated Integration Script

```bash
./integrate-auto.sh /path/to/your/herostack
```

**Example:**
```bash
# If your HeroStack is in the parent directory
./integrate-auto.sh ../herostack

# Or with absolute path
./integrate-auto.sh /home/user/projects/herostack
```

#### Step 3: What the Script Does

The automated script will:

1. ✅ **Create backup** of any existing Kanban files
2. ✅ **Copy all plugin files** to the correct HeroStack directories
3. ✅ **Fix import paths** automatically (no manual editing needed!)
4. ✅ **Update database schema** to include Kanban tables
5. ✅ **Generate migrations** using Drizzle Kit
6. ✅ **Run migrations** to create database tables
7. ✅ **Register plugin** in HeroStack's plugin system
8. ✅ **Install dependencies** (@dnd-kit packages)

**Total time: ~1-2 minutes** ⏱️

#### Step 4: Start Your Server

```bash
cd /path/to/your/herostack
bun run dev
```

#### Step 5: Access the Plugin

Open your browser and navigate to:
```
http://localhost:3000/kanban/boards
```

You should see the Kanban boards page with menu items in your sidebar! 🎉

---

### Method 2: Manual Installation

If you prefer to understand each step or need more control, follow the [INTEGRATION-GUIDE.md](INTEGRATION-GUIDE.md) for detailed manual instructions.

---

## Updating the Plugin

To update an existing installation to the latest version:

```bash
cd herostack-kanban

# Pull latest changes (if from git)
git pull

# Run update script
./update.sh /path/to/your/herostack
```

The update script will:
- Pull latest changes from git
- Re-run the integration script
- Preserve your existing data
- Update only the code files

---

## Uninstalling the Plugin

To remove the plugin from your HeroStack:

```bash
cd herostack-kanban
./uninstall.sh /path/to/your/herostack
```

The uninstall script will:
- ✅ Create a backup before removal
- ✅ Remove all plugin files from HeroStack
- ✅ Remove schema export from main schema.ts
- ✅ Mark plugin as inactive in database
- ⚠️ **Keep database tables and data** (for safety)

### Removing Database Tables (Optional)

If you want to completely remove all Kanban data:

```bash
# Connect to your PostgreSQL database
psql $DATABASE_URL

# Run these commands:
DROP TABLE IF EXISTS kanban_activities CASCADE;
DROP TABLE IF EXISTS kanban_attachments CASCADE;
DROP TABLE IF EXISTS kanban_comments CASCADE;
DROP TABLE IF EXISTS kanban_checklist_items CASCADE;
DROP TABLE IF EXISTS kanban_cards CASCADE;
DROP TABLE IF EXISTS kanban_columns CASCADE;
DROP TABLE IF EXISTS kanban_board_members CASCADE;
DROP TABLE IF EXISTS kanban_boards CASCADE;
DROP TABLE IF EXISTS kanban_templates CASCADE;
```

---

## Verification

After installation, verify everything works:

### 1. Check Menu Items

The sidebar should show:
- **Kanban Boards** (`/kanban/boards`)
- **Templates** (`/kanban/templates`)

### 2. Create a Test Board

1. Click **"Kanban Boards"** in sidebar
2. Click **"New Board"** button
3. Enter board name: "Test Board"
4. Select **"Personal"** board type
5. Click **"Create"**

You should see a new board with default columns: To Do, In Progress, Done

### 3. Test Card Creation

1. Click **"+"** button in "To Do" column
2. Enter card title: "Test Card"
3. Click **"Create"**
4. Card should appear in the column

### 4. Test Drag & Drop

1. Click and hold the test card
2. Drag it to "In Progress" column
3. Drop it
4. Card should move smoothly

If all tests pass, your installation is successful! ✅

---

## Troubleshooting

### Plugin Not Showing in Sidebar

**Problem:** Menu items don't appear after installation

**Solutions:**
1. Restart your development server:
   ```bash
   # Stop the server (Ctrl+C)
   bun run dev
   ```

2. Clear browser cache and refresh (Ctrl+Shift+R)

3. Check if plugin is registered:
   ```sql
   SELECT * FROM plugins WHERE plugin_id = 'herostack-kanban';
   ```

4. Verify files were copied:
   ```bash
   ls -la src/app/api/plugins/kanban
   ls -la src/app/(dashboard)/kanban
   ```

---

### Database Errors

**Problem:** Error about missing tables or columns

**Solutions:**
1. Check if migrations were run:
   ```bash
   cd /path/to/herostack
   bun drizzle-kit migrate
   ```

2. Verify database connection:
   ```bash
   # Check .env file
   cat .env | grep DATABASE_URL
   ```

3. Manually generate migrations:
   ```bash
   bun drizzle-kit generate
   bun drizzle-kit migrate
   ```

---

### Import Path Errors

**Problem:** TypeScript errors about missing imports

**Solutions:**
1. Re-run the integration script:
   ```bash
   ./integrate-auto.sh /path/to/herostack
   ```

2. Check if schema export was added:
   ```bash
   grep "kanban" /path/to/herostack/src/lib/db/schema.ts
   ```

   Should show:
   ```typescript
   export * from './schemas/kanban';
   ```

3. Restart TypeScript server in your IDE

---

### Permission Errors

**Problem:** "Permission denied" when running scripts

**Solutions:**
```bash
# Make scripts executable
chmod +x integrate-auto.sh update.sh uninstall.sh
```

---

### Port Already in Use

**Problem:** Development server won't start

**Solutions:**
```bash
# Kill existing process
kill $(lsof -t -i:3000)

# Or use different port
PORT=3001 bun run dev
```

---

## Configuration

### Plugin Settings

Edit `plugin.json` to customize:

```json
{
  "settings": {
    "enableRealtime": true,           // Enable real-time updates
    "maxAttachmentSize": 10485760,    // 10MB max file size
    "allowedFileTypes": [             // Allowed attachment types
      "image/*",
      "application/pdf",
      ".doc",
      ".docx",
      ".txt"
    ],
    "enableComments": true,           // Enable card comments
    "enableMentions": true            // Enable @mentions
  }
}
```

After changing settings, re-run the integration script:
```bash
./update.sh /path/to/herostack
```

---

## Environment Variables

The plugin uses HeroStack's existing environment variables:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/herostack
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

No additional environment variables needed! ✅

---

## Advanced: Development Setup

If you want to modify the plugin:

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/yourusername/herostack-kanban.git
cd herostack-kanban
bun install
```

### 2. Make Your Changes

Edit files in:
- `lib/` - Utility functions
- `herostack-integration/api/` - API routes
- `herostack-integration/app/` - Pages
- `herostack-integration/components/` - React components
- `schema.ts` - Database schema

### 3. Test Your Changes

```bash
# Integrate into your test HeroStack
./integrate-auto.sh /path/to/test/herostack

# Start server
cd /path/to/test/herostack
bun run dev
```

### 4. Update Schema (if changed)

```bash
cd /path/to/test/herostack
bun drizzle-kit generate
bun drizzle-kit migrate
```

---

## Support

Need help? Here's how to get support:

### Documentation
- [README.md](README.md) - Overview and features
- [INTEGRATION-GUIDE.md](INTEGRATION-GUIDE.md) - Manual integration steps
- [API Documentation](docs/API.md) - API reference

### Community
- **GitHub Issues**: https://github.com/yourusername/herostack-kanban/issues
- **HeroStack Discord**: [Link to Discord]
- **Discussions**: https://github.com/yourusername/herostack-kanban/discussions

### Reporting Bugs

When reporting issues, please include:
1. HeroStack version
2. Plugin version
3. Error messages (full stack trace)
4. Steps to reproduce
5. Browser and OS information

---

## What's Installed?

After installation, these directories will be created:

```
herostack/
└── src/
    ├── app/
    │   ├── (dashboard)/
    │   │   └── kanban/           # Kanban pages
    │   │       ├── boards/
    │   │       │   ├── page.tsx  # Boards list
    │   │       │   └── [boardId]/
    │   │       │       └── page.tsx  # Board view
    │   │       └── templates/
    │   │           └── page.tsx  # Templates page
    │   └── api/
    │       └── plugins/
    │           └── kanban/        # API routes
    │               ├── boards/
    │               ├── cards/
    │               └── ...
    ├── components/
    │   └── kanban/               # UI components
    │       ├── board-view.tsx
    │       ├── card.tsx
    │       ├── column.tsx
    │       └── ...
    └── lib/
        ├── kanban/               # Utilities
        │   ├── permissions.ts
        │   ├── activity-logger.ts
        │   ├── mentions.ts
        │   └── types.ts
        └── db/
            └── schemas/
                └── kanban.ts     # Database schema
```

---

## License

MIT License - see [LICENSE](LICENSE) file for details

---

## Next Steps

After successful installation:

1. 📚 Read the [Usage Guide](README.md#usage) to learn how to use the plugin
2. 🎨 Explore [Templates](README.md#templates) for common workflows
3. 🔧 Check [Configuration](#configuration) to customize settings
4. 🚀 Start creating boards and managing tasks!

Happy task management! 🎉
