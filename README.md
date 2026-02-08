# 🎟️ Qurable Coupon Service

High-performance coupon book management system with TypeScript, Express, PostgreSQL, and Redis.

## 🚀 Quick Start (30 minutes)

### Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **(Optional)** Docker Desktop for containerization

### 1️⃣ Installation
```bash
git clone <repository-url>
cd qurable-challenge
npm install
```
✅ 619 packages installed successfully

### 2️⃣ Infrastructure Setup (Choose One)

#### 🔥 **RECOMMENDED: Cloud Services (Supabase + Upstash)**
- ✅ Fastest setup (5 minutes)
- ✅ Free tier available
- ✅ No Docker Desktop required
- 📖 Follow: [docs/SETUP_DOCKER_SUPABASE_UPSTASH.md](./docs/SETUP_DOCKER_SUPABASE_UPSTASH.md)

#### 🐳 **Alternative: Local Docker Compose**
```bash
docker-compose up -d  # PostgreSQL + Redis + pgAdmin
```
- 📖 See: [docs/SETUP_WITHOUT_DOCKER.md](./docs/SETUP_WITHOUT_DOCKER.md)

### 3️⃣ Environment Setup
```bash
cp .env.example .env
# Edit .env with your credentials:
# - DB connection (Supabase or local)
# - Redis connection (Upstash or local)
```

### 4️⃣ Run Migrations & Start
```bash
npm run migration:run  # Create database schema
npm run dev           # Start development server
```

### ✨ Verification
- **Health check**: http://localhost:3000/health
- **API prefix**: http://localhost:3000/api/v1
- **Expected response**: `{"status":"ok"}`

👉 **[Complete Setup Instructions](./NEXT_STEPS.md)**

---

## 📚 Documentation

### 👉 START HERE (Pick One)
- **[NEXT_STEPS.md](./NEXT_STEPS.md)** - Your immediate next action (7-step setup)
- **[SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)** - Detailed checklist with troubleshooting
- **[QUICK_COMMANDS.md](./QUICK_COMMANDS.md)** - All npm commands reference

### 📖 Full Documentation (in `docs/` folder)
- **[PROJECT_GUIDE.md](./PROJECT_GUIDE.md)** - Complete project overview & directory structure
- **[System Analysis & Architecture](./docs/SYSTEM_ANALYSIS.md)** - Design decisions, database selection, concurrency model
- **[API Design & Specifications](./docs/API_DESIGN.md)** - All endpoints, DTOs, pseudocode
- **[4-Day Development Roadmap](./docs/4_DAY_ROADMAP.md)** - Day-by-day implementation plan
- **[Project Status](./docs/PROJECT_STATUS.md)** - Real-time progress tracking
- **[Setup Guide (Docker + Supabase + Upstash)](./docs/SETUP_DOCKER_SUPABASE_UPSTASH.md)** - **MAIN SETUP GUIDE** with step-by-step instructions
- **[Setup Without Docker](./docs/SETUP_WITHOUT_DOCKER.md)** - Alternative infrastructure options

---

## ⚡ Getting Started (3 Steps)

### Step 1: Install Docker & Cloud Services (15 min)
Follow: **[docs/SETUP_DOCKER_SUPABASE_UPSTASH.md](./docs/SETUP_DOCKER_SUPABASE_UPSTASH.md)**

- Install Docker Desktop
- Create Supabase (PostgreSQL) account
- Create Upstash (Redis) account
- Update `.env` file

### Step 2: Run Migrations (2 min)
```bash
npm run migration:run
```

### Step 3: Start Server (30 sec)
```bash
npm run dev
```

**Done!** Server running at http://localhost:3000 ✅

---

## 🏗️ Architecture Overview

### Tech Stack
- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL 15 (with TypeORM)
- **Cache**: Redis 7
- **Validation**: Zod
- **Testing**: Jest + Supertest
- **Logging**: Winston

### Core Features
- ✅ Create & manage coupon books
- ✅ Generate codes (pattern-based) or upload manually
- ✅ Assign coupons (random or specific) to users
- ✅ **Lock temporal** with race-condition prevention
- ✅ **Redeem permanente** with multi-redeem support
- ✅ Audit trail for compliance
- ✅ Background cleanup job for expired locks

---

## 📁 Project Structure

```
qurable-challenge/
├── src/
│   ├── config/           # Configuration (DB, Redis, environment)
│   ├── entities/         # TypeORM entities
│   ├── dto/              # Zod validation schemas
│   ├── services/         # Business logic layer
│   ├── controllers/      # Express route handlers
│   ├── middlewares/      # Express middlewares
│   ├── utils/            # Utilities (logger, errors, helpers)
│   ├── migrations/       # Database migrations
│   ├── __tests__/        # Unit & integration tests
│   └── server.ts         # Application entry point
├── scripts/              # Database initialization scripts
├── docs/                 # Additional documentation
├── postman/              # Postman collections
├── docker-compose.yml    # Docker infrastructure
├── package.json
└── tsconfig.json
```

---

## 🔧 Available Scripts

