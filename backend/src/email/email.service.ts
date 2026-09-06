import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(configService: ConfigService) {
    const user = configService.get<string>('GMAIL_USER');
    // Google muestra la contraseña de aplicación en grupos de 4 separados por
    // espacios ("abcd efgh ijkl mnop"); pegada tal cual no autentica.
    const pass = configService
      .get<string>('GMAIL_APP_PASSWORD')
      ?.replace(/\s/g, '');

    if (!user || !pass) {
      this.transporter = null;
      this.from = '';
      this.logger.warn(
        'GMAIL_USER o GMAIL_APP_PASSWORD no están configuradas: los correos no se enviarán.',
      );
      return;
    }

    // 'gmail' resuelve a smtp.gmail.com:465 sobre TLS. La cuenta necesita
    // verificación en 2 pasos activa y una contraseña de aplicación; la
    // contraseña normal de Google no sirve para SMTP.
    this.transporter = createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    // Gmail reescribe el remitente a la cuenta autenticada si no coincide con
    // ella ni con un alias configurado, así que se deriva de GMAIL_USER en vez
    // de dejarlo libre. Solo el nombre visible es configurable.
    const senderName =
      configService.get<string>('EMAIL_FROM_NAME') ?? 'RideFleet';
    this.from = `${senderName} <${user}>`;
  }

  async sendNewPassword(
    to: string,
    fullName: string,
    newPassword: string,
  ): Promise<void> {
    // Falla en vez de retornar en silencio: quien llama necesita saber que el
    // correo no salió para no dar por buena una operación que depende de él.
    if (!this.transporter) {
      throw new Error(
        'Faltan GMAIL_USER o GMAIL_APP_PASSWORD: no se puede enviar el correo.',
      );
    }

    // sendMail rechaza la promesa ante cualquier fallo de SMTP (credenciales
    // inválidas, destinatario rechazado, sin conexión), así que el llamador
    // se entera por excepción.
    await this.transporter.sendMail({
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
