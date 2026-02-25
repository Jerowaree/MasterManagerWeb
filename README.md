# Master Manager Web

Monorepo para **Master Manager**, una plataforma de gestion multi-tenant con:
- `apps/web`: frontend en Next.js
- `apps/api`: API en NestJS
- `packages/database`: capa de base de datos con Prisma

## Stack Tecnologico

- Node.js + TypeScript
- pnpm workspaces + Turborepo
- Frontend: Next.js 14, React 18, Tailwind CSS, Zod, React Hook Form
- Backend: NestJS 10, Passport/JWT, class-validator, Helmet
- Base de datos: PostgreSQL + Prisma
- Testing: Vitest

## Estructura

```txt
apps/
  web/        # Next.js
  api/        # NestJS
packages/
  database/   # Prisma schema + package compartido
```

## Requisitos

- Node.js 20+
- pnpm 9 (`corepack enable`)
- PostgreSQL disponible (local o cloud)

## Instalacion y Ejecucion Local

1. Instalar dependencias:

```bash
pnpm install
```

2. Crear variables de entorno:

- `apps/api/.env`
- `apps/web/.env.local`

Ejemplo para `apps/api/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
JWT_SECRET="cambia-este-secreto"
FRONTEND_URL="http://localhost:3000"
RESEND_API_KEY="re_xxx"
NODE_ENV="development"
```

Ejemplo para `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

3. Ejecutar migraciones y generar cliente Prisma:

```bash
pnpm --filter @master-manager/api run db:migrate
pnpm --filter @master-manager/api run db:generate
```

4. Levantar todo el monorepo:

```bash
pnpm dev
```

Servicios por defecto:
- Web: `http://localhost:3000`
- API: `http://localhost:3001`

## Scripts

### Raiz

- `pnpm dev`: desarrollo de todos los workspaces con Turbo
- `pnpm build`: build de todos los workspaces
- `pnpm lint`: lint de todos los workspaces

### Web (`@master-manager/web`)

- `pnpm --filter @master-manager/web dev`
- `pnpm --filter @master-manager/web build`
- `pnpm --filter @master-manager/web start`
- `pnpm --filter @master-manager/web lint`
- `pnpm --filter @master-manager/web test`

### API (`@master-manager/api`)

- `pnpm --filter @master-manager/api start:dev`
- `pnpm --filter @master-manager/api build`
- `pnpm --filter @master-manager/api start:prod`
- `pnpm --filter @master-manager/api lint`
- `pnpm --filter @master-manager/api test`
- `pnpm --filter @master-manager/api db:migrate`
- `pnpm --filter @master-manager/api db:generate`
- `pnpm --filter @master-manager/api db:studio`

### Database (`@master-manager/database`)

- `pnpm --filter @master-manager/database prisma:generate`
- `pnpm --filter @master-manager/database prisma:migrate`
- `pnpm --filter @master-manager/database build`
- `pnpm --filter @master-manager/database lint`

## Deployment

### Opcion recomendada (separado)

1. **Base de datos PostgreSQL** (Neon, Supabase, RDS, etc.)
2. **API (NestJS)** en Render/Railway/Fly.io
3. **Web (Next.js)** en Vercel

### Variables de entorno en Produccion

API:
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL` (URL publica del frontend)
- `RESEND_API_KEY`
- `NODE_ENV=production`

Web:
- `NEXT_PUBLIC_API_URL` (URL publica del backend)

### Build y arranque en produccion

API:
```bash
pnpm install --frozen-lockfile
pnpm --filter @master-manager/api build
pnpm --filter @master-manager/api start:prod
```

Web:
```bash
pnpm install --frozen-lockfile
pnpm --filter @master-manager/web build
pnpm --filter @master-manager/web start
```

### Migraciones en produccion

Antes de iniciar la API, aplica migraciones sobre la DB de produccion:

```bash
pnpm --filter @master-manager/api exec prisma migrate deploy --schema ../../packages/database/prisma/schema.prisma
pnpm --filter @master-manager/api exec prisma generate --schema ../../packages/database/prisma/schema.prisma
```

## Checklist rapido para deploy

1. Configurar variables de entorno en Web y API.
2. Ejecutar migraciones Prisma en la base de datos destino.
3. Publicar API y validar `GET /`.
4. Publicar Web apuntando a `NEXT_PUBLIC_API_URL`.
5. Verificar CORS (`FRONTEND_URL`) y login con cookies/JWT.

