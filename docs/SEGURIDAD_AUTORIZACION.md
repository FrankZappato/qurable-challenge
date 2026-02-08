# 🔐 Seguridad y Autorización - Qurable API

## Tabla de Contenidos
1. [Introducción](#introducción)
2. [Estrategias de Autenticación](#estrategias-de-autenticación)
3. [Modelo de Autorización](#modelo-de-autorización)
4. [Implementación Recomendada](#implementación-recomendada)
5. [Best Practices](#best-practices)
6. [Matriz de Permisos](#matriz-de-permisos)

---

## Introducción

La API de Qurable actualmente **no tiene autenticación ni autorización implementadas**. Este documento propone las mejores prácticas y estrategias para agregar estas capas de seguridad esenciales.

### ¿Por qué es crítico?

- **Datos sensibles**: Cupones, asignaciones, users
- **Conflictos de negocio**: Evitar que usuarios accedan a cupones de otros
- **Auditoría**: Rastrear quién hizo qué
- **Rate limiting**: Prevenir abuso y DoS

---

## Estrategias de Autenticación

### 1. JWT (JSON Web Tokens) - ⭐ RECOMENDADO

**Ventajas:**
- Stateless (no requiere sesiones en servidor)
- Escalable horizontalmente
- Compatible con microservicios
- Estándar de la industria

**Flujo:**
```
1. Usuario inicia sesión con credenciales
2. Servidor valida y emite JWT firmado
3. Cliente envía JWT en header Authorization
4. Servidor verifica firma y expira fecha
```

**Estructura JWT:**
```
Header:   { alg: "HS256", typ: "JWT" }
Payload:  { sub: "userId", role: "admin", exp: 1735689600, iat: 1735689000 }
Signature: HMACSHA256(base64(header) + "." + base64(payload), SECRET_KEY)
```

**Ventana temporal recomendada:**
- **Access Token**: 15-30 minutos (corta para seguridad)
- **Refresh Token**: 7-30 días (larga para conveniencia)

---

### 2. OAuth 2.0

**Casos de uso:**
- Integrar terceros (Google, Facebook, GitHub)
- SSO corporativo (con Azure AD, Okta)
- Delegación de permisos

**Flujo Básico:**
```
1. Usuario hace clic en "Login with Google"
2. Redirige a Google para autentication
3. Google redirige con código de autorización
4. Backend intercambia código por token
5. Backend crea sesión local con JWT
```

---

### 3. API Keys

**Casos de uso:**
- Acceso de máquina a máquina (M2M)
- Integración de terceros
- Webhooks seguros

**Ventajas:**
- Simple para APIs público-privadas
- Fácil de revocar

**Desventajas:**
- Requiere almacenamiento seguro
- No revoca automática

---

## Modelo de Autorización

### Roles Propuestos

```typescript
enum UserRole {
  ADMIN = "admin",           // Acceso total, gestión de sistema
  BUSINESS_OWNER = "business_owner",  // Gestiona sus propios cupones
  USER = "user",              // Recibe y usa cupones
  SUPPORT = "support"        // Lee-solo, soporte a clientes
}
```

### Permisos por Rol

```typescript
interface RolePermissions {
  admin: {
    // Coupon Books
    create: true,
    read: true,
    update: true,
    delete: true,
    // Coupon Codes
    generate: true,
    upload: true,
    manage: true,
    // Assignments
    assign: true,
    force_redeem: true,
    // Auditoría
    view_logs: true,
    view_all_users: true
  },
  
  business_owner: {
    // Coupon Books (solo sus propios)
    create: true,
    read: "own_only",
    update: "own_only",
    delete: "own_only",
    // Coupon Codes
    generate: "own_books",
    upload: "own_books",
    // Assignments
    assign: "own_books",
    // Auditoría
    view_logs: "own_books"
  },
  
  user: {
    // Coupon Books
    read: "assigned",
    // Assignments
    view_own: true,
    // Redemption
    lock: "own",
    unlock: "own",
    redeem: "own"
  },
  
  support: {
    read: true,
    // No write
  }
}
```

---

## Implementación Recomendada

### Stack de Seguridad

```
┌─────────────────────────────────────────────────────────┐
│ Cliente (Postman, Web App, Mobile)                      │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS + JWT
┌──────────────────────▼──────────────────────────────────┐
│ API Gateway / Load Balancer (AWS ALB)                   │
│ - Rate Limiting                                         │
│ - CORS validation                                       │
│ - WAF (Web Application Firewall)                        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│ Authentication Middleware                               │
│ - Verifica JWT                                          │
│ - Valida firma                                          │
│ - Chequea expiración                                    │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│ Authorization Middleware                                │
│ - Verifica permisos del usuario                         │
│ - Aplica restricciones de recurso                       │
│ - Audita la acción                                      │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│ Business Logic (Controllers, Services)                  │
└─────────────────────────────────────────────────────────┘
```

### Estructura de Carpetas para Seguridad

```
src/
├── auth/
│   ├── dto/
│   │   ├── auth.dto.ts          # Login, register DTOs
│   │   └── token.dto.ts         # JWT DTOs
│   ├── services/
│   │   ├── auth.service.ts      # Lógica de authentication
│   │   ├── jwt.service.ts       # Generación/validación de JWT
│   │   └── permission.service.ts # Evaluación de permisos
│   ├── guards/
│   │   ├── jwt.guard.ts         # Middleware de JWT
│   │   └── permission.guard.ts  # Middleware de autorización
│   └── controllers/
│       └── auth.controller.ts   # Login, register, refresh
├── middlewares/
│   ├── authentication.ts        # Verifica JWT
│   ├── authorization.ts         # Verifica permisos
│   ├── errorHandler.ts          # Manejo de errores de auth
│   └── auditLog.ts              # Registra acciones
└── entities/
    └── User.entity.ts           # Usuario con roles/permisos
```

---

## Implementación Paso a Paso

### 1. Instalar Dependencias

```bash
npm install jsonwebtoken bcryptjs
npm install --save-dev @types/jsonwebtoken
```

### 2. Crear User Entity (con hash de contraseña)

```typescript
// src/entities/User.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from '../types/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;  // ⚠️ NUNCA almacenar contraseña en texto plano

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'uuid', nullable: true })
  businessId?: string;  // Para business owners

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastLoginAt?: Date;
}
```

### 3. JWT Service

```typescript
// src/auth/services/jwt.service.ts
import jwt from 'jsonwebtoken';
import { config } from '../../config/environment';

export interface JWTPayload {
  sub: string;        // user ID
  email: string;
  role: string;
  businessId?: string;
  iat: number;
  exp: number;
}

export class JWTService {
  // Generar Access Token (corta duración)
  generateAccessToken(userId: string, email: string, role: string, businessId?: string): string {
    const payload: JWTPayload = {
      sub: userId,
      email,
      role,
      businessId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60),  // 15 minutos
    };

    return jwt.sign(payload, config.jwt.accessSecret, {
      algorithm: 'HS256',
    });
  }

  // Generar Refresh Token (larga duración)
  generateRefreshToken(userId: string): string {
    const payload = {
      sub: userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),  // 30 días
    };

    return jwt.sign(payload, config.jwt.refreshSecret);
  }

  // Validar y decodificar token
  verifyAccessToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, config.jwt.accessSecret) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  // Validar refresh token
  verifyRefreshToken(token: string): { sub: string } | null {
    try {
      return jwt.verify(token, config.jwt.refreshSecret) as { sub: string };
    } catch (error) {
      return null;
    }
  }
}
```

### 4. Authentication Middleware

```typescript
// src/middlewares/authentication.ts
import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../auth/services/jwt.service';
import { UnauthorizedError } from '../utils/errors';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        businessId?: string;
      };
    }
  }
}

export const authenticationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = extractToken(req);

  if (!token) {
    throw new UnauthorizedError('Missing authorization token');
  }

  const jwtService = new JWTService();
  const payload = jwtService.verifyAccessToken(token);

  if (!payload) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  // Adjuntar usuario a request
  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    businessId: payload.businessId,
  };

  next();
};

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
```

### 5. Authorization Middleware (Permisos)

```typescript
// src/middlewares/authorization.ts
import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';
import { UserRole } from '../types/enums';

export type PermissionCheck = 'admin' | 'business_owner' | 'user' | 'any';

export const authorizationMiddleware = (requiredRole: PermissionCheck) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    // Permitir admin sin restricciones
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    // Chequear rol requerido
    const hasPermission = checkPermission(req.user.role, requiredRole);

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
};

function checkPermission(userRole: string, requiredRole: PermissionCheck): boolean {
  const roleHierarchy: Record<string, number> = {
    [UserRole.ADMIN]: 4,
    [UserRole.BUSINESS_OWNER]: 3,
    [UserRole.SUPPORT]: 2,
    [UserRole.USER]: 1,
  };

  if (requiredRole === 'any') return true;
  
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = requiredRole === 'admin' ? 4 : 1;

  return userLevel >= requiredLevel;
}
```

### 6. Usar en Routes

```typescript
// src/routes/couponBook.routes.ts
import { Router } from 'express';
import { authenticationMiddleware } from '../middlewares/authentication';
import { authorizationMiddleware } from '../middlewares/authorization';
import { CouponBookController } from '../controllers/couponBook.controller';

const router = Router();
const controller = new CouponBookController();

// POST - Crear: Admin o Business Owner
router.post(
  '/',
  authenticationMiddleware,
  authorizationMiddleware('business_owner'),
  controller.create.bind(controller)
);

// GET - Listar: Cualquiera autenticado
router.get(
  '/',
  authenticationMiddleware,
  controller.getAll.bind(controller)
);

// PATCH - Actualizar solo propios: Business Owner
router.patch(
  '/:id',
  authenticationMiddleware,
  authorizationMiddleware('business_owner'),
  controller.update.bind(controller)  // ← Dentro del controller, verificar que sea su propio book
);

export const couponBookRoutes = router;
```

---

## Best Practices de Seguridad

### 1. Contraseñas

```typescript
import bcrypt from 'bcryptjs';

// Al registrar
const salt = await bcrypt.genSalt(10);
const passwordHash = await bcrypt.hash(password, salt);

// Al verificar
const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);
```

### 2. Rate Limiting

```typescript
// src/middlewares/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 5,                     // 5 intentos
  message: 'Too many login attempts',
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minuto
  max: 100,             // 100 requests
  skip: (req) => req.user?.role === 'admin',  // Admin no limitado
});
```

### 3. HTTPS en Producción

```typescript
// app.ts
if (config.env === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

### 4. CORS Seguro

```typescript
// app.ts
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### 5. Validación y Sanitización

```typescript
// src/dto/auth.dto.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[!@#$%^&*]/, 'Password must contain special character'),
});

export type LoginDTO = z.infer<typeof loginSchema>;
```

### 6. Auditoría de Acciones

```typescript
// src/entities/AuditLog.entity.ts
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  action: string;  // 'CREATE_BOOK', 'REDEEM_COUPON', etc.

  @Column({ type: 'jsonb' })
  details: {
    resourceId: string;
    resourceType: string;
    before?: any;
    after?: any;
    ip: string;
    userAgent: string;
  };

  @Column()
  status: 'success' | 'failure';

  @CreateDateColumn()
  timestamp: Date;
}
```

### 7. Secretos en Ambiente

```bash
# .env
JWT_ACCESS_SECRET=your-super-secret-key-min-32-chars
JWT_REFRESH_SECRET=another-secret-key-min-32-chars
JWT_EXPIRATION=900  # 15 minutos
BCRYPT_ROUNDS=10
```

---

## Matriz de Permisos

| Endpoint | Admin | Business Owner | User | Support | Público |
|----------|-------|----------------|------|---------|---------|
| POST /auth/login | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST /coupon-books | ✓ | ✓ (propios) | ✗ | ✗ | ✗ |
| GET /coupon-books | ✓ | ✓ (propios) | ✓ (asignados) | ✓ | ✗ |
| PATCH /coupon-books/:id | ✓ | ✓ (propios) | ✗ | ✗ | ✗ |
| POST /coupon-codes/generate | ✓ | ✓ (propios) | ✗ | ✗ | ✗ |
| POST /assignments/random | ✓ | ✓ (propios) | ✗ | ✗ | ✗ |
| POST /coupons/:code/lock | ✓ | ✓ | ✓ (propios) | ✗ | ✗ |
| POST /coupons/:code/redeem | ✓ | ✓ | ✓ (propios) | ✗ | ✗ |
| GET /audit-logs | ✓ | ✓ (propios) | ✗ | ✓ (lectura) | ✗ |

---

## Checklist de Implementación

- [ ] Crear tabla `users` con User entity
- [ ] Implementar JWT service
- [ ] Crear auth controller (login, register, refresh)
- [ ] Agregar authentication middleware
- [ ] Agregar authorization middleware
- [ ] Actualizar todas las routes con protección
- [ ] Implementar audit logging
- [ ] Agregar rate limiting
- [ ] Validación de contraseñas con bcrypt
- [ ] Tests de seguridad
- [ ] Documentar endpoints de auth
- [ ] Configurar HTTPS en producción
- [ ] Rotar secrets periódicamente
- [ ] Implementar 2FA (opcional, nivel 2)

---

## Endpoints de Autenticación a Agregar

### POST /api/v1/auth/register

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "Juan",
    "lastName": "Pérez"
  }'
```

### POST /api/v1/auth/login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'

# Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user"
  }
}
```

### POST /api/v1/auth/refresh

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "..."
  }'
```

### POST /api/v1/auth/logout

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer <accessToken>"
```

---

## Conclusión

Esta arquitectura de seguridad proporciona:
- ✅ Autenticación robusta con JWT
- ✅ Autorización granular por roles
- ✅ Auditoría completa de acciones
- ✅ Protección contra ataques comunes
- ✅ Escalabilidad horizontal
- ✅ Estándar de la industria

Para preguntas específicas sobre implementación, consult el código fuente o la documentación de las librerías utilizadas.
