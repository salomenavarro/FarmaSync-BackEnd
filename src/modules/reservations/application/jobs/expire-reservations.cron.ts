import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/shared/database/prisma.service';
import { NotificationsService } from '../../../notifications/application/services/notifications.service';

@Injectable()
export class ExpireReservationsCron {
  private readonly logger = new Logger(ExpireReservationsCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredReservations() {
    const ahora = new Date();

    const vencidas = await this.prisma.reserva.findMany({
      where: {
        estado: { in: ['PENDIENTE', 'LISTA_PARA_RETIRO'] },
        fechaLimite: { lt: ahora },
      },
      include: {
        user: { select: { id: true, correo: true, nombreCompleto: true } },
        medicamento: { select: { id: true, codigo: true, nombreGenerico: true } },
        sede: { select: { id: true, nombre: true } },
      },
    });

    if (vencidas.length === 0) {
      return { procesadas: 0 };
    }

    let procesadas = 0;

    for (const reserva of vencidas) {
      try {
        let expiradaConfirmada = false;

        await this.prisma.$transaction(async (tx) => {
          const updated = await tx.reserva.updateMany({
            where: {
              id: reserva.id,
              estado: { in: ['PENDIENTE', 'LISTA_PARA_RETIRO'] },
            },
            data: { estado: 'EXPIRADA' },
          });

          if (updated.count > 0) {
            expiradaConfirmada = true;
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

        if (expiradaConfirmada) {
          await this.notificationsService.create({
            userId: reserva.userId,
            tipo: 'EXPIRACION',
            categoria: 'RESERVA',
            prioridad: 'IMPORTANTE',
            titulo: `Reserva ${reserva.codigoReserva} expirada por vencimiento`,
            mensaje: `El plazo para reclamar ${reserva.medicamento.nombreGenerico} en ${reserva.sede.nombre} venció el ${reserva.fechaLimite.toLocaleString('es-CO')} y la unidad fue liberada al inventario.`,
            reservaId: reserva.id,
            codigoReserva: reserva.codigoReserva,
            medicamentoId: reserva.medicamentoId,
            medicamentoNombre: reserva.medicamento.nombreGenerico,
            medicamentoCodigo: reserva.medicamento.codigo,
            sedeId: reserva.sedeId,
            sedeNombre: reserva.sede.nombre,
            fechaVencimiento: reserva.fechaLimite,
          });
        }

        procesadas++;
        this.logger.log(
          `Reserva ${reserva.codigoReserva} expirada automáticamente. Stock reintegrado en sede ${reserva.sede.nombre}.`,
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