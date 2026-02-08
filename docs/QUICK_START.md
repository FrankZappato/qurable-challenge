# Quick Start Guide

Get the Coupon Service running in 5 minutes.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker (or cloud PostgreSQL + Redis)
- Git

## Option 1: Quick Setup with Docker + Cloud (Recommended)

See [SETUP_DOCKER_SUPABASE_UPSTASH.md](./SETUP_DOCKER_SUPABASE_UPSTASH.md) for complete setup guide (~30 minutes).

## Option 2: Full Docker Setup (Docker Desktop)

```bash
# Start infrastructure
npm run docker:up

# Create migrations
npm run migration:run

# Start server
npm run dev
```

## Option 3: Cloud-Only Setup (No Docker)

Use:
- **PostgreSQL:** Supabase (https://supabase.com)
- **Redis:** Upstash (https://upstash.com)

Then just:
```bash
npm run migration:run
npm run dev
```

---

## Testing the API

### Health Check
```bash
curl http://localhost:3000/health
```

### API Ping
```bash
curl http://localhost:3000/api/v1/ping
```

Both should return JSON responses.

---

## Available Scripts

```bash
npm run dev                # Development with hot-reload
npm run build              # Build for production
npm run test               # Run tests
npm run lint               # Check code quality
npm run migration:run      # Run pending migrations
npm run docker:up          # Start Docker containers
npm run docker:down        # Stop Docker containers
```

---

## Documentation

- 📚 [System Architecture](./SYSTEM_ANALYSIS.md)
- 📋 [API Specification](./API_DESIGN.md)
- 🗓️ [4-Day Roadmap](./4_DAY_ROADMAP.md)
- 📊 [Project Status](./PROJECT_STATUS.md)
- 🔧 [Setup Guide](./SETUP_DOCKER_SUPABASE_UPSTASH.md)

---

**Ready?** Follow [SETUP_DOCKER_SUPABASE_UPSTASH.md](./SETUP_DOCKER_SUPABASE_UPSTASH.md) 🚀
