import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { User, UserSchema } from '../src/users/schemas/user.schema';

async function main() {
  const { MONGODB_URI, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;

  if (!MONGODB_URI) {
    throw new Error('Falta la variable de entorno MONGODB_URI');
  }
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    throw new Error(
      'Falta ADMIN_USERNAME y/o ADMIN_PASSWORD en las variables de entorno',
    );
  }
  if (ADMIN_PASSWORD.length < 8) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 8 caracteres');
  }

  await mongoose.connect(MONGODB_URI);
  const UserModel = mongoose.model(User.name, UserSchema);

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await UserModel.findOneAndUpdate(
    { username: ADMIN_USERNAME },
    { username: ADMIN_USERNAME, passwordHash },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );

  console.log(`Usuario administrador "${ADMIN_USERNAME}" creado/actualizado.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Error al sembrar el usuario administrador:', error.message);
  process.exit(1);
});
