# Installation Guide - HeroStack Kanban Plugin

This guide will help you install and set up the HeroStack Kanban plugin.

## Prerequisites

- HeroStack instance running (version 1.0.0 or higher)
- PostgreSQL database
- Admin access to HeroStack

## Installation Steps

**⚠️ IMPORTANT:** HeroStack plugins are NOT automatically installed. You must manually integrate the code into herostack's source.

### Prerequisites

- HeroStack source code access
- Bun or npm installed
- PostgreSQL database
- Admin access to HeroStack

### Installation Methods

#### Method 1: Automated Integration Script (Recommended)

```bash
# Clone plugin repository
git clone https://github.com/yourusername/herostack-kanban.git
cd herostack-kanban

# Run integration script
./integrate.sh /path/to/your/herostack

# Follow the manual steps shown by the script
```

#### Method 2: Manual Integration

See [INTEGRATION-GUIDE.md](INTEGRATION-GUIDE.md) for detailed manual steps.

### Database Setup

After integrating code, generate and run migrations:

- `kanban_boards` - Board metadata
- `kanban_board_members` - Board permissions
- `kanban_columns` - Board columns
- `kanban_cards` - Task cards
- `kanban_checklist_items` - Card checklists
- `kanban_comments` - Card comments
- `kanban_attachments` - File attachments
- `kanban_activities` - Activity log
- `kanban_templates` - Board templates

### 4. Activate Plugin

1. After upload completes, the plugin should be automatically activated
2. If not, go to **Admin → Plugins** and toggle the plugin to "Active"
3. Refresh the page

### 5. Access the Plugin

The plugin menu items will appear in the sidebar:
- **Kanban Boards** - Main boards page (`/kanban/boards`)
- **Templates** - Board templates (`/kanban/templates`)

## Verification

To verify the installation:

1. Click **"Kanban Boards"** in the sidebar
2. You should see the boards list page
3. Try creating a test board:
   - Click **"New Board"**
   - Enter a name
   - Choose Personal or Team
   - Click Create

If you can see the new board with default columns (To Do, In Progress, Done), the installation is successful!

## Troubleshooting

### Plugin Not Showing in Sidebar

- Check that the plugin status is "Active" in Admin → Plugins
- Clear browser cache and refresh
- Check browser console for errors

### Database Errors

- Ensure PostgreSQL is running and accessible
- Check HeroStack logs for migration errors
- Verify `DATABASE_URL` environment variable is set correctly

### Permission Errors

- Ensure you're logged in
- Check that you have appropriate role (editor or higher)
- For team boards, ensure you're a member of the team

## Uninstallation

To remove the plugin:

1. Go to **Admin → Plugins**
2. Find "Kanban Board" plugin
3. Click **Delete**
4. Confirm deletion

**Note:** This will permanently delete all boards, cards, and related data. Make sure to export any important data first.

## Development Setup

If you want to develop or customize the plugin:

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/herostack-kanban.git
cd herostack-kanban
```

### 2. Install Dependencies

```bash
npm install
# or
bun install
```

### 3. Generate Database Migrations

```bash
npm run db:generate
```

### 4. Build Plugin

```bash
npm run build
# Creates herostack-kanban.zip
```

### 5. Install to HeroStack

Upload the generated `herostack-kanban.zip` to your HeroStack instance.

## Configuration

### Plugin Settings

Edit `plugin.json` to customize:

- `maxAttachmentSize` - Max file upload size (default: 10MB)
- `allowedFileTypes` - Allowed attachment types
- `enableRealtime` - Enable/disable real-time updates
- `enableComments` - Enable/disable comments
- `enableMentions` - Enable/disable @mentions

### Environment Variables

The plugin uses HeroStack's environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Auth URL (from HeroStack)
- `NEXTAUTH_SECRET` - Auth secret (from HeroStack)

## Support

For issues or questions:

- GitHub Issues: https://github.com/yourusername/herostack-kanban/issues
- Documentation: https://github.com/yourusername/herostack-kanban/wiki
- HeroStack Discord: [Link to Discord]

## License

MIT License - see LICENSE file for details
