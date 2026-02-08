# Next Steps: Docker + Supabase + Upstash Setup

Complete guide to get infrastructure running in ~30 minutes.

## 🎯 What We're Doing

Setting up:
1. **Docker Desktop** (local development)
2. **Supabase** (PostgreSQL in cloud)
3. **Upstash** (Redis in cloud)
4. **Update .env** and get server running

---

## STEP 1: Install Docker Desktop (15 minutes)

### Download
🔗 https://www.docker.com/products/docker-desktop/

### Installation Steps

1. **Run the installer**
   - Double-click `Docker Desktop Installer.exe`
   - Accept terms & conditions
   - Follow prompts (use default settings)

2. **Enable WSL 2** (if prompted)
   - Docker will ask to enable WSL 2
   - Click "OK" and let it install
   - May require restart

3. **Restart Windows**
   - Restart when installation completes
   - Let Docker start automatically (may take 1-2 min)

4. **Verify Installation**
   Open PowerShell and run:
   ```powershell
   docker --version
   docker compose version
   ```
   
   You should see:
   ```
   Docker version 24.x.x
   Docker Compose version v2.x.x
   ```

### Docker Desktop Icon
- Look for Docker icon in system tray (bottom right)
- Should be **green** = Docker running
- If gray = Docker starting, wait 1 minute

---

## STEP 2: Create Supabase Account (PostgreSQL)

### Go to Supabase
🔗 https://supabase.com

### Create Account
1. Click "Sign Up"
2. Create account with GitHub or email
3. Verify email if needed

### Create Project
1. Click "Create new project"
2. Fill in project details:
   - Project name: `qurable-coupon-service`
   - Region: Choose closest to you
   - Password: Set strong password (SAVE THIS!)
3. Click "Create new project"
   - Wait 3-5 minutes for project to initialize
   - ✅ You'll see "Project is running"

### Get Connection String
1. Go to **Settings** → **Database** → **Connection string**
2. Copy the **PostgreSQL** URI
   - Should look like: `postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres`

