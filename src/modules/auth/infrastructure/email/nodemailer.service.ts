import { Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { EmailServicePort } from "../../domain/ports/email.port";

@Injectable()
export class NodemailerService implements EmailServicePort {
  private transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { 
      user: process.env.SMTP_USER, 
      pass: process.env.SMTP_PASS 
    },
    tls: {
      rejectUnauthorized: false 
    }
  });
  async sendRecoverPasswordEmail(to: string, token: string): Promise<void> {
    const resetLink = `http://localhost:3000/reset-password?token=${token}`; 
    await this.transporter.sendMail({
      from: '"FarmaSync" <tu_correo@midominio.com>',
      to,
      subject: "Recuperación de contraseña - FarmaSync",
      text: `Haz clic en el siguiente enlace para restablecer tu contraseña: ${resetLink}`
    });
  }
}