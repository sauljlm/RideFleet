import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/**
 * Índices únicos globales que existían cuando RideFleet era una aplicación
 * de un solo usuario. Los reemplazan los índices únicos compuestos que
 * declaran los esquemas (ownerId + plate, ownerId + idNumber), pero
 * Mongoose crea índices nuevos y nunca borra los obsoletos: mientras el
 * viejo siga en la base de datos, dos cuentas distintas no pueden registrar
 * la misma placa ni la misma identificación.
 */
const OBSOLETE_UNIQUE_INDEXES: { collection: string; index: string }[] = [
  { collection: 'vehicles', index: 'plate_1' },
  { collection: 'drivers', index: 'idNumber_1' },
];

/**
 * Borra al arrancar esos índices obsoletos en cualquier base de datos que
 * todavía los tenga (desarrollo, producción o cualquier despliegue nuevo).
 * Es idempotente y no interrumpe el arranque si algo falla: sin esto, cada
 * entorno tendría que correr "npm run fix:tenant-indexes" a mano.
 */
@Injectable()
export class LegacyIndexesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LegacyIndexesService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const { collection, index } of OBSOLETE_UNIQUE_INDEXES) {
      try {
        const db = this.connection.db;
        if (!db) {
          return;
        }

        const collectionExists = await db
          .listCollections({ name: collection })
          .hasNext();
        if (!collectionExists) {
          continue;
        }

        const indexes = await db.collection(collection).indexes();
        if (!indexes.some((existing) => existing.name === index)) {
          continue;
        }

        await db.collection(collection).dropIndex(index);
        this.logger.log(
          `Índice único global obsoleto "${index}" eliminado de "${collection}".`,
        );
      } catch (error) {
        this.logger.warn(
          `No se pudo eliminar el índice obsoleto "${index}" de "${collection}": ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
}
