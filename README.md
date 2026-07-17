# RideFleet

Sistema de gestión de flota de vehículos de alquiler para conductores de Uber: vehículos, conductores, asignaciones, mantenimientos, pagos semanales con saldo acumulado, y un dashboard de reportes. Aplicación de un solo usuario administrador, interfaz en español.

Contexto completo del proyecto y reglas de negocio: [`docs/CLAUDE.md`](docs/CLAUDE.md).

## Stack

- **Backend**: NestJS + Mongoose, MongoDB Atlas, autenticación JWT, subida de imágenes a Cloudinary.
- **Frontend**: Next.js (App Router), Tailwind CSS.

## Estructura

```
backend/   API REST (NestJS)
frontend/  Interfaz web (Next.js)
docs/      Contexto y reglas de negocio del proyecto
```

## Requisitos previos

- Node.js 20.9+ y npm
- Una base de datos en [MongoDB Atlas](https://www.mongodb.com/atlas) (o cualquier instancia de MongoDB accesible)
- Una cuenta de [Cloudinary](https://cloudinary.com) (gratuita) para el almacenamiento de fotos/documentos

## Configuración local

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Completa `backend/.env` con tus propios valores (nunca se suben al repo, ese archivo está en `.gitignore`):

| Variable | Descripción |
|---|---|
| `MONGODB_URI` | Cadena de conexión completa de MongoDB Atlas (incluye usuario, contraseña y nombre de base de datos) |
| `JWT_SECRET` | Cadena aleatoria larga usada para firmar los tokens de sesión |
| `JWT_EXPIRES_IN` | Duración del token, ej. `7d` |
| `CLOUDINARY_CLOUD_NAME` | Del dashboard de Cloudinary |
| `CLOUDINARY_API_KEY` | Del dashboard de Cloudinary |
| `CLOUDINARY_API_SECRET` | Del dashboard de Cloudinary |
| `PORT` | Puerto del servidor (por defecto `3001`; en Railway se asigna automáticamente) |
| `FRONTEND_URL` | Origen exacto permitido por CORS, ej. `http://localhost:3000` o el dominio del frontend en producción |
| `ADMIN_USERNAME` | Solo usado por el script de seed, para crear el usuario administrador |
| `ADMIN_PASSWORD` | Solo usado por el script de seed (mínimo 8 caracteres) |

Crea el usuario administrador (una sola vez, o cada vez que quieras cambiar sus credenciales):

```bash
ADMIN_USERNAME=admin ADMIN_PASSWORD=tu-contraseña npm run seed:admin
```

Corre el servidor de desarrollo:

```bash
npm run start:dev
```

La API queda disponible en `http://localhost:3001/api`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Completa `frontend/.env`:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL base de la API del backend, ej. `http://localhost:3001/api` en local, o la URL pública del backend en producción |

Corre el servidor de desarrollo:

```bash
npm run dev
```

El sitio queda disponible en `http://localhost:3000`.

## Build de producción

```bash
cd backend && npm run build && npm run start:prod
cd frontend && npm run build && npm run start
```

Ambos respetan la variable de entorno `PORT` si el hosting la define (como hace Railway automáticamente).

## Notas de despliegue

Backend y frontend se despliegan como dos servicios independientes (por ejemplo, dos servicios separados en Railway). Recuerda que `FRONTEND_URL` (backend) y `NEXT_PUBLIC_API_URL` (frontend) deben apuntar a las URLs públicas reales una vez desplegados, no a `localhost`.
