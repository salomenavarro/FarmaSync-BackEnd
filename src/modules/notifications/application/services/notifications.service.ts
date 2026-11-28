import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CategoriaNotificacion,
  PrioridadNotificacion,
  TipoNotificacion,
} from '@prisma/client';
import { PrismaService } from 'src/shared/database/prisma.service';
import {
  EMAIL_SERVICE,
  EmailServicePort,
} from '../../../auth/domain/ports/email.port';

export interface CrearNotificacionInput {
  userId: number;
  tipo: TipoNotificacion;
  categoria: CategoriaNotificacion;
  prioridad: PrioridadNotificacion;
  titulo: string;
  mensaje: string;
  reservaId?: number;
  codigoReserva?: string;
  medicamentoId?: number;
  medicamentoNombre?: string;
  medicamentoCodigo?: string;
  sedeId?: number;
  sedeNombre?: string;
  fechaVencimiento?: Date;
  enviarCorreo?: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailServicePort,
  ) {}

  async create(input: CrearNotificacionInput) {
    const notificacion = await this.prisma.notificacion.create({
      data: {
        userId: input.userId,
        tipo: input.tipo,
        categoria: input.categoria,
        prioridad: input.prioridad,
        titulo: input.titulo,
        mensaje: input.mensaje,
        reservaId: input.reservaId ?? null,
        codigoReserva: input.codigoReserva ?? null,
        medicamentoId: input.medicamentoId ?? null,
        medicamentoNombre: input.medicamentoNombre ?? null,
        medicamentoCodigo: input.medicamentoCodigo ?? null,
        sedeId: input.sedeId ?? null,
        sedeNombre: input.sedeNombre ?? null,
        fechaVencimiento: input.fechaVencimiento ?? null,
      },
    });

    if (input.enviarCorreo !== false) {
      void this.notificarPorCorreoSeguro(input);
    }

    return this.mapToFrontend(notificacion);
  }

  private async notificarPorCorreoSeguro(input: CrearNotificacionInput) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { correo: true, nombreCompleto: true },
      });

      if (!user?.correo) return;

      await this.emailService.sendNotificationEmail({
        to: user.correo,
        nombreCompleto: user.nombreCompleto,
        titulo: input.titulo,
        mensaje: input.mensaje,
        codigoReserva: input.codigoReserva,
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar correo de notificación (${input.tipo}) al usuario ${input.userId}: ${
          error instanceof Error ? error.message : 'Error desconocido'
        }`,
      );
    }
  }

  async findByUser(userId: number) {
    const items = await this.prisma.notificacion.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return items.map((n) => this.mapToFrontend(n));
  }

  async markAsRead(userId: number, notificacionId: number) {
    const existente = await this.prisma.notificacion.findFirst({
      where: { id: notificacionId, userId },
    });

    if (!existente) {
      throw new NotFoundException('Notificación no encontrada');
    }

    const updated = await this.prisma.notificacion.update({
      where: { id: notificacionId },
      data: {
        leida: true,
        fechaLectura: existente.fechaLectura ?? new Date(),
      },
    });

    return this.mapToFrontend(updated);
  }

  async markAsUnread(userId: number, notificacionId: number) {
    const existente = await this.prisma.notificacion.findFirst({
      where: { id: notificacionId, userId },
    });

    if (!existente) {
      throw new NotFoundException('Notificación no encontrada');
    }

    const updated = await this.prisma.notificacion.update({
      where: { id: notificacionId },
      data: {
        leida: false,
        fechaLectura: null,
      },
    });

    return this.mapToFrontend(updated);
  }

  async markAllAsRead(userId: number) {
    const ahora = new Date();
    const res = await this.prisma.notificacion.updateMany({
      where: { userId, leida: false },
      data: {
        leida: true,
        fechaLectura: ahora,
      },
    });

    return { actualizadas: res.count };
  }

  private mapToFrontend(n: {
    id: number;
    tipo: TipoNotificacion;
    categoria: CategoriaNotificacion;
    prioridad: PrioridadNotificacion;
    titulo: string;
    mensaje: string;
    createdAt: Date;
    leida: boolean;
    fechaLectura: Date | null;
    reservaId: number | null;
    codigoReserva: string | null;
    medicamentoId: number | null;
    medicamentoNombre: string | null;
    medicamentoCodigo: string | null;
    sedeId: number | null;
    sedeNombre: string | null;
    fechaVencimiento: Date | null;
  }) {
    return {
      id: String(n.id),
      tipo: n.tipo,
      categoria: n.categoria,
      prioridad: n.prioridad,
      titulo: n.titulo,
      mensaje: n.mensaje,
      fechaCreacion: n.createdAt.toISOString(),
      leida: n.leida,
      ...(n.fechaLectura ? { fechaLectura: n.fechaLectura.toISOString() } : {}),
      ...(n.reservaId ? { reservaId: String(n.reservaId) } : {}),
      ...(n.codigoReserva ? { codigoReserva: n.codigoReserva } : {}),
      ...(n.medicamentoId ? { medicamentoId: String(n.medicamentoId) } : {}),
      ...(n.medicamentoNombre ? { medicamentoNombre: n.medicamentoNombre } : {}),
      ...(n.medicamentoCodigo ? { medicamentoCodigo: n.medicamentoCodigo } : {}),
      ...(n.sedeId ? { sedeId: String(n.sedeId) } : {}),
      ...(n.sedeNombre ? { sedeNombre: n.sedeNombre } : {}),
      ...(n.fechaVencimiento
        ? { fechaVencimiento: n.fechaVencimiento.toISOString() }
        : {}),
    };
  }
}