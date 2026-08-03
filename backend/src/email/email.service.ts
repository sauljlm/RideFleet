import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

const DEFAULT_SANDBOX_SENDER = 'RideFleet <onboarding@resend.dev>';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(configService: ConfigService) {
    const apiKey = configService.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from =
      configService.get<string>('EMAIL_FROM') ?? DEFAULT_SANDBOX_SENDER;

    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY no está configurada: los correos no se enviarán realmente.',
      );
    }
  }

  async sendNewPassword(
    to: string,
    fullName: string,
    newPassword: string,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `No se envió el correo de nueva contraseña a ${to} (RESEND_API_KEY no configurada).`,
      );
      return;
    }

    await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Tu nueva contraseña de RideFleet',
      html: `
        <p>Hola ${fullName},</p>
        <p>Recibimos una solicitud para recuperar el acceso a tu cuenta de RideFleet. Tu nueva contraseña es:</p>
        <p style="font-size: 18px; font-weight: bold;">${newPassword}</p>
        <p>Te recomendamos iniciar sesión y cambiarla por una que puedas recordar fácilmente.</p>
        <p>Si no solicitaste este cambio, contacta al administrador del sistema.</p>
      `,
    });
  }
}