### Development
```bash
npm run dev              # Start dev server with hot-reload
npm run build            # Build for production
npm start                # Start production server
```

### Database
```bash
npm run migration:generate -- src/migrations/MigrationName  # Generate migration
npm run migration:run    # Run pending migrations
npm run migration:revert # Revert last migration
npm run db:seed          # Seed database with test data
```
 (All endpoints in detail at [API_DESIGN_DETAILED.md](./API_DESIGN_DETAILED.md))
### Docker
```bash
npm run docker:up        # Start PostgreSQL + Redis
npm run docker:down      # Stop containers
npm run docker:logs      # View logs
```

### Testing
```bash
npm test                 # Run all tests with coverage
npm run test:watch       # Run tests in watch mode
npm run test:integration # Run integration tests only
```

### Code Quality
```bash
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm run format           # Format code with Prettier
```

---

## 🌐 API Endpoints

### Coupon Books
```
POST   /api/v1/coupon-books              # Create book
GET    /api/v1/coupon-books/{id}         # Get book details
PATCH  /api/v1/coupon-books/{id}         # Update book
```

### Code Management
```
POST   /api/v1/coupon-books/{id}/generate  # Generate codes
POST   /api/v1/coupon-books/{id}/codes     # Upload codes
GET    /api/v1/coupon-books/{id}/codes     # List codes
```

### Coupon Operations
```
POST   /api/v1/coupons/assign              # Assign random code
POST   /api/v1/coupons/assign/{code}       # Assign specific code
POST   /api/v1/coupons/{code}/lock         # Lock coupon (temporal)
POST   /api/v1/coupons/{code}/redeem       # Redeem coupon (permanent)
POST   /api/v1/coupons/{code}/unlock       # Unlock coupon
```

### User Management
```
GET    /api/v1/users/{userId}/coupons     # Get user's coupons
```

---

## 🔐 Key Design Decisions

### 1. **Pessimistic Locking** (Race-Condition Prevention)
```sql
SELECT * FROM coupon_codes 
WHERE code = 'ABC123' 
FOR UPDATE;  -- Row-level lock
```
Prevents double-redemption when multiple users attempt simultaneously.

### 2. **Two-Phase Redemption** (Lock → Redeem)
- **Lock (temporal)**: Reserve coupon while processing payment (TTL: 5 min)
- **Redeem (permanent)**: Finalize after payment success

### 3. **Multi-Redeem Support**
Configurable `max_redeems_per_user` at book level:
- `null` = unlimited
- `1` = single-use (default)
- `N` = reusable N times

### 4. **Audit Trail**
Every state transition logged in `redemption_audit` for compliance.

---

## 🧪 Testing Strategy

### Unit Tests (50%+ coverage)
```bash
npm test -- services/assignment.service.test.ts
```

### Integration Tests
```bash
npm run test:integration
```

### Load Testing (Artillery)
```bash
artillery run load-tests/config.yml
```

---

## 🐳 Docker Infrastructure

### Services
- **PostgreSQL 15**: Port 5432
- **Redis 7**: Port 6379
- **pgAdmin**: Port 5050 (http://localhost:5050)

### Credentials
- **PostgreSQL**: `qurable` / `qurable_dev_password`
- **Redis**: Password `qurable_redis_password`
- **pgAdmin**: `admin@qurable.local` / `admin`

---

## 📊 Database Schema

### Core Tables
- `coupon_books`: Coupon book metadata
- `coupon_codes`: Individual coupon codes
- `coupon_assignments`: User-code relationships
- `redemption_audit`: Audit trail

See [API_DESIGN_DETAILED.md](./API_DESIGN_DETAILED.md#3-typeorm-entities) for full schema.

---

## 🔒 Security Considerations

- ✅ Input validation with Zod
- ✅ Rate limiting (100 req/min per IP)
- ✅ Helmet.js (security headers)
- ✅ CORS configuration
- ✅ SQL injection prevention (TypeORM parameterized queries)
- ✅ Error sanitization (no stack traces in production)

---

## 🚀 Deployment (Future)

### AWS Architecture
```
ALB → ECS Fargate (Node.js) → RDS PostgreSQL + ElastiCache Redis
```

See [SYSTEM_ANALYSIS.md](./SYSTEM_ANALYSIS.md#8-deployment-architecture) for details.

---

## 📝 Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:
- `DB_HOST`, `DB_PORT`, `DB_PASSWORD`: PostgreSQL connection
- `REDIS_HOST`, `REDIS_PASSWORD`: Redis connection
- `COUPON_LOCK_DURATION_SECONDS`: Lock TTL (default: 300s)
- `ENABLE_REDIS_CACHE`: Enable caching (default: true)

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

## 👤 Author

**Qurable Technical Challenge**

For questions or support, contact: [your-email@example.com]

---

## 🎯 Project Status

- [x] Architecture Design
- [x] API Specification
- [x] Project Setup
- [ ] Core Features Implementation (Day 2-3)
- [ ] Testing & Documentation (Day 4)
- [ ] Demo Ready

---

**Built with ❤️ for the Qurable Technical Challenge**
