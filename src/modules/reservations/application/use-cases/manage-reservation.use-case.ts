import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/database/prisma.service';
import { ReservationRules } from '../../domain/entities/reservation-rules.entity';

@Injectable()
export class ManageReservationUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async findMyReservations(userId: number) {
    return this.prisma.reserva.findMany({
      where: { userId },
      include: {
        sede: {
          select: {
            id: true,
            nombre: true,
            ciudad: true,
            zona: true,
            direccion: true,
          },
        },
        medicamento: {
          select: {
            id: true,
            codigo: true,
            nombreGenerico: true,
            presentacion: true,
            concentracion: true,
          },
        },
        dependiente: {
          select: {
            id: true,
            nombreCompleto: true,
            numeroDocumento: true,
            parentesco: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestExtension(userId: number, reservaId: number) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id: reservaId },
    });

    if (!reserva) {
      throw new NotFoundException(`Reserva con ID ${reservaId} no encontrada`);
    }

    if (reserva.userId !== userId) {
      throw new ForbiddenException('No tienes permiso sobre esta reserva');
    }

    const nuevaFechaLimite = ReservationRules.validarPuedeSolicitarProrroga({
      estado: reserva.estado,
      prorrogaSolicitada: reserva.prorrogaSolicitada,
      fechaLimite: reserva.fechaLimite,
    });

    return this.prisma.reserva.update({
      where: { id: reservaId },
      data: {
        fechaLimite: nuevaFechaLimite,
        prorrogaSolicitada: true,
      },
      include: {
        sede: { select: { id: true, nombre: true, direccion: true } },
        medicamento: {
          select: { id: true, nombreGenerico: true, presentacion: true },
        },
      },
    });
  }

  async cancelByUser(userId: number, reservaId: number) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id: reservaId },
    });

    if (!reserva) {
      throw new NotFoundException(`Reserva con ID ${reservaId} no encontrada`);
    }

    if (reserva.userId !== userId) {
      throw new ForbiddenException('No tienes permiso sobre esta reserva');
    }

    ReservationRules.validarPuedeCancelar({
      estado: reserva.estado,
      fechaLimite: reserva.fechaLimite,
    });

    // Transacción atómica: marcar como CANCELADA_USUARIO y devolver +1 al stock lógico
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.reserva.update({
        where: { id: reservaId },
        data: { estado: 'CANCELADA_USUARIO' },
      });

      await tx.inventarioSede.upsert({
        where: {
          sedeId_medicamentoId: {
            sedeId: reserva.sedeId,
            medicamentoId: reserva.medicamentoId,
          },
        },
        update: { cantidad: { increment: 1 } },
        create: {
          sedeId: reserva.sedeId,
          medicamentoId: reserva.medicamentoId,
          cantidad: 1,
        },
      });

      return updated;
    });
  }

  async markAsDelivered(codigoReserva: string) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { codigoReserva: codigoReserva.trim().toUpperCase() },
      include: {
        user: { select: { id: true, nombreCompleto: true, numeroDocumento: true } },
        dependiente: {
          select: { id: true, nombreCompleto: true, numeroDocumento: true },
        },
        medicamento: true,
        sede: true,
      },
    });

    if (!reserva) {
      throw new NotFoundException(
        `No existe ninguna reserva con el código ${codigoReserva}`,
      );
    }

    if (reserva.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        `La reserva ${reserva.codigoReserva} no puede entregarse porque está en estado ${reserva.estado}`,
      );
    }

    if (new Date() > reserva.fechaLimite) {
      throw new BadRequestException(
        `La reserva ${reserva.codigoReserva} ya se encuentra vencida`,
      );
    }

    return this.prisma.reserva.update({
      where: { id: reserva.id },
      data: { estado: 'ENTREGADA' },
      include: {
        user: { select: { id: true, nombreCompleto: true, numeroDocumento: true } },
        dependiente: {
          select: { id: true, nombreCompleto: true, numeroDocumento: true },
        },
        medicamento: true,
        sede: true,
      },
    });
  }
}