### Keep Connection Details Safe
Save these (you'll need them):
```
Host: db.xxxxx.supabase.co
Port: 5432
Username: postgres
Password: [your-password]
Database: postgres
```

---

## STEP 3: Create Upstash Account (Redis)

### Go to Upstash
🔗 https://upstash.com

### Create Account
1. Click "Sign Up"
2. Create account with GitHub, Google, or email
3. Verify email

### Create Redis Database
1. Click "Create Database"
2. Fill in:
   - Database name: `qurable-redis`
   - Region: Choose same as Supabase if possible
   - Type: **Redis**
3. Click "Create"

### Get Connection Details
1. Copy **Endpoint URL** (looks like: `https://xxxxx.upstash.io`)
2. Copy **Password** (in "Auth" section)

Save these:
```
Host: xxxxx.upstash.io
Port: 6379
Password: [your-password]
```

---

## STEP 4: Update .env File

### Open .env
```bash
cd c:\Repositories\qurable-challenge
# Edit .env with your favorite editor (VSCode, Notepad++, etc.)
```

### Update PostgreSQL Settings
Replace these lines:
```env
DB_HOST=db.xxxxx.supabase.co          # From Supabase
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-supabase-password    # From Supabase
DB_DATABASE=postgres
```

### Update Redis Settings
Replace these lines:
```env
REDIS_HOST=xxxxx.upstash.io           # From Upstash
REDIS_PORT=6379
REDIS_PASSWORD=your-upstash-password  # From Upstash
REDIS_DB=0
```

### Your updated .env should look like:
```env
NODE_ENV=development
PORT=3000
API_VERSION=v1

DB_HOST=db.xxxxxxxxxxx.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=xxxxxxxxxxxxxxxxxxxx
DB_DATABASE=postgres
DB_SYNCHRONIZE=false
DB_LOGGING=true
DB_MAX_CONNECTIONS=20

REDIS_HOST=xxxxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=xxxxxxxxxxxxxxxxxxxx
REDIS_DB=0
REDIS_TTL_DEFAULT=300

JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

COUPON_LOCK_DURATION_SECONDS=300
COUPON_CLEANUP_CRON=*/1 * * * *

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

LOG_LEVEL=debug
LOG_FILE_PATH=./logs/app.log

CORS_ORIGIN=http://localhost:3000,http://localhost:3001

ENABLE_REDIS_CACHE=true
ENABLE_AUDIT_LOGGING=true
ENABLE_RATE_LIMITING=true
```

---

## STEP 5: Test Connections

### Test PostgreSQL Connection
```powershell
cd c:\Repositories\qurable-challenge

# Install PostgreSQL client (if you don't have psql)
# Or use: npm install -g pg-cli

# Test connection
psql -h db.xxxxx.supabase.co -U postgres -d postgres -c "SELECT version();"

# It should return PostgreSQL version
```

If psql not available, no problem - we'll test when we run migrations.

### Test Redis Connection
```powershell
# Install Redis CLI or use npm
npm install -g redis-cli

# Test connection
redis-cli -h xxxxx.upstash.io -a your-password ping

# Should return: PONG
```

---

## STEP 6: Generate & Run Migrations

### Build TypeScript
```powershell
cd c:\Repositories\qurable-challenge
npm run build
```

### Generate Initial Migration
```powershell
npm run migration:generate -- src/migrations/InitialSchema
```

You should see:
```
Migration src/migrations/InitialSchema created successfully
```

### Run Migrations
```powershell
npm run migration:run
```

You should see:
```
✅ Database query: "CREATE TABLE..."
✅ Database query: "CREATE INDEX..."
...
✅ All migrations have been executed successfully
```

This creates the 4 tables:
- `coupon_books`
- `coupon_codes`
- `coupon_assignments`
- `redemption_audit`

---

## STEP 7: Start Development Server

### Start Server
```powershell
npm run dev
```

You should see:
```
✅ Database initialized
✅ Redis connection established
🚀 Server running on port 3000
📝 Environment: development
🌐 API URL: http://localhost:3000/api/v1
```

### Test Server
Open another PowerShell window and test:

```powershell
# Health check
curl http://localhost:3000/health

# API ping
curl http://localhost:3000/api/v1/ping
```

You should get JSON responses.

---

## 🎉 SUCCESS!

If you see the server running and both curl commands work, you have successfully:
- ✅ Installed Docker
- ✅ Created Supabase database
- ✅ Created Upstash Redis
- ✅ Configured .env
- ✅ Created database tables
- ✅ Started dev server

---

## 🔍 Verify in Supabase Console

1. Go to Supabase dashboard
2. Click your project
3. Go to **SQL Editor** → **SQL templates**
4. Run: `SELECT * FROM coupon_books;`
5. You should see empty table (no errors = ✅ table exists)

---

## ✅ Checklist

Before moving to next steps, verify:

- [ ] Docker Desktop installed (`docker --version` works)
- [ ] Supabase account created
- [ ] Upstash account created
- [ ] .env updated with correct credentials
- [ ] `npm run migration:run` executed successfully
- [ ] `npm run dev` server starts
- [ ] `curl http://localhost:3000/health` returns JSON
- [ ] `curl http://localhost:3000/api/v1/ping` returns JSON

---

## 🆘 Troubleshooting

### "Cannot connect to database"
```
Check:
1. .env DB_HOST, DB_USER, DB_PASSWORD correct
2. Supabase project is running (green status)
3. Network firewall allows outbound to Supabase
```

### "Cannot connect to Redis"
```
Check:
1. .env REDIS_HOST, REDIS_PASSWORD correct
2. Upstash redis is running
3. Password copied exactly (no extra spaces)
```

### "Migration failed"
```
Check:
1. Database connection works (test query first)
2. No typos in DB_HOST or credentials
3. Try: npm run migration:run again
```

### "Port 3000 already in use"
```
Change PORT in .env:
PORT=3001

Or kill process:
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows
```

---

## ⏭️ Next Steps

Once server is running:

1. **Implement DTOs** (Zod validation)
2. **Create Routes** (structure)
3. **Build Controllers** (endpoints)
4. **Services Layer** (business logic)

See [../README.md](../README.md) for full roadmap.

---

**Estimated time to complete:** 30 minutes  
**Expected outcome:** Server running, database connected, ready to code

Let me know when you're done! 🚀
