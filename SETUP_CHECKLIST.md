# ✅ Setup Checklist - Coupon Service

> **Current Status**: Project scaffolding complete. Ready for infrastructure setup.

---

## 🎯 Phase 1: Prerequisites (5 minutes)

- [ ] **Node.js installed** (`node --version` should show v18+)
- [ ] **npm installed** (`npm --version` should show v9+)
- [ ] **Project cloned & dependencies installed** (already done: 619 packages)

```bash
# Verify
node --version  # v18.x.x or higher
npm --version   # v9.x.x or higher
npm list | head -20  # Should show 619 dependencies installed
```

---

## 🔧 Phase 2: Infrastructure Setup (15 minutes)

Choose **ONE** of these two paths:

### Path A: Cloud Services (RECOMMENDED ⭐)
Fastest, no Docker Desktop needed, free tier available.

- [ ] **Create Supabase Account**
  - [ ] Go to https://supabase.com
  - [ ] Sign up (free tier)
  - [ ] Create new PostgreSQL project
  - [ ] Copy database URL from settings
  - [ ] Note connection string: `postgresql://user:password@...`

- [ ] **Create Upstash Account**
  - [ ] Go to https://upstash.com
  - [ ] Sign up (free tier)
  - [ ] Create new Redis database
  - [ ] Copy Redis URL: `redis://:password@host:port`

- [ ] **Update .env file**
  ```bash
  cp .env.example .env
  nano .env  # or use your editor
  ```
  Replace these:
  ```env
  # Database (from Supabase)
  DB_HOST=your-supabase-host
  DB_PORT=5432
  DB_USERNAME=postgres
  DB_PASSWORD=your-supabase-password
  DB_DATABASE=postgres
  
  # Redis (from Upstash)
  REDIS_HOST=your-upstash-host
  REDIS_PORT=your-upstash-port
  REDIS_PASSWORD=your-upstash-password
  ```

### Path B: Local Docker (Alternative)
Full local setup using Docker Compose.

- [ ] **Install Docker Desktop**
  - [ ] Download from https://www.docker.com/products/docker-desktop
  - [ ] Install and start
  - [ ] Verify: `docker --version`

- [ ] **Start local services**
  ```bash
  docker-compose up -d
  # PostgreSQL: localhost:5432 (user: qurable / password: qurable_dev_password)
  # Redis: localhost:6379
  # pgAdmin: localhost:5050
  ```

- [ ] **Use local .env** (already configured in .env.example)
  ```bash
  cp .env.example .env
  # No changes needed - already has localhost values
  ```

---

## 🚀 Phase 3: Database & Server (10 minutes)

- [ ] **Run database migrations**
  ```bash
  npm run migration:run
  ```
  Expected output:
  ```
  ✅ Migration MigrateXXX has been executed successfully.
  ```

- [ ] **Start development server**
  ```bash
  npm run dev
  ```
  Expected output:
  ```
  ✅ Server running on http://localhost:3000
  ✅ PostgreSQL connected
  ✅ Redis connected
  ```

- [ ] **Verify health endpoint**
  ```bash
  # In another terminal:
  curl http://localhost:3000/health
  # Expected response: {"status":"ok"}
  ```

---

## ✨ Phase 4: Verification (5 minutes)

### Database Check
```bash
# Connect to database (adjust credentials for your setup)
psql -h localhost -U postgres -d coupon_service

# Run these SQL commands:
\dt  # List tables (should show: coupon_book, coupon_code, etc.)
\q   # Exit
```

### Redis Check
```bash
# Connect to Redis (adjust host/port for your setup)
redis-cli -h localhost -p 6379 -a your_password

# Run these commands:
PING         # Should respond: PONG
INFO server  # Show server info
QUIT         # Exit
```

### API Check
```bash
# Health check
curl http://localhost:3000/health
# Response: {"status":"ok"}

# Version check
curl http://localhost:3000/api/v1/version
# Should return API version info
```

---

## 🎊 Success Criteria

All of these should be true:

- ✅ `npm run dev` starts without errors
- ✅ `curl http://localhost:3000/health` returns `{"status":"ok"}`
- ✅ Server logs show "PostgreSQL connected"
- ✅ Server logs show "Redis connected"
- ✅ No TypeScript compilation errors
- ✅ Database has 4 tables: coupon_book, coupon_code, coupon_assignment, redemption_audit

---

## 🆘 Troubleshooting

### Server won't start
```bash
# Check TypeScript compilation
npm run build

# Check for syntax errors
npm run lint

# Check environment variables
cat .env | grep -E "DB_|REDIS_"
```

### Database connection fails
- Verify .env has correct DB credentials
- Check PostgreSQL is running (Docker: `docker ps`)
- Verify host/port are correct
- Run: `psql -h HOST -U USER -d DATABASE` to test connection

### Redis connection fails
- Verify .env has correct Redis credentials
- Check Redis is running (Docker: `docker logs qurable-redis`)
- Verify host/port are correct
- Run: `redis-cli -h HOST -p PORT -a PASSWORD` to test

### Port already in use
```bash
# Find what's using port 3000
lsof -i :3000          # macOS/Linux
netstat -ano | grep 3000  # Windows
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess  # PowerShell

# Change PORT in .env to something else (e.g., 3001)
```

---

## 📖 Need Help?

| Issue | Resource |
|-------|----------|
| Complete setup guide | [docs/SETUP_DOCKER_SUPABASE_UPSTASH.md](./docs/SETUP_DOCKER_SUPABASE_UPSTASH.md) |
| Architecture questions | [docs/SYSTEM_ANALYSIS.md](./docs/SYSTEM_ANALYSIS.md) |
| API endpoints | [docs/API_DESIGN.md](./docs/API_DESIGN.md) |
| Project timeline | [docs/4_DAY_ROADMAP.md](./docs/4_DAY_ROADMAP.md) |
| Project overview | [PROJECT_GUIDE.md](./PROJECT_GUIDE.md) |

---

## 🎯 What's Next (After Infrastructure Ready)

Once the server is running successfully:

1. **Implement DTOs** (2 hours)
   - Request/response validation with Zod
   - See: `docs/4_DAY_ROADMAP.md` → Day 1 Afternoon section

2. **Create API Routes** (1 hour)
   - Wire up controllers
   - Register routes

3. **Build First Endpoint** (1 hour)
   - CouponBook CRUD
   - Test with Postman/curl

4. **Test Everything**
   - `npm run test` for unit tests
   - Manual testing via curl/Postman

---

## 💡 Pro Tips

1. **Keep .env secure** - Never commit to git (already in .gitignore)
2. **Use Postman** - Import collection from API_DESIGN.md
3. **Watch server logs** - Run `npm run dev` in one terminal
4. **Database queries** - Use pgAdmin (localhost:5050) if using Docker
5. **Redis monitoring** - Use redis-cli or GUI tools like RedisInsight

---

**🚀 Ready to set up? Follow the steps above and you'll be running in 30 minutes!**

**Questions? Check the [docs](./docs) folder or [PROJECT_GUIDE.md](./PROJECT_GUIDE.md)**
