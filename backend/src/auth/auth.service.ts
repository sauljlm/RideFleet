import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

const PASSWORD_HASH_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly emailService: EmailService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    return this.buildAuthResponse(user._id.toString(), user.username);
  }

  async register(dto: RegisterDto, photo?: Express.Multer.File) {
    const [existingUsername, existingEmail] = await Promise.all([
      this.usersService.findByUsername(dto.username),
      this.usersService.findByEmail(dto.email),
    ]);
    if (existingUsername) {
      throw new ConflictException('Ese usuario ya está en uso');
    }
    if (existingEmail) {
      throw new ConflictException('Ese correo ya está en uso');
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_HASH_ROUNDS);

    let photoUrl: string | null = null;
    if (photo) {
      const result = await this.cloudinaryService.uploadBuffer(
        photo.buffer,
        'ridefleet/users/photos',
      );
      photoUrl = result.secure_url;
    }

    const user = await this.usersService.create({
      username: dto.username,
      email: dto.email,
      fullName: dto.fullName,
      passwordHash,
      photo: photoUrl,
    });

    return this.buildAuthResponse(user._id.toString(), user.username);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const genericResponse = {
      message:
        'Si el correo existe en nuestro sistema, te enviamos una nueva contraseña.',
    };

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return genericResponse;
    }

    const newPassword = randomBytes(9).toString('base64url').slice(0, 12);
    const passwordHash = await bcrypt.hash(newPassword, PASSWORD_HASH_ROUNDS);
    await this.usersService.updatePassword(user._id.toString(), passwordHash);

    try {
      await this.emailService.sendNewPassword(
        user.email,
        user.fullName,
        newPassword,
      );
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo de nueva contraseña a ${user.email}: ${(error as Error).message}`,
      );
    }

    return genericResponse;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!passwordMatches) {
      // BadRequestException (no UnauthorizedException): un 401 aquí
      // dispararía el manejo global de "sesión expirada" en el frontend
      // (api.ts) y cerraría la sesión en vez de mostrar el error en el
      // formulario. Esto no es un problema de autenticación del token.
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    const passwordHash = await bcrypt.hash(newPassword, PASSWORD_HASH_ROUNDS);
    await this.usersService.updatePassword(userId, passwordHash);

    return { message: 'Contraseña actualizada correctamente' };
  }

  private async buildAuthResponse(userId: string, username: string) {
    const payload = { sub: userId, username };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: { id: userId, username },
    };
  }
}
