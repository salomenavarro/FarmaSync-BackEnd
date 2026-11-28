import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/database/prisma.service';
import { NotificationsService } from '../../../notifications/application/services/notifications.service';
import { ReservationRules } from '../../domain/entities/reservation-rules.entity';

@Injectable()
export class ManageReservationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private calcularSla(createdAt: Date) {
    const minutosTranscurridos = Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / 60000,
    );
    const horas = Math.floor(minutosTranscurridos / 60);
    const mins = minutosTranscurridos % 60;
    const tiempoTranscurrido =
      horas > 0 ? `${horas} h ${mins} min` : `${mins} min`;

    let sla: 'Verde' | 'Amarillo' | 'Rojo' = 'Verde';
    if (minutosTranscurridos >= 120) sla = 'Rojo';
    else if (minutosTranscurridos >= 60) sla = 'Amarillo';

    return { minutosTranscurridos, tiempoTranscurrido, sla };
  }

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
            nombres: true,
            apellidos: true,
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

    const actualizada = await this.prisma.reserva.update({
      where: { id: reservaId },
      data: {
        fechaLimite: nuevaFechaLimite,
        prorrogaSolicitada: true,
        recordatorio24hEnviado: false,
        recordatorio2hEnviado: false,
      },
      include: {
        sede: { select: { id: true, nombre: true, direccion: true } },
        medicamento: {
          select: { id: true, codigo: true, nombreGenerico: true, presentacion: true },
        },
      },
    });

    await this.notificationsService.create({
      userId,
      tipo: 'PRORROGA',
      categoria: 'RESERVA',
      prioridad: 'INFORMATIVA',
      titulo: `Prórroga de 24 h aplicada a ${actualizada.codigoReserva}`,
      mensaje: `Se extendió el plazo de recogida para ${actualizada.medicamento.nombreGenerico} en ${actualizada.sede.nombre}. Nueva fecha límite: ${actualizada.fechaLimite.toLocaleString('es-CO')}.`,
      reservaId: actualizada.id,
      codigoReserva: actualizada.codigoReserva,
      medicamentoId: actualizada.medicamento.id,
      medicamentoNombre: actualizada.medicamento.nombreGenerico,
      medicamentoCodigo: actualizada.medicamento.codigo,
      sedeId: actualizada.sede.id,
      sedeNombre: actualizada.sede.nombre,
      fechaVencimiento: actualizada.fechaLimite,
    });

    return actualizada;
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

  async findBySedeOperacion(userId: number, querySedeId?: number) {
    const empleado = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { sedeId: true, role: { select: { name: true } } },
    });

    const sedeId =
      empleado?.role?.name === 'ADMINISTRADOR_EPS' && querySedeId
        ? querySedeId
        : empleado?.sedeId;

    if (!sedeId) {
      throw new BadRequestException(
        'El usuario no tiene una sede de farmacia asignada',
      );
    }

    const reservas = await this.prisma.reserva.findMany({
      where: {
        sedeId,
        estado: { in: ['PENDIENTE', 'LISTA_PARA_RETIRO'] },
      },
      include: {
        user: { select: { id: true, nombreCompleto: true, numeroDocumento: true } },
        dependiente: {
          select: { id: true, nombres: true, apellidos: true, numeroDocumento: true },
        },
        medicamento: true,
        sede: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const enriquecidas = reservas.map((r) => ({
      ...r,
      ...this.calcularSla(r.createdAt),
    }));

    const porAlistar = enriquecidas.filter((r) => r.estado === 'PENDIENTE');

    return {
      sedeId,
      totalPorAlistar: porAlistar.length,
      semaforo: {
        Verde: porAlistar.filter((r) => r.sla === 'Verde').length,
        Amarillo: porAlistar.filter((r) => r.sla === 'Amarillo').length,
        Rojo: porAlistar.filter((r) => r.sla === 'Rojo').length,
      },
      pendientesAlistamiento: porAlistar,
      listasParaRetiro: enriquecidas.filter(
        (r) => r.estado === 'LISTA_PARA_RETIRO',
      ),
    };
  }

  async findByCodeForPharmacy(codigo: string) {
    const limpio = codigo.trim().toUpperCase();
    const reserva = await this.prisma.reserva.findUnique({
      where: { codigoReserva: limpio },
      include: {
        user: { select: { id: true, nombreCompleto: true, numeroDocumento: true } },
        dependiente: {
          select: { id: true, nombres: true, apellidos: true, numeroDocumento: true },
        },
        medicamento: true,
        sede: true,
        alistadoPor: { select: { id: true, nombreCompleto: true } },
        entregadoPor: { select: { id: true, nombreCompleto: true } },
      },
    });

    if (!reserva) {
      throw new NotFoundException(`No existe ninguna reserva con código ${limpio}`);
    }

    return {
      ...reserva,
      ...this.calcularSla(reserva.createdAt),
    };
  }

  async markAsReady(
    farmaceuticoId: number,
    codigoReserva: string,
    metodo: 'POS' | 'MANUAL' = 'POS',
  ) {
    const limpio = codigoReserva.trim().toUpperCase();
    const reserva = await this.prisma.reserva.findUnique({
      where: { codigoReserva: limpio },
    });

    if (!reserva) {
      throw new NotFoundException(`Reserva ${limpio} no encontrada`);
    }

    if (reserva.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        `Solo se pueden alistar reservas en estado PENDIENTE (actual: ${reserva.estado})`,
      );
    }

    const actualizada = await this.prisma.reserva.update({
      where: { id: reserva.id },
      data: {
        estado: 'LISTA_PARA_RETIRO',
        metodoAlistamiento: metodo,
        alistadoAt: new Date(),
        alistadoPorId: farmaceuticoId,
      },
      include: {
        user: { select: { id: true, nombreCompleto: true, numeroDocumento: true } },
        dependiente: {
          select: { id: true, nombres: true, apellidos: true, numeroDocumento: true },
        },
        medicamento: true,
        sede: true,
      },
    });

    await this.notificationsService.create({
      userId: actualizada.userId,
      tipo: 'MEDICAMENTO_LISTO',
      categoria: 'RESERVA',
      prioridad: 'IMPORTANTE',
      titulo: `Tu medicamento de la reserva ${actualizada.codigoReserva} ya está listo`,
      mensaje: `El paquete con ${actualizada.medicamento.nombreGenerico} ha sido rotulado en ${actualizada.sede.nombre}. Puedes acercarte a ventanilla con tu código QR antes de ${actualizada.fechaLimite.toLocaleString('es-CO')}.`,
      reservaId: actualizada.id,
      codigoReserva: actualizada.codigoReserva,
      medicamentoId: actualizada.medicamentoId,
      medicamentoNombre: actualizada.medicamento.nombreGenerico,
      medicamentoCodigo: actualizada.medicamento.codigo,
      sedeId: actualizada.sedeId,
      sedeNombre: actualizada.sede.nombre,
      fechaVencimiento: actualizada.fechaLimite,
    });

    return actualizada;
  }

  async markAsDelivered(codigoReserva: string, farmaceuticoId?: number) {
    const limpio = codigoReserva.trim().toUpperCase();
    const reserva = await this.prisma.reserva.findUnique({
      where: { codigoReserva: limpio },
      include: {
        user: { select: { id: true, nombreCompleto: true, numeroDocumento: true } },
        dependiente: {
          select: { id: true, nombres: true, apellidos: true, numeroDocumento: true },
        },
        medicamento: true,
        sede: true,
      },
    });

    if (!reserva) {
      throw new NotFoundException(
        `No existe ninguna reserva con el código ${limpio}`,
      );
    }

    if (
      reserva.estado !== 'PENDIENTE' &&
      reserva.estado !== 'LISTA_PARA_RETIRO'
    ) {
      throw new BadRequestException(
        `La reserva ${reserva.codigoReserva} no puede entregarse porque está en estado ${reserva.estado}`,
      );
    }

    if (new Date() > reserva.fechaLimite) {
      throw new BadRequestException(
        `La reserva ${reserva.codigoReserva} ya se encuentra vencida`,
      );
    }

    const ahora = new Date();
    return this.prisma.reserva.update({
      where: { id: reserva.id },
      data: {
        estado: 'ENTREGADA',
        entregadoAt: ahora,
        entregadoPorId: farmaceuticoId ?? null,
        alistadoAt: reserva.alistadoAt ?? ahora,
        alistadoPorId: reserva.alistadoPorId ?? farmaceuticoId ?? null,
        metodoAlistamiento: reserva.metodoAlistamiento ?? 'DIRECTO_VENTANILLA',
      },
      include: {
        user: { select: { id: true, nombreCompleto: true, numeroDocumento: true } },
        dependiente: {
          select: { id: true, nombres: true, apellidos: true, numeroDocumento: true },
        },
        medicamento: true,
        sede: true,
        entregadoPor: { select: { id: true, nombreCompleto: true } },
      },
    });
  }

  async rejectByPharmacy(
    farmaceuticoId: number,
    codigoReserva: string,
    motivo: string,
  ) {
    const limpio = codigoReserva.trim().toUpperCase();
    const reserva = await this.prisma.reserva.findUnique({
      where: { codigoReserva: limpio },
    });

    if (!reserva) {
      throw new NotFoundException(`Reserva ${limpio} no encontrada`);
    }

    if (
      reserva.estado !== 'PENDIENTE' &&
      reserva.estado !== 'LISTA_PARA_RETIRO'
    ) {
      throw new BadRequestException(
        `No se puede rechazar una reserva en estado ${reserva.estado}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.reserva.update({
        where: { id: reserva.id },
        data: {
          estado: 'RECHAZADA_FARMACIA',
          motivoRechazo: motivo.trim(),
          entregadoPorId: farmaceuticoId,
          entregadoAt: new Date(),
        },
        include: {
          user: { select: { id: true, nombreCompleto: true, numeroDocumento: true } },
          medicamento: true,
          sede: true,
        },
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

      return res;
    });

    // Buscar sedes alternativas activas con unidades disponibles
    const sedesAlternativas = await this.prisma.inventarioSede.findMany({
      where: {
        medicamentoId: reserva.medicamentoId,
        sedeId: { not: reserva.sedeId },
        cantidad: { gt: 0 },
        sede: { activa: true },
      },
      include: {
        sede: { select: { nombre: true, direccion: true } },
      },
      orderBy: { cantidad: 'desc' },
      take: 3,
    });

    const textoAlternativas =
      sedesAlternativas.length > 0
        ? ` Sedes alternativas con disponibilidad: ${sedesAlternativas
            .map((a) => `${a.sede.nombre} (${a.cantidad} und.)`)
            .join(', ')}.`
        : ' Por el momento no hay otras sedes con stock disponible; puedes activar la alerta de reabastecimiento.';

    const esInconsistenciaLote = /lote|vencid|dañad|danad|empaque|averia|avería/i.test(
      motivo,
    );

    await this.notificationsService.create({
      userId: updated.userId,
      tipo: esInconsistenciaLote ? 'INCONSISTENCIA_LOTE' : 'CANCELACION_FARMACIA',
      categoria: 'INCIDENCIA',
      prioridad: 'URGENTE',
      titulo: esInconsistenciaLote
        ? `Inconsistencia de lote en reserva ${updated.codigoReserva}`
        : `Reserva ${updated.codigoReserva} cancelada por la farmacia`,
      mensaje: `La sede ${updated.sede.nombre} liberó tu reserva de ${updated.medicamento.nombreGenerico}. Motivo: ${motivo.trim()}.${textoAlternativas}`,
      reservaId: updated.id,
      codigoReserva: updated.codigoReserva,
      medicamentoId: updated.medicamentoId,
      medicamentoNombre: updated.medicamento.nombreGenerico,
      medicamentoCodigo: updated.medicamento.codigo,
      sedeId: updated.sedeId,
      sedeNombre: updated.sede.nombre,
    });

    return updated;
  }
}