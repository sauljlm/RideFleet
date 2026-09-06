# RideFleet

Sistema de gestión de flota de vehículos de alquiler para conductores de Uber: vehículos, conductores, asignaciones, mantenimientos, pagos semanales con saldo acumulado, y un dashboard de reportes. Aplicación de un solo usuario administrador, interfaz en español.

Contexto completo del proyecto y reglas de negocio: [`docs/CLAUDE.md`](docs/CLAUDE.md).

## Stack

- **Backend**: NestJS + Mongoose, MongoDB Atlas, autenticación JWT, subida de imágenes a Cloudinary, correo por SMTP de Gmail.
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
| `GMAIL_USER` | Cuenta de Gmail desde la que se envía el correo de recuperación de contraseña |
| `GMAIL_APP_PASSWORD` | Contraseña de aplicación de esa cuenta (ver más abajo). No es la contraseña normal de Google |
| `EMAIL_FROM_NAME` | Nombre visible del remitente, ej. `RideFleet`. La dirección siempre es `GMAIL_USER` |
| `ADMIN_USERNAME` | Solo usado por el script de seed, para crear el usuario administrador inicial |
| `ADMIN_PASSWORD` | Solo usado por el script de seed (mínimo 8 caracteres) |
| `ADMIN_EMAIL` | Solo usado por el script de migración a multi-usuario, para completar el correo del administrador inicial |
| `ADMIN_FULLNAME` | Solo usado por el script de migración a multi-usuario, para completar el nombre del administrador inicial |

### Correo de recuperación de contraseña

El envío usa el SMTP de Gmail, así que no hace falta un dominio propio ni un servicio externo de correo. Para obtener la contraseña de aplicación:

1. Activa la **verificación en 2 pasos** en la cuenta de Google que vaya a enviar los correos (https://myaccount.google.com/security). Sin esto, el paso siguiente no aparece.
2. Entra a https://myaccount.google.com/apppasswords, crea una contraseña de aplicación y copia los 16 caracteres que muestra.
3. Ponla en `GMAIL_APP_PASSWORD` y la dirección de esa cuenta en `GMAIL_USER`. Los espacios que muestra Google se pueden pegar tal cual; la aplicación los ignora.

Gmail reescribe el remitente a la cuenta autenticada, por eso la dirección de envío siempre es `GMAIL_USER`: solo el nombre visible (`EMAIL_FROM_NAME`) es configurable. El límite de Gmail es de unos 500 correos diarios, de sobra para este uso.

Si `GMAIL_USER` o `GMAIL_APP_PASSWORD` faltan, la recuperación de contraseña devuelve un error explícito y **no modifica la contraseña del usuario**, en vez de fallar en silencio.

RideFleet es multi-usuario: cada cuenta tiene su propia flota, conductores y pagos, completamente independientes del resto. Cualquier persona puede crear una cuenta desde `/registro` en el frontend. El siguiente script solo es necesario para tener una primera cuenta administradora ya creada (por ejemplo, para no partir de cero en desarrollo):

```bash
ADMIN_USERNAME=admin ADMIN_PASSWORD=tu-contraseña npm run seed:admin
```

Si vienes de una versión anterior de RideFleet (de un solo usuario) y ya tenías vehículos/conductores/pagos cargados, corre una única vez el script de migración para que esa cuenta administradora se convierta en tu primera cuenta y conserve todos sus datos:

```bash
ADMIN_USERNAME=admin ADMIN_EMAIL=tu@correo.com ADMIN_FULLNAME="Tu Nombre" npm run migrate:multi-tenant
```

Esa misma versión anterior creaba índices únicos globales sobre la placa de los vehículos y la identificación de los conductores, lo que impedía que dos cuentas distintas registraran la misma placa o el mismo conductor. Si tu base de datos viene de esa versión, corre una única vez:

```bash
npm run fix:tenant-indexes
```

Reemplaza esos índices por índices únicos **por cuenta** (`ownerId` + placa, `ownerId` + identificación). En bases de datos nuevas no hace falta: la aplicación los crea sola al arrancar.

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
