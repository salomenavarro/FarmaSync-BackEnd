# FarmaSync Backend

API base de FarmaSync. Este repositorio es independiente del frontend y queda preparado para Node.js + NestJS, PostgreSQL y Prisma. La funcionalidad de negocio se implementará después de aprobar los contratos pendientes; por ahora existe el bootstrap, la conexión preparada y un endpoint operativo de salud.

## Stack y responsabilidades

- **Node.js + NestJS:** servidor HTTP, módulos y dependency injection.
- **PostgreSQL:** persistencia local externa al contenedor.
- **Prisma:** ORM adoptado; sus adaptadores vivirán en `infrastructure`.
- **Zod:** validación de configuración; los DTOs de cada endpoint se definirán en su slice.
- **ValidationPipe:** protección del borde NestJS cuando se agreguen DTOs.

El backend será un monolito modular. No se crearán microservicios ni capas genéricas sin una necesidad comprobada.

## Estructura actual y objetivo

```text
src/
├── main.ts                       # bootstrap, CORS, prefijo y pipes globales
├── app.module.ts                 # composición de módulos
├── config/
│   └── environment.ts            # validación de variables con Zod
├── shared/
│   ├── database/
│   │   ├── database.module.ts
│   │   └── prisma.service.ts     # único acceso común al cliente Prisma
│   └── health/
│       ├── health.controller.ts  # GET /api/v1/health
│       └── health.module.ts
└── modules/
    ├── auth/                     # RF-001..RF-004, RF-015, RF-017
    ├── users/                    # RF-016 y perfil
    ├── medicines/                # RF-005 y RF-011
    ├── reservations/             # RF-006..RF-010, RF-013, RF-014, RF-018
    ├── notifications/            # RF-012 y RF-019
    └── reports/                  # reportes EPS
prisma/
└── schema.prisma                 # datasource PostgreSQL y cliente Prisma
test/
```

Cuando un módulo se implemente tendrá esta división:

```text
modules/reservations/
├── domain/                       # entidades, invariantes y puertos
├── application/                  # casos de uso y DTOs de aplicación
├── infrastructure/              # repositorios/adaptadores Prisma
└── presentation/http/            # controllers y DTOs de entrada
```

### Reglas de dependencia

1. `domain` no importa NestJS, Prisma ni HTTP.
2. `application` coordina casos de uso mediante puertos.
3. `infrastructure` implementa persistencia y servicios externos.
4. `presentation` valida, autentica, autoriza y traduce HTTP.
5. Controllers sin reglas de negocio; transiciones de reserva y stock serán transaccionales.

## Flujo de información

```mermaid
flowchart TD
    Client[Cliente web Next.js] -->|HTTP JSON / cookies| Controller[Controller NestJS]
    Controller --> Pipe[ValidationPipe + DTO]
    Pipe --> Guard[Guard de autenticación/rol]
    Guard --> UseCase[ Caso de uso ]
    UseCase --> Port[Puerto de repositorio]
    Port --> Adapter[Adaptador Prisma]
    Adapter --> PostgreSQL[(PostgreSQL local)]
    UseCase --> Response[DTO de respuesta]
    Response --> Client
```

El único endpoint disponible en este scaffold es `GET /api/v1/health`. No representa todavía un contrato funcional de las HU.

## Configuración local

Requisitos: Node.js 22+, npm y PostgreSQL local.

1. Crear la base de datos `farmasyncdb` con el usuario `postgres` y contraseña `postgres`.
2. Copiar `.env.example` a `.env`.
3. Validar/generar el cliente y arrancar:

```bash
npm ci
npm run prisma:generate
npm run prisma:validate
npm run dev
```

Comprobación: `http://localhost:3001/api/v1/health`.

## Docker sin PostgreSQL

La imagen solo contiene la API. PostgreSQL debe estar ejecutándose fuera del contenedor.

```bash
docker build --target runner -t farmasync-backend .
docker run --rm --name farmasync-backend -p 3001:3001 \
  --env-file .env \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/farmasyncdb?schema=public \
  farmasync-backend
```

En Docker Desktop, `host.docker.internal` apunta al equipo anfitrión. La imagen usa multi-stage y usuario no root; no copia `.env` ni incluye PostgreSQL.

## Comandos

| Comando | Propósito |
|---|---|
| `npm run dev` | Desarrollo con Nest watch |
| `npm run build` | Compilación a `dist/` |
| `npm run lint` | ESLint sobre TypeScript |
| `npm test` | Pruebas unitarias |
| `npm run test:coverage` | Cobertura |
| `npm run prisma:generate` | Generar cliente Prisma |
| `npm run prisma:validate` | Validar schema sin migrar |
| `npm run prisma:migrate` | Migración local explícita |

No ejecutar migraciones destructivas ni crear modelos de negocio hasta aprobar el contrato de datos.
