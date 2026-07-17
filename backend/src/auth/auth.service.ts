import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
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

    const payload = { sub: user._id.toString(), username: user.username };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: { id: user._id.toString(), username: user.username },
    };
  }
}
