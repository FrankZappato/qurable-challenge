# Setup Without Docker

For environments where Docker isn't available (corporate restrictions, WSL issues, etc.).

## Option A: PostgreSQL + Redis Locally

### Install PostgreSQL 15
1. Download: https://www.postgresql.org/download/windows/
2. Run installer with defaults
3. Note username/password during setup

### Install Redis
Option 1: WSL2 + Redis
```bash
wsl --install  # Install WSL if needed
# In WSL:
sudo apt update && sudo apt install redis-server
sudo service redis-server start
```

Option 2: Memurai (Windows Redis)
https://www.memurai.com/

### Update .env
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=[your-password]
DB_DATABASE=coupon_service

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional
```

### Continue
```bash
npm run migration:run
npm run dev
```

---

## Option B: Cloud Services

### PostgreSQL: Supabase
1. https://supabase.com
2. Create free account
3. Create project
4. Copy connection string

### Redis: Upstash
1. https://upstash.com
2. Create free account
3. Create Redis database
4. Copy connection details

### Update .env
```env
DB_HOST=[supabase-host]
DB_PASSWORD=[supabase-password]
REDIS_HOST=[upstash-host]
REDIS_PASSWORD=[upstash-password]
```

### Continue
```bash
npm run migration:run
npm run dev
```

---

See [SETUP_DOCKER_SUPABASE_UPSTASH.md](./SETUP_DOCKER_SUPABASE_UPSTASH.md) for detailed instructions.
