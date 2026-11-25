import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/shared/database/prisma.service';

@Injectable()
export class ExpireReservationsCron {
  private readonly logger = new Logger(ExpireReservationsCron.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredReservations() {
    const ahora = new Date();

    const vencidas = await this.prisma.reserva.findMany({
      where: {
        estado: 'PENDIENTE',
        fechaLimite: { lt: ahora },
      },
      include: {
        user: { select: { id: true, correo: true, nombreCompleto: true } },
        medicamento: { select: { id: true, nombreGenerico: true } },
        sede: { select: { id: true, nombre: true } },
      },
    });

    if (vencidas.length === 0) {
      return { procesadas: 0 };
    }

    let procesadas = 0;

    for (const reserva of vencidas) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const updated = await tx.reserva.updateMany({
            where: { id: reserva.id, estado: 'PENDIENTE' },
            data: { estado: 'EXPIRADA' },
          });

          if (updated.count > 0) {
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
          }
        });

        procesadas++;
        this.logger.log(
          `Reserva ${reserva.codigoReserva} expirada automáticamente. Stock reintegrado en sede ${reserva.sede.nombre}. Notificando a ${reserva.user.correo}.`,
        );
      } catch (error) {
        this.logger.error(
          `Error procesando expiración de reserva ${reserva.codigoReserva}`,
          error,
        );
      }
    }

    return { procesadas };
  }
}
