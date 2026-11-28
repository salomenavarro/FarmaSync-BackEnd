import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/shared/database/prisma.service';
import { NotificationsService } from '../services/notifications.service';

@Injectable()
export class ReservationRemindersCron {
  private readonly logger = new Logger(ReservationRemindersCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('*/15 * * * *')
  async checkRemindersAndDelays() {
    const ahora = new Date();
    const en2Horas = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
    const en24Horas = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    const hace60Min = new Date(ahora.getTime() - 60 * 60 * 1000);

    // 1. Recordatorio urgente: 2 horas antes de vencer
    const proximas2h = await this.prisma.reserva.findMany({
      where: {
        estado: { in: ['PENDIENTE', 'LISTA_PARA_RETIRO'] },
        recordatorio2hEnviado: false,
        fechaLimite: { gt: ahora, lte: en2Horas },
      },
      include: {
        medicamento: true,
        sede: true,
      },
    });

    for (const r of proximas2h) {
      const updated = await this.prisma.reserva.updateMany({
        where: { id: r.id, recordatorio2hEnviado: false },
        data: { recordatorio2hEnviado: true, recordatorio24hEnviado: true },
      });

      if (updated.count > 0) {
        await this.notificationsService.create({
          userId: r.userId,
          tipo: 'VENCIMIENTO_2H',
          categoria: 'RESERVA',
          prioridad: 'URGENTE',
          titulo: `Tu reserva ${r.codigoReserva} vence en menos de 2 horas`,
          mensaje: `Recuerda reclamar ${r.medicamento.nombreGenerico} en ${r.sede.nombre} antes de las ${r.fechaLimite.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} o solicita una prórroga de 24 h si aún aplica.`,
          reservaId: r.id,
          codigoReserva: r.codigoReserva,
          medicamentoId: r.medicamentoId,
          medicamentoNombre: r.medicamento.nombreGenerico,
          medicamentoCodigo: r.medicamento.codigo,
          sedeId: r.sedeId,
          sedeNombre: r.sede.nombre,
          fechaVencimiento: r.fechaLimite,
        });
      }
    }

    // 2. Recordatorio preventivo: 24 horas antes de vencer
    const proximas24h = await this.prisma.reserva.findMany({
      where: {
        estado: { in: ['PENDIENTE', 'LISTA_PARA_RETIRO'] },
        recordatorio24hEnviado: false,
        fechaLimite: { gt: en2Horas, lte: en24Horas },
      },
      include: {
        medicamento: true,
        sede: true,
      },
    });

    for (const r of proximas24h) {
      const updated = await this.prisma.reserva.updateMany({
        where: { id: r.id, recordatorio24hEnviado: false },
        data: { recordatorio24hEnviado: true },
      });

      if (updated.count > 0) {
        await this.notificationsService.create({
          userId: r.userId,
          tipo: 'VENCIMIENTO_24H',
          categoria: 'RESERVA',
          prioridad: 'IMPORTANTE',
          titulo: `Recordatorio: tu reserva ${r.codigoReserva} vence en menos de 24 horas`,
          mensaje: `Tienes plazo hasta ${r.fechaLimite.toLocaleString('es-CO')} para reclamar ${r.medicamento.nombreGenerico} en ${r.sede.nombre}.`,
          reservaId: r.id,
          codigoReserva: r.codigoReserva,
          medicamentoId: r.medicamentoId,
          medicamentoNombre: r.medicamento.nombreGenerico,
          medicamentoCodigo: r.medicamento.codigo,
          sedeId: r.sedeId,
          sedeNombre: r.sede.nombre,
          fechaVencimiento: r.fechaLimite,
        });
      }
    }

    // 3. Incidencia: retraso en alistamiento (> 60 min en PENDIENTE)
    const retrasadas = await this.prisma.reserva.findMany({
      where: {
        estado: 'PENDIENTE',
        alertaRetrasoEnviada: false,
        createdAt: { lte: hace60Min },
      },
      include: {
        medicamento: true,
        sede: true,
      },
    });

    for (const r of retrasadas) {
      const updated = await this.prisma.reserva.updateMany({
        where: { id: r.id, alertaRetrasoEnviada: false },
        data: { alertaRetrasoEnviada: true },
      });

      if (updated.count > 0) {
        await this.notificationsService.create({
          userId: r.userId,
          tipo: 'RETRASO_ALISTAMIENTO',
          categoria: 'INCIDENCIA',
          prioridad: 'IMPORTANTE',
          titulo: `Demora en el alistamiento de tu reserva ${r.codigoReserva}`,
          mensaje: `La sede ${r.sede.nombre} presenta alta demanda en ventanilla y el alistamiento de ${r.medicamento.nombreGenerico} está tomando más tiempo de lo habitual. Te avisaremos apenas esté rotulado.`,
          reservaId: r.id,
          codigoReserva: r.codigoReserva,
          medicamentoId: r.medicamentoId,
          medicamentoNombre: r.medicamento.nombreGenerico,
          medicamentoCodigo: r.medicamento.codigo,
          sedeId: r.sedeId,
          sedeNombre: r.sede.nombre,
        });
      }
    }

    if (proximas2h.length + proximas24h.length + retrasadas.length > 0) {
      this.logger.log(
        `Cron notificaciones ejecutado: 2h=${proximas2h.length}, 24h=${proximas24h.length}, retrasos=${retrasadas.length}`,
      );
    }
  }
}