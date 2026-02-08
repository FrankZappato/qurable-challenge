# 🚀 Setup y Startup

## Prerequisitos

```
Sistema Operativo: Windows / Mac / Linux
Node.js: 18+ LTS
npm: 9+
Docker: 27+
Docker Compose: 2.20+
PostgreSQL: 15 (dentro de Docker)
Redis: 7 (dentro de Docker)
```

---

## Instalación Inicial

### 1. Clonar Repositorio
```bash
git clone https://github.com/tu-usuario/qurable-challenge.git
cd qurable-challenge
```

### 2. Instalar Dependencias
```bash
npm install
```

Este comando instala 619 paquetes definidos en package.json:
```json
{
  "dependencies": {
    "express": "^4.18.2",           // Framework HTTP
    "typeorm": "^0.3.16",            // ORM
    "pg": "^8.11.2",                 // Driver PostgreSQL
    "redis": "^4.6.10",              // Redis client
    "zod": "^3.22.4"                 // Validación runtime
  },
  "devDependencies": {
    "typescript": "^5.3.3",          // Type safety
    "ts-node-dev": "^2.0.0",         // Development server
    "tsx": "^4.7.0"                  // TypeScript executor
  }
}
```

### 3. Configurar Variables de Entorno
```bash
cp .env.example .env
```

Editar `.env`:
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=qurable
DB_PASSWORD=qurable_password
DB_NAME=coupon_service

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Logging
LOG_LEVEL=debug
```

### 4. Levantar Docker Containers
```bash
docker compose up -d
```

Esto inicia:
- PostgreSQL 15 en puerto 5432
- Redis 7 en puerto 6379
- pgAdmin en puerto 5050 (administrador PostgreSQL)

Verificar que los contenedores estén corriendo:
```bash
docker compose ps

# Output esperado:
# NAME                      STATUS
# qurable-postgres          Up 2 minutes
# qurable-redis            Up 2 minutes
```

---

## Startup del Servidor

### Development (con hot-reload)
```bash
npm run dev
```

Output esperado:
```
[INFO] 20:54:09 ts-node-dev ver. 2.0.0
✅ Database connection established
✅ Database initialized
🚀 Server running on port 3000
📝 Environment: development
🌐 API URL: http://localhost:3000/api/v1
```

El servidor estará disponible en:
- http://localhost:3000/api/v1

### Production (compilado)
```bash
npm run build    # Compila TypeScript → JavaScript
npm start        # Inicia app compilada
```

---

## Startup en Detalle (¿Qué pasa?)

### 1. TypeScript Compilation
```bash
ts-node-dev: Compila src/server.ts
├─ TypeScript → JavaScript
├─ Type checking (detecta errores)
└─ Carga módulos
```

### 2. Entrypoint: src/server.ts
```typescript
import { App } from './app';
import { AppDataSource } from './config/database';

const app = new App();
app.start();
```

### 3. App.start()
```typescript
// src/app.ts
class App {
  async start() {
    // 1. Inicializar base de datos
    await AppDataSource.initialize();
    
    // 2. Ejecutar migraciones
    await AppDataSource.runMigrations();
    
    // 3. Iniciar servidor Express
    this.server = this.app.listen(3000, () => {
      console.log('🚀 Server running on port 3000');
    });
  }
}
```

### 4. Database Initialization
```typescript
// src/config/database.ts
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  // Entidades a sincronizar
  entities: [
    CouponBook,
    CouponCode,
    CouponAssignment,
    RedemptionAudit
  ],
  
  // Migraciones a ejecutar
  migrations: ['src/migrations/*.ts'],
  
  synchronize: false,  // Usar migraciones explícitas
  logging: ['query', 'error']
});
```

Luego:
```
AppDataSource.initialize()
├─ Conecta a PostgreSQL
├─ Ejecuta CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
├─ Verifica tablas existentes
└─ Listo para operaciones
```

### 5. Migrations
```
Archivo: src/migrations/InitialSchema1770265209754.ts

up():
├─ CREATE TABLE coupon_books
├─ CREATE TABLE coupon_codes
├─ CREATE TABLE coupon_assignments
├─ CREATE TABLE redemption_audit
├─ CREATE INDEXES
├─ CREATE CONSTRAINTS
└─ ✓ Schema listo

down():
├─ DROP TABLE redemption_audit
├─ DROP TABLE coupon_assignments
├─ DROP TABLE coupon_codes
├─ DROP TABLE coupon_books
└─ Rollback completo
```

### 6. Express Router Setup
```typescript
// src/server.ts
const app = express();

// Middlewares
app.use(express.json());
app.use(errorHandler);

// Routes
app.use('/api/v1', apiRoutes);

// Server listen
app.listen(3000);
```

Rutas disponibles:
```
GET /api/v1/ping                          → Health check
POST /api/v1/coupon-books                 → Create book
GET /api/v1/coupon-books                  → List books
GET /api/v1/coupon-books/:id              → Get book
PATCH /api/v1/coupon-books/:id            → Update book
POST /api/v1/coupon-codes/generate        → Generate codes
POST /api/v1/coupon-codes/upload          → Upload codes
GET /api/v1/coupon-codes/book/:bookId     → List codes
POST /api/v1/assignments/random           → Assign random
POST /api/v1/assignments/:code            → Assign specific
GET /api/v1/assignments/user/:userId      → User assignments
```

---

## Verificar que Todo Funcione

### 1. Test Health Check
```bash
curl http://localhost:3000/api/v1/ping
# Response: { "message": "pong", "timestamp": "..." }
```

### 2. Test Database Connection
```bash
# Usar REST Client en VS Code (test.http)
# O Postman

GET http://localhost:3000/api/v1/ping
```

### 3. Acceder a pgAdmin (administrador PostgreSQL)
```
URL: http://localhost:5050
Login: admin@admin.com / admin
```

Luego:
```
Right-click "Servers"
├─ Register
├─ General: Name = "Local PostgreSQL"
├─ Connection:
│  ├─ Host name: localhost
│  ├─ Port: 5432
│  ├─ Username: qurable
│  ├─ Password: qurable_password
│  └─ Save password
└─ Save
```

---

## Estructura de Archivos

```
qurable-challenge/
├─ src/
│  ├─ config/
│  │  ├─ database.ts          # TypeORM DataSource
│  │  ├─ redis.ts             # Redis client (preparado)
│  │  └─ index.ts
│  │
│  ├─ controllers/            # HTTP handlers
│  │  ├─ couponBook.controller.ts
│  │  ├─ couponCode.controller.ts
│  │  ├─ assignment.controller.ts
│  │  └─ index.ts
│  │
│  ├─ services/               # Business logic
│  │  ├─ couponBook.service.ts
│  │  ├─ couponCode.service.ts
│  │  ├─ assignment.service.ts
│  │  └─ index.ts
│  │
│  ├─ repositories/           # Data access
│  │  ├─ couponBook.repository.ts
│  │  ├─ couponCode.repository.ts
│  │  ├─ couponAssignment.repository.ts
│  │  └─ index.ts
│  │
│  ├─ entities/               # TypeORM entities
│  │  ├─ CouponBook.entity.ts
│  │  ├─ CouponCode.entity.ts
│  │  ├─ CouponAssignment.entity.ts
│  │  ├─ RedemptionAudit.entity.ts
│  │  └─ index.ts
│  │
│  ├─ dto/                    # Data transfer objects
│  │  ├─ couponBook.dto.ts
│  │  ├─ couponCode.dto.ts
│  │  ├─ assignment.dto.ts
│  │  └─ index.ts
│  │
│  ├─ routes/                 # Express routes
│  │  ├─ couponBook.routes.ts
│  │  ├─ couponCode.routes.ts
│  │  ├─ assignment.routes.ts
│  │  └─ index.ts
│  │
│  ├─ middlewares/            # Express middlewares
│  │  ├─ validation.ts        # Zod validation
│  │  ├─ errorHandler.ts      # Global error handling
│  │  └─ index.ts
│  │
│  ├─ utils/                  # Utilities
│  │  ├─ codeGenerator.ts     # Code generation algorithms
│  │  ├─ errors.ts            # Custom error classes
│  │  └─ logger.ts            # Logging
│  │
│  ├─ types/                  # Global types
│  │  ├─ enums.ts             # CouponBookStatus, CouponCodeStatus, etc.
│  │  └─ index.ts
│  │
│  ├─ migrations/             # Database migrations
│  │  └─ InitialSchema1770265209754.ts
│  │
│  ├─ app.ts                  # Express app setup
│  └─ server.ts               # Entry point
│
├─ .env                        # Variables de entorno (local)
├─ .env.example               # Template
├─ .env.dev                   # Docker dev
├─ .env.supabase              # Cloud (no usado actualmente)
│
├─ docker-compose.yml         # Contenedores (PostgreSQL, Redis)
├─ tsconfig.json              # TypeScript config
├─ package.json               # Dependencies
├─ package-lock.json          # Lock de versiones
│
├─ test.http                  # REST Client tests
├─ DOCUMENTACION/             # Este directorio
│  ├─ 01-VISIÓN-GENERAL.md
│  ├─ 02-ARQUITECTURA-CAPAS.md
│  ├─ 03-TABLAS-RELACIONES.md
│  ├─ 04-ENDPOINTS.md
│  ├─ 05-FLUJOS-TRANSACCIONES.md
│  └─ 06-SETUP-STARTUP.md
│
└─ README.md                  # Intro al proyecto
```

---

## Troubleshooting

### Puerto 3000 en uso
```bash
# En PowerShell:
Get-NetTCPConnection -LocalPort 3000 | Get-Process
# Notar el PID
Stop-Process -Id <PID> -Force

# En macOS/Linux:
lsof -i :3000
kill -9 <PID>
```

### PostgreSQL no conecta
```bash
# Verificar containers corriendo:
docker compose ps

# Ver logs:
docker compose logs qurable-postgres

# Reiniciar:
docker compose restart qurable-postgres
```

### Migraciones fallidas
```bash
# Rollback y reintentar:
npm run migration:revert
npm run migration:run
```

### TypeScript compilation errors
```bash
# Validar tipos:
npm run type-check

# Ver errores específicos:
npx tsc --noEmit
```

---

## Scripts Disponibles

```bash
npm run dev              # Desarrollo con hot-reload
npm run build            # Compilar TypeScript
npm start               # Iniciar (compilado)
npm run type-check      # Validar tipos
npm test               # Ejecutar tests
npm run migration:gen  # Generar migración
npm run migration:run  # Aplicar migraciones
npm run migration:revert  # Revertir migración

# Docker
docker compose up -d   # Levantar contenedores
docker compose down    # Bajar contenedores
docker compose logs    # Ver logs
```

---

## Logs y Debugging

### Habilitar logs detallados
```typescript
// src/config/database.ts
logging: ['query', 'error', 'migration']
```

Mostrará:
```
query: SELECT * FROM coupon_codes WHERE status = 'AVAILABLE'
query: UPDATE coupon_codes SET status = 'ASSIGNED' WHERE id = '...'
```

### Debug mode
```bash
DEBUG=* npm run dev
```

### VS Code Debugger
Crear `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "program": "${workspaceFolder}/src/server.ts",
      "preLaunchTask": "tsc: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "console": "integratedTerminal"
    }
  ]
}
```

Luego: F5 para debuggear.

