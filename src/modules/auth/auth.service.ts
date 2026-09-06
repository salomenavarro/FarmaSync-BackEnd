import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service'; // Ajusta según tu proyecto
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. SOLICITAR RECUPERACIÓN (forgot-password)
  async requestPasswordReset(numeroDocumento: string) {
    const user = await this.prisma.user.findUnique({
      where: { numeroDocumento },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Generar token aleatorio
    const plainToken = crypto.randomBytes(32).toString('hex');

    // Crear hash determinista (SHA-256) para poder buscarlo en la DB
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Válido por 1 hora

    // Guardar token en DB
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: tokenHash,
        expira_en: expiresAt,
      },
    });

    return {
      message: 'Instrucciones de recuperación generadas con éxito',
      resetToken: plainToken,
    };
  }

  // 2. RESTABLECER CONTRASEÑA (reset-password)
  async resetPassword(token: string, nuevaPassword: string) {
    // Hashear el token recibido para buscarlo en la DB
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Buscar el token en la base de datos
    const resetRecord = await this.prisma.passwordResetToken.findFirst({
      where: { token: tokenHash },
      include: { user: true },
    });

    // Validaciones de seguridad
    if (!resetRecord) {
      throw new BadRequestException('El token es inválido o no existe');
    }

    if (resetRecord.usado) {
      throw new BadRequestException('Este token ya fue utilizado');
    }

    if (new Date() > resetRecord.expira_en) {
      throw new BadRequestException('El token ha expirado');
    }

    // Hashear la nueva contraseña del usuario
    const newPasswordHash = await bcrypt.hash(nuevaPassword, 10);

    // Transacción: actualizar contraseña y marcar token como usado
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newPasswordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usado: true },
      }),
    ]);

    return {
      message: 'La contraseña se ha actualizado correctamente',
    };
  }
}