import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../../../../shared/database/prisma.service";
import { CreateSessionData, SessionRepositoryPort } from "../../domain/ports/session-repository.port";

// A diferencia de la arquitectura vieja (guardaba el JWT en texto
// plano en user_sessions), aquí se guarda un hash SHA-256. No es
// para "esconder" contraseñas (no lo es, es solo un token de sesión),
// sino para que un dump de la BD no entregue tokens válidos usables
// directamente.
@Injectable()
export class PrismaSessionRepository implements SessionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  async create(data: CreateSessionData): Promise<void> {
    await this.prisma.userSession.create({
      data: {
        userId: data.userId,
        tokenHash: this.hashToken(data.token),
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        expiresAt: data.expiresAt,
      },
    });
  }

  async deleteByToken(token: string): Promise<void> {
    // deleteMany en vez de delete: si por alguna razón la sesión ya
    // no existe (ej. expiró y se limpió aparte), no debe lanzar error.
    await this.prisma.userSession.deleteMany({
      where: { tokenHash: this.hashToken(token) },
    });
  }

  async existsActive(token: string): Promise<boolean> {
    const session = await this.prisma.userSession.findFirst({
      where: {
        tokenHash: this.hashToken(token),
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    return session !== null;
  }
}
