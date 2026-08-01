import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createServer } from 'net';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

const logger = new Logger('Bootstrap');

// Archivo compartido (solo para desarrollo local) donde se publica el puerto
// real en el que quedó escuchando el backend. El proxy del frontend
// (frontend/src/app/api/backend/[...path]/route.ts) lo lee en cada request
// para encontrar el backend sin importar a qué puerto haya hecho fallback.
const PORT_FILE = join(process.cwd(), '..', '.dev-backend-port');

// El puerto por defecto (PORT o 3001) puede estar ocupado por otro proceso
// local; en vez de fallar, se busca el siguiente puerto libre a partir de ahí.
function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = createServer()
      .once('error', () => resolve(false))
      .once('listening', () => tester.close(() => resolve(true)))
      .listen(port, '0.0.0.0');
  });
}

async function findAvailablePort(startPort: number): Promise<number> {
  let port = startPort;
  while (!(await isPortFree(port))) {
    port += 1;
  }
  return port;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // El frontend también hace fallback de puerto cuando su puerto por
  // defecto está ocupado (ver next dev), así que además del FRONTEND_URL
  // configurado se acepta cualquier origen localhost/127.0.0.1 sin importar
  // el puerto. Esto nunca amplía el CORS real en producción, donde el
  // origen del frontend jamás es localhost.
  const configuredFrontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const isLocalOrigin = (origin: string) =>
    /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origin === configuredFrontendUrl || isLocalOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    },
    credentials: true,
  });

  const desiredPort = Number(process.env.PORT) || 3001;
  const port = await findAvailablePort(desiredPort);
  if (port !== desiredPort) {
    logger.warn(
      `El puerto ${desiredPort} ya estaba en uso. Backend iniciado en el puerto ${port} en su lugar.`,
    );
    logger.warn(
      `Si el frontend no conecta, actualiza NEXT_PUBLIC_API_URL en frontend/.env a http://localhost:${port}/api`,
    );
  }

  await app.listen(port);
  logger.log(`Backend escuchando en http://localhost:${port}/api`);

  try {
    writeFileSync(PORT_FILE, String(port), 'utf-8');
  } catch (error) {
    logger.warn(
      `No se pudo escribir ${PORT_FILE} (el proxy del frontend usará su puerto de respaldo): ${(error as Error).message}`,
    );
  }
}
void bootstrap();
