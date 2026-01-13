# HeroStack Kanban

Advanced Kanban board system for HeroStack with real-time collaboration, team support, and powerful card features.

## Features

- **Personal & Team Boards**: Create personal boards or team boards linked to HeroStack teams
- **Drag & Drop**: Smooth card movement between columns using @dnd-kit
- **Advanced Cards**:
  - Rich text descriptions
  - Assignees and priority levels
  - Due dates and labels
  - Checklists
  - File attachments
  - Comments with @mentions
  - Activity history
- **Real-time Collaboration**: See live updates when team members make changes
- **Permissions**: Owner, Editor, and Viewer roles for fine-grained access control
- **Templates**: Pre-built and custom templates for common workflows
- **Mobile Responsive**: Works seamlessly on desktop and mobile devices

## Installation

**IMPORTANT:** HeroStack plugins require manual code integration. This is not a one-click install.

### Quick Start

```bash
# 1. Download plugin
git clone https://github.com/yourusername/herostack-kanban.git
cd herostack-kanban

# 2. Integrate into HeroStack
./integrate.sh /path/to/your/herostack

# 3. Follow the manual steps shown by the script

# 4. Rebuild HeroStack
cd /path/to/your/herostack
bun drizzle-kit generate
bun drizzle-kit migrate
bun run build

# 5. Upload plugin ZIP for registration
# Go to Admin → Plugins and upload herostack-kanban.zip
```

**Detailed guide:** See [INTEGRATION-GUIDE.md](INTEGRATION-GUIDE.md)

## Usage

### Creating a Board

1. Click "Kanban Boards" in sidebar
2. Click "New Board" button
3. Choose Personal or Team board
4. Select a template or start from scratch
5. Start adding columns and cards!

### Managing Cards

- **Create**: Click "+" in any column
- **Edit**: Click on a card to open details modal
- **Move**: Drag and drop cards between columns
- **Assign**: Select team member in card details
- **Comment**: Add comments with @mentions to notify team members
- **Attach**: Upload files up to 10MB

### Board Permissions

- **Owner**: Full access - can edit/delete board and manage members
- **Editor**: Can create/edit/move cards, add comments
- **Viewer**: Read-only access

## Templates

Built-in templates:
- **Basic Kanban**: To Do → In Progress → Done
- **Scrum Board**: Backlog → Sprint → In Progress → Review → Done
- **Bug Tracking**: Reported → Triaged → In Progress → Testing → Closed
- **Content Pipeline**: Ideas → Research → Writing → Editing → Published
- **Sales Pipeline**: Lead → Qualified → Proposal → Negotiation → Closed

## Development

### Project Structure

```
herostack-kanban/
├── plugin.json           # Plugin manifest
├── schema.ts             # Database schema
├── lib/                  # Utilities
├── components/           # React components
├── pages/                # Next.js pages
└── api/                  # API routes
```

### Database Schema

The plugin creates these tables:
- `kanban_boards` - Board metadata
- `kanban_board_members` - Board permissions
- `kanban_columns` - Board columns
- `kanban_cards` - Task cards
- `kanban_checklist_items` - Card checklists
- `kanban_comments` - Card comments
- `kanban_attachments` - File attachments
- `kanban_activities` - Activity log
- `kanban_templates` - Board templates

### API Endpoints

**Boards:**
- `GET /api/plugins/kanban/boards` - List boards
- `POST /api/plugins/kanban/boards` - Create board
- `GET /api/plugins/kanban/boards/[id]` - Get board details
- `PATCH /api/plugins/kanban/boards/[id]` - Update board
- `DELETE /api/plugins/kanban/boards/[id]` - Delete board

**Cards:**
- `POST /api/plugins/kanban/boards/[id]/cards` - Create card
- `PATCH /api/plugins/kanban/cards/[id]` - Update card
- `DELETE /api/plugins/kanban/cards/[id]` - Delete card
- `POST /api/plugins/kanban/cards/[id]/move` - Move card

See full API documentation in `/docs/API.md`

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- Issues: https://github.com/yourusername/herostack-kanban/issues
- Documentation: https://github.com/yourusername/herostack-kanban/wiki
- HeroStack: https://github.com/herostack/herostack

## Credits

Built with:
- [HeroStack](https://github.com/herostack/herostack) - The extensible documentation platform
- [@dnd-kit](https://dndkit.com/) - Drag and drop functionality
- [Drizzle ORM](https://orm.drizzle.team/) - Database ORM
- [shadcn/ui](https://ui.shadcn.com/) - UI components
