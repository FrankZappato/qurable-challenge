# ⚡ Quick Reference - Common Commands

## 🚀 Getting Started (First Time)

```bash
# 1. Install dependencies (already done: 619 packages)
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your credentials (Supabase + Upstash)

# 3. Run migrations
npm run migration:run

# 4. Start development
npm run dev
```

---

## 🏃 Development Commands

```bash
# Start development server (with hot reload)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run compiled server
npm start

# Watch for changes and rebuild
npm run watch
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode (re-run on file change)
npm test:watch

# Generate coverage report
npm test:coverage

# Run specific test file
npm test -- src/__tests__/entities.test.ts
```

---

## 📚 Code Quality

```bash
# Check code with ESLint
npm run lint

# Format code with Prettier
npm run format

# Check for type errors
npm run type-check

# Do all checks (lint + format + type-check)
npm run check
```

---

## 🗄️ Database

```bash
# Create a new migration
npm run migration:create -- -n CreateUserTable

# Show pending migrations
npm run migration:show

# Run all pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Revert all migrations
npm run migration:revert:all

# Drop all tables (⚠️ destructive)
npm run migration:drop
```

---

## 🐳 Docker (if using Docker Compose)

```bash
# Start all services (PostgreSQL, Redis, pgAdmin)
npm run docker:up
# or
docker-compose up -d

# Stop all services
npm run docker:down
# or
docker-compose down

# View logs
npm run docker:logs
# or
docker-compose logs -f

# Restart a specific service
docker-compose restart postgres
docker-compose restart redis

# Remove all data (⚠️ destructive)
docker-compose down -v
```

---

## 🔗 Useful URLs (Local Setup)

| Service | URL |
|---------|-----|
| **API Server** | http://localhost:3000 |
| **Health Check** | http://localhost:3000/health |
| **API Base** | http://localhost:3000/api/v1 |
| **pgAdmin** | http://localhost:5050 (username: admin@admin.com, password: admin) |
| **Redis Commander** | http://localhost:8081 (if using docker-compose) |

---

## 🧑‍💻 Development Workflow

### Morning: Start Coding
```bash
# Terminal 1: Start the server
npm run dev

# Terminal 2: Run tests in watch mode
npm test:watch

# Terminal 3: Monitor code quality
npm run lint -- --watch
```

### Before Committing
```bash
# Format code
npm run format

# Check types
npm run type-check

# Run tests
npm test

# Lint
npm run lint
```

### Deploying
```bash
# Build for production
npm run build

# Test the build
npm start

# Check TypeScript
npm run type-check
```

---

## 🔍 Debugging

### View server logs
```bash
# Development (with debug info)
npm run dev

# With specific debug module
DEBUG=app npm run dev
```

### Database debugging
```bash
# Connect to PostgreSQL (local Docker)
psql -h localhost -U qurable -d coupon_service

# Connect with Supabase connection string
psql "postgresql://user:password@db.xxxxx.supabase.co:5432/postgres"

# List tables
\dt

# Describe table
\d coupon_code

# Exit
\q
```

### Redis debugging
```bash
# Connect to Redis (local Docker)
redis-cli -h localhost

# Or with authentication
redis-cli -h localhost -a password

# Useful commands:
PING              # Test connection
KEYS *            # List all keys
GET key_name      # Get value
DEL key_name      # Delete key
INFO              # Server info
```

---

## 📦 Working with Dependencies

```bash
# Install new dependency
npm install package-name

# Install dev dependency
npm install --save-dev package-name

# Update all dependencies
npm update

# Check for outdated packages
npm outdated

# Audit for security issues
npm audit

# Fix security issues automatically
npm audit fix
```

---

## 🔑 Environment Variables

### Required Variables
```bash
# Server
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database (Supabase or local)
DB_HOST=xxx
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=xxx
DB_DATABASE=postgres

# Redis (Upstash or local)
REDIS_HOST=xxx
REDIS_PORT=6379
REDIS_PASSWORD=xxx
```

### Optional Variables
```bash
# JWT (for authentication)
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Coupon configuration
COUPON_LOCK_DURATION_SECONDS=300
COUPON_CLEANUP_CRON=*/1 * * * *

# Features
ENABLE_SWAGGER=true
ENABLE_METRICS=true
```

---

## 🆘 Common Issues & Solutions

### "Cannot find module" error
```bash
# Rebuild and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Port 3000 already in use
```bash
# Change port in .env
PORT=3001

# Or kill the process
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### TypeScript errors
```bash
# Check all TypeScript errors
npm run type-check

# Build and see all errors
npm run build
```

### Database connection issues
```bash
# Test database connection
npm run migration:show

# Check .env file
cat .env | grep DB_

# Verify PostgreSQL is running
# For Docker: docker ps | grep postgres
# For local: psql --version
```

---

## 📊 Performance Commands

```bash
# Analyze bundle size
npm run build -- --analyze

# Check performance
npm run type-check && npm test && npm run lint

# Generate test coverage
npm test:coverage
```

---

## 🚀 Deployment Preparation

```bash
# 1. Ensure all tests pass
npm test

# 2. Build for production
npm run build

# 3. Check types
npm run type-check

# 4. Run linter
npm run lint

# 5. Test the build locally
npm start

# 6. Create environment file for production
cp .env.example .env.production
# Edit .env.production with production credentials
```

---

## 💾 Git Commands (Optional)

```bash
# Initialize git (if needed)
git init

# Check status
git status

# Add files
git add .

# Commit changes
git commit -m "feat: description of changes"

# Push to remote
git push origin main
```

---

## 📞 Getting Help

- **Server won't start?** → Check `npm run build` output
- **TypeScript errors?** → Run `npm run type-check`
- **Database issues?** → Check database connection in .env
- **Test failures?** → Run `npm test:watch` and fix one by one
- **Need docs?** → Check [docs/](./docs) folder

---

**Pro Tip:** Create aliases for common commands:
```bash
# Add to your shell profile (.bashrc, .zshrc, or .profile)
alias ndev="npm run dev"
alias nbuild="npm run build"
alias ntest="npm test"
alias ncheck="npm run type-check && npm run lint"
```

Then use: `ndev` instead of `npm run dev`
