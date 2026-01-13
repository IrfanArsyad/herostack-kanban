# HeroStack Kanban - Integration Guide

**IMPORTANT:** HeroStack plugins require manual code integration into the herostack source before use. This guide explains the complete integration process.

---

## Understanding HeroStack's Plugin System

HeroStack's plugin system is a **registry system**, not a dynamic loader:
- ✅ Plugins can be registered via Admin UI
- ✅ Menu items automatically appear in sidebar
- ✅ Plugin status tracked in database
- ❌ Plugin code is NOT dynamically loaded
- ❌ Files must be manually integrated into herostack source

**This means:** You must copy plugin code into herostack's source, rebuild, and then "install" the plugin via Admin UI to register it.

---

## Installation Steps

### Prerequisites

- HeroStack instance installed locally (for development)
- Access to herostack source code
- PostgreSQL database
- Bun or npm installed

### Step 1: Copy Plugin Files to HeroStack

Navigate to your herostack directory and copy the plugin files:

```bash
# Set your herostack path
HEROSTACK_PATH="/path/to/your/herostack"

# Copy API routes
cp -r herostack-integration/api/plugins/kanban \
      $HEROSTACK_PATH/src/app/api/plugins/

# Copy pages
cp -r herostack-integration/app/\(dashboard\)/kanban \
      $HEROSTACK_PATH/src/app/\(dashboard\)/

# Copy components
cp -r herostack-integration/components/kanban \
      $HEROSTACK_PATH/src/components/

# Copy lib utilities
mkdir -p $HEROSTACK_PATH/src/lib/kanban
cp -r lib/* $HEROSTACK_PATH/src/lib/kanban/
```

**Result:** Your herostack structure should now look like:

```
herostack/src/
├── app/
│   ├── api/
│   │   └── plugins/
│   │       └── kanban/              ⬅️ API routes
│   │           ├── boards/
│   │           ├── cards/
│   │           ├── templates/
│   │           └── realtime/
│   └── (dashboard)/
│       └── kanban/                   ⬅️ Pages
│           ├── boards/
│           │   ├── page.tsx
│           │   └── [boardId]/
│           └── templates/
├── components/
│   └── kanban/                       ⬅️ Components
│       ├── board-view.tsx
│       ├── card.tsx
│       └── column.tsx
└── lib/
    └── kanban/                       ⬅️ Utilities
        ├── permissions.ts
        ├── types.ts
        ├── activity-logger.ts
        └── mentions.ts
```

### Step 2: Integrate Database Schema

Add kanban tables to herostack's database schema:

**Option A: Separate Schema File (Recommended)**

```bash
# Copy schema
cp schema.ts $HEROSTACK_PATH/src/lib/db/schemas/kanban.ts
```

Then in `$HEROSTACK_PATH/src/lib/db/schema.ts`, add:

```typescript
// Import kanban schema
export * from "./schemas/kanban";
```

**Option B: Direct Integration**

Copy the contents of `schema.ts` and paste into:
`$HEROSTACK_PATH/src/lib/db/schema.ts`

### Step 3: Update Import Paths (If Needed)

Check if any imports need adjustment based on your herostack structure:

**API Routes:** Should import from herostack:
```typescript
import { auth } from "@/lib/auth";           // ✅ Correct
import { db } from "@/lib/db";               // ✅ Correct
import * as schema from "@/lib/db/schema";   // ✅ Correct

// Plugin-specific imports
import { kanbanBoards } from "@/lib/db/schemas/kanban";  // Update if needed
import { checkBoardAccess } from "@/lib/kanban/permissions";  // Update path
```

**Pages:** Should import from herostack:
```typescript
import { auth } from "@/lib/auth";
import { BoardView } from "@/components/kanban/board-view";  // Update path
import type { BoardWithRelations } from "@/lib/kanban/types";  // Update path
```

### Step 4: Generate Database Migrations

```bash
cd $HEROSTACK_PATH

# Generate migration for new kanban tables
bun drizzle-kit generate

# Apply migrations
bun drizzle-kit migrate
```

### Step 5: Rebuild HeroStack

```bash
cd $HEROSTACK_PATH

# Install dependencies (if new dependencies added)
bun install

# Build production
bun run build

# Or run dev server
bun run dev
```

### Step 6: Register Plugin via Admin UI

Now that the code is integrated, register the plugin:

1. **Create Plugin Package:**
   ```bash
   # From herostack-kanban directory
   zip -r herostack-kanban.zip \
     plugin.json \
     README.md \
     LICENSE \
     INSTALL.md \
     schema.ts \
     lib/
   ```

2. **Upload via Admin:**
   - Navigate to HeroStack Admin → Plugins
   - Click "Upload Plugin" or drag-and-drop `herostack-kanban.zip`
   - System will:
     - Extract to `/plugins/herostack-kanban/`
     - Parse `plugin.json`
     - Register in database with status "active"
     - Show menu items in sidebar

3. **Access Plugin:**
   - Refresh page
   - Check sidebar - "Kanban Boards" and "Templates" should appear under "Plugins" section
   - Click to navigate to `/kanban/boards`

---

## Verification

### Check Integration Success

**1. API Routes Working:**
```bash
# Test boards endpoint
curl http://localhost:3000/api/plugins/kanban/boards \
  -H "Cookie: your-auth-cookie"

# Should return: {"boards": [...]}
```

