import 'dotenv/config';
import mongoose from 'mongoose';

/**
 * Elimina los índices únicos globales heredados de la versión de un solo
 * usuario de RideFleet:
 *
 *   - vehicles.plate_1     (placa única en toda la base de datos)
 *   - drivers.idNumber_1   (identificación única en toda la base de datos)
 *
 * Esos índices impedían que dos cuentas distintas registraran un vehículo
 * con la misma placa o un conductor con la misma identificación. En su
 * lugar, los esquemas ahora definen índices únicos compuestos
 * (ownerId + plate) y (ownerId + idNumber), que la aplicación crea sola al
 * arrancar. Mongoose nunca borra índices viejos, por eso hace falta este
 * script una única vez sobre bases de datos ya existentes.
 */

const OBSOLETE_INDEXES: { collection: string; index: string }[] = [
  { collection: 'vehicles', index: 'plate_1' },
  { collection: 'drivers', index: 'idNumber_1' },
];

const NEW_INDEXES: {
  collection: string;
  keys: Record<string, 1>;
  name: string;
}[] = [
  {
    collection: 'vehicles',
    keys: { ownerId: 1, plate: 1 },
    name: 'ownerId_1_plate_1',
  },
  {
    collection: 'drivers',
    keys: { ownerId: 1, idNumber: 1 },
    name: 'ownerId_1_idNumber_1',
  },
];

async function main() {
  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    throw new Error('Falta la variable de entorno MONGODB_URI');
  }

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('No se pudo obtener la conexión a la base de datos');
  }

  for (const { collection, index } of OBSOLETE_INDEXES) {
    const exists = await db.listCollections({ name: collection }).hasNext();
    if (!exists) {
      console.log(`${collection}: la colección no existe, se omite.`);
      continue;
    }

    const indexes = await db.collection(collection).indexes();
    if (!indexes.some((i) => i.name === index)) {
      console.log(
        `${collection}: el índice "${index}" ya no existe, se omite.`,
      );
      continue;
    }

    await db.collection(collection).dropIndex(index);
    console.log(`${collection}: índice global "${index}" eliminado.`);
  }

  for (const { collection, keys, name } of NEW_INDEXES) {
    const exists = await db.listCollections({ name: collection }).hasNext();
    if (!exists) {
      continue;
    }
    await db.collection(collection).createIndex(keys, { unique: true, name });
    console.log(`${collection}: índice único por usuario "${name}" listo.`);
  }

  console.log('Índices por usuario actualizados.');
  await mongoose.disconnect();
}

main().catch((error: Error) => {
  console.error('Error al actualizar los índices:', error.message);
  process.exit(1);
});
