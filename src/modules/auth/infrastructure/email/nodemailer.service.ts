import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import {
  EmailServicePort,
  NotificationEmailPayload,
} from "../../domain/ports/email.port";

@Injectable()
export class NodemailerService implements EmailServicePort {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  async sendRecoverPasswordEmail(to: string, token: string): Promise<void> {
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    await this.transporter.sendMail({
      from: `"FarmaSync" <${process.env.SMTP_USER}>`,
      to,
      subject: "Recuperación de contraseña - FarmaSync",
      text: `Hola. Has solicitado restablecer tu contraseña en FarmaSync.\n\nEste enlace expira en 15 minutos:\n${resetLink}\n\nSi no solicitaste este cambio, puedes ignorar este mensaje.`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Recuperación de contraseña</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f4f7f6; padding: 40px 10px;">
            <tr>
              <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                  <tr>
                    <td align="center" style="background-color: #00A8A8; padding: 28px 20px;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">FarmaSync</h1>
                      <p style="color: #e6f7f7; margin: 4px 0 0 0; font-size: 13px;">Inspirados en tu salud, enfocados en tu bienestar.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 32px 28px; text-align: left;">
                      <h2 style="color: #171717; font-size: 18px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">
                        ¿Solicitaste cambiar tu contraseña?
                      </h2>
                      <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                        Recibimos una solicitud para restablecer la clave de acceso a tu cuenta en FarmaSync. Haz clic en el siguiente botón para crear una nueva contraseña:
                      </p>
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                        <tr>
                          <td align="center">
                            <a href="${resetLink}" target="_blank" style="background-color: #00A8A8; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 10px rgba(0, 168, 168, 0.3);">
                              Restablecer Contraseña
                            </a>
                          </td>
                        </tr>
                      </table>
                      <div style="background-color: #fff8e6; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px;">
                        <p style="color: #b45309; font-size: 12px; margin: 0; font-weight: 600;">
                          Por seguridad, este enlace es válido únicamente durante <strong>15 minutos</strong>.
                        </p>
                      </div>
                      <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin-bottom: 0;">
                        Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:
                        <br>
                        <a href="${resetLink}" style="color: #00A8A8; word-break: break-all; font-size: 11px;">${resetLink}</a>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9fafb; padding: 20px 28px; text-align: center; border-top: 1px solid #f1f5f9;">
                      <p style="color: #9ca3af; font-size: 11px; margin: 0; line-height: 1.5;">
                        Si no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu contraseña actual seguirá siendo la misma.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });
  }

  async sendNotificationEmail(payload: NotificationEmailPayload): Promise<void> {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return;
    }

    const panelUrl = "http://localhost:3000/notificaciones";
    const badgeReserva = payload.codigoReserva
      ? `<div style="display:inline-block;background-color:#e6f7f7;color:#007a7a;font-weight:700;font-size:13px;padding:6px 12px;border-radius:8px;margin-bottom:16px;">Reserva: ${payload.codigoReserva}</div>`
      : "";

    await this.transporter.sendMail({
      from: `"FarmaSync" <${process.env.SMTP_USER}>`,
      to: payload.to,
      subject: `${payload.titulo} - FarmaSync`,
      text: `Hola ${payload.nombreCompleto}.\n\n${payload.titulo}\n${payload.mensaje}\n\nConsulta tus notificaciones en: ${panelUrl}`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"><title>${payload.titulo}</title></head>
        <body style="margin:0;padding:0;background-color:#f4f7f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f7f6;padding:32px 10px;">
            <tr>
              <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
                  <tr>
                    <td align="center" style="background-color:#00A8A8;padding:24px 20px;">
                      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800;">FarmaSync</h1>
                      <p style="color:#e6f7f7;margin:4px 0 0 0;font-size:12px;">Notificación automática del sistema</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:28px;">
                      <p style="color:#6b7280;font-size:13px;margin:0 0 8px 0;">Hola, <strong>${payload.nombreCompleto}</strong></p>
                      <h2 style="color:#171717;font-size:18px;font-weight:700;margin:0 0 14px 0;">${payload.titulo}</h2>
                      ${badgeReserva}
                      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px 0;">${payload.mensaje}</p>
                      <a href="${panelUrl}" target="_blank" style="background-color:#00A8A8;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:13px;display:inline-block;">
                        Ver en FarmaSync
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });
  }
}