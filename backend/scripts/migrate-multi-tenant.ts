import 'dotenv/config';
import mongoose from 'mongoose';
import { User, UserSchema } from '../src/users/schemas/user.schema';

const COLLECTIONS = [
  'vehicles',
  'drivers',
  'assignments',
  'maintenances',
  'payments',
];

async function main() {
  const { MONGODB_URI, ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_FULLNAME } =
    process.env;

  if (!MONGODB_URI) {
    throw new Error('Falta la variable de entorno MONGODB_URI');
  }
  if (!ADMIN_USERNAME) {
    throw new Error('Falta ADMIN_USERNAME en las variables de entorno');
  }
  if (!ADMIN_EMAIL || !ADMIN_FULLNAME) {
    throw new Error(
      'Faltan ADMIN_EMAIL y/o ADMIN_FULLNAME en las variables de entorno',
    );
  }

  await mongoose.connect(MONGODB_URI);
  const UserModel = mongoose.model(User.name, UserSchema);

  const adminUser = await UserModel.findOne({ username: ADMIN_USERNAME });
  if (!adminUser) {
    throw new Error(
      `No se encontró el usuario "${ADMIN_USERNAME}". Corre primero "npm run seed:admin".`,
    );
  }

  adminUser.email = ADMIN_EMAIL;
  adminUser.fullName = ADMIN_FULLNAME;
  await adminUser.save();
  console.log(
    `Usuario "${ADMIN_USERNAME}" actualizado con email y nombre completo.`,
  );

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('No se pudo obtener la conexión a la base de datos');
  }

  for (const collectionName of COLLECTIONS) {
    const result = await db
      .collection(collectionName)
      .updateMany(
        { ownerId: { $exists: false } },
        { $set: { ownerId: adminUser._id } },
      );
    console.log(
      `${collectionName}: ${result.modifiedCount} documento(s) asignado(s) a "${ADMIN_USERNAME}".`,
    );
  }

  console.log('Migración a multi-usuario completada.');
  await mongoose.disconnect();
}

main().catch((error: Error) => {
  console.error('Error en la migración a multi-usuario:', error.message);
  process.exit(1);
});