**2. Pages Accessible:**
- Navigate to `http://localhost:3000/kanban/boards`
- Should see boards list page (not 404)

**3. Database Tables Created:**
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE 'kanban_%';

-- Should show:
-- kanban_boards
-- kanban_board_members
-- kanban_columns
-- kanban_cards
-- kanban_checklist_items
-- kanban_comments
-- kanban_attachments
-- kanban_activities
-- kanban_templates
```

**4. Plugin Registered:**
```sql
SELECT * FROM plugins WHERE plugin_id = 'herostack-kanban';

-- Should show status: 'active'
```

**5. Menu Items Visible:**
- Check sidebar in herostack dashboard
- "Plugins" section should contain:
  - Kanban Boards → `/kanban/boards`
  - Templates → `/kanban/templates`

---

## Troubleshooting

### Build Errors

**Issue:** TypeScript errors about missing types

**Fix:** Ensure all dependencies are installed:
```bash
cd $HEROSTACK_PATH
bun install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Import Errors

**Issue:** Cannot find module '@/lib/kanban/...'

**Fix:** Update import paths in plugin files to match your herostack structure:
```typescript
// Before
import { checkBoardAccess } from "../../lib/permissions";

// After
import { checkBoardAccess } from "@/lib/kanban/permissions";
```

### Database Migration Errors

**Issue:** Migration fails with "relation already exists"

**Fix:** Drop existing tables if this is a fresh install:
```sql
DROP TABLE IF EXISTS
  kanban_activities,
  kanban_attachments,
  kanban_comments,
  kanban_checklist_items,
  kanban_cards,
  kanban_board_members,
  kanban_columns,
  kanban_boards,
  kanban_templates
CASCADE;
```

Then re-run migrations.

### Plugin Not Showing in Sidebar

**Issue:** Uploaded plugin but menu items don't appear

**Fix:**
1. Check plugin status: `SELECT * FROM plugins WHERE plugin_id = 'herostack-kanban';`
2. Ensure `status = 'active'`
3. Clear browser cache
4. Check `menuItems` column is not null
5. Restart herostack server

### 404 on Plugin Pages

**Issue:** Menu item appears but clicking gives 404

**Fix:**
- Ensure pages are copied to correct location
- Check herostack dev server is running with latest build
- Verify page exists at: `$HEROSTACK_PATH/src/app/(dashboard)/kanban/boards/page.tsx`

---

## Updating the Plugin

### To Update Plugin Code:

1. Pull latest from plugin repository
2. Copy updated files to herostack:
   ```bash
   # Update specific files
   cp herostack-integration/api/plugins/kanban/boards/route.ts \
      $HEROSTACK_PATH/src/app/api/plugins/kanban/boards/route.ts
   ```
3. Rebuild herostack: `bun run build`
4. Restart server

### To Update Plugin Registration:

1. Update `version` in `plugin.json`
2. Zip and re-upload via Admin → Plugins
3. System will update database record

---

## Development Workflow

### For Plugin Developers:

```bash
# 1. Develop in plugin repository
cd herostack-kanban
# Make changes to files in herostack-integration/

# 2. Test in herostack
cp -r herostack-integration/* /path/to/herostack/src/
cd /path/to/herostack
bun run dev

# 3. Once tested, commit to plugin repo
cd herostack-kanban
git add .
git commit -m "Add feature X"

# 4. Create distribution package
zip -r herostack-kanban.zip plugin.json README.md LICENSE lib/ schema.ts

# 5. Publish to GitHub releases
```

### For End Users:

1. Download plugin ZIP from GitHub releases
2. Follow Step 1-6 above
3. Plugin ready to use

---

## Architecture Notes

### Why This Structure?

HeroStack's current plugin system is designed for:
- ✅ **Plugin Registry** - Track installed plugins in database
- ✅ **UI Integration** - Auto-show menu items in sidebar
- ✅ **Settings Management** - Store plugin config in database
- ✅ **Enable/Disable** - Toggle plugins without code changes

It's **not** a dynamic module loader like WordPress. This approach:
- ✅ Better performance (no runtime plugin loading)
- ✅ Type safety (all code compiled together)
- ✅ Easier debugging (single codebase)
- ❌ Requires rebuild for plugin updates
- ❌ Manual integration steps

### Alternative: Monorepo Approach

For simpler management, consider making herostack-kanban a **workspace** in herostack:

```json
// herostack/package.json
{
  "workspaces": [
    ".",
    "plugins/herostack-kanban"
  ]
}
```

This allows:
- Shared dependencies
- Single build command
- Better TypeScript integration

---

## Support

For issues with integration:
- Check herostack documentation
- Review existing plugins (ip-whitelist) as examples
- Open issue on GitHub

For plugin-specific issues:
- Open issue on herostack-kanban repository
- Include error messages and logs
- Specify herostack version

---

## Summary

**Integration Process:**
1. ✅ Copy code to herostack source
2. ✅ Integrate database schema
3. ✅ Update import paths
4. ✅ Generate migrations
5. ✅ Rebuild herostack
6. ✅ Upload plugin ZIP for registration

**Result:**
- Fully integrated kanban system
- Menu items in sidebar
- All features working
- Tracked in plugin registry

**Time Required:** ~15-30 minutes for first-time integration

Good luck! 🚀
