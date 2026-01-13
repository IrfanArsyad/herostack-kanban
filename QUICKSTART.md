# Quick Start - 3 Commands to Install

The fastest way to get HeroStack Kanban running.

## Installation (1-2 minutes)

```bash
# 1. Clone the plugin
git clone https://github.com/yourusername/herostack-kanban.git
cd herostack-kanban

# 2. Run auto-install
./integrate-auto.sh /path/to/herostack

# 3. Start server
cd /path/to/herostack && bun run dev
```

Done! 🎉

## What You Get

- ✅ Kanban board system fully integrated
- ✅ Database tables created
- ✅ Menu items added to sidebar
- ✅ All dependencies installed

## Access

Open: `http://localhost:3000/kanban/boards`

## Update Plugin

```bash
cd herostack-kanban
./update.sh /path/to/herostack
```

## Remove Plugin

```bash
cd herostack-kanban
./uninstall.sh /path/to/herostack
```

## Docker Deployment

### Production
```bash
./integrate-docker.sh /path/to/herostack build
cd /path/to/herostack && docker-compose up -d --build
```

### Development
```bash
docker-compose up -d
./integrate-docker.sh /path/to/herostack dev
```

## Need Help?

- 📖 Full guide: [INSTALL.md](INSTALL.md)
- 🐳 Docker guide: [DOCKER.md](DOCKER.md)
- 🔧 Manual steps: [INTEGRATION-GUIDE.md](INTEGRATION-GUIDE.md)
- 📚 Features: [README.md](README.md)

---

**That's it!** Works with local dev AND Docker! No manual configuration. Just run and use! 🚀
