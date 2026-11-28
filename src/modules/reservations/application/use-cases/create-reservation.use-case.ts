import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/database/prisma.service';
import { NotificationsService } from '../../../notifications/application/services/notifications.service';
import { ReservationRules } from '../../domain/entities/reservation-rules.entity';
import { CreateReservationDto } from '../../presentation/http/dto/create-reservation.dto';

@Injectable()
export class CreateReservationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async execute(userId: number, dto: CreateReservationDto) {
        const soloFecha = String(dto.fechaRecogida).trim().split('T')[0];
    const partesFecha = soloFecha.split('-').map(Number);
    const fechaRecogidaDate =
      partesFecha.length === 3 && partesFecha.every((n) => !Number.isNaN(n))
        ? new Date(partesFecha[0], partesFecha[1] - 1, partesFecha[2], 12, 0, 0, 0)
        : new Date(dto.fechaRecogida);
    const fechaLimite = ReservationRules.validarFechaRecogida(fechaRecogidaDate);

    // 1. Validar lÃ­mite mÃ¡ximo de 5 reservas activas simultÃ¡neas por cuenta
    const activasCount = await this.prisma.reserva.count({
      where: {
        userId,
        estado: 'PENDIENTE',
      },
    });

    if (activasCount >= ReservationRules.MAX_RESERVAS_ACTIVAS) {
      throw new BadRequestException(
        `Has alcanzado el lÃ­mite mÃ¡ximo de ${ReservationRules.MAX_RESERVAS_ACTIVAS} reservas activas simultÃ¡neas`,
      );
    }

    // 2. Validar titular y beneficiario (si aplica Plan Familiar)
    const titular = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, numeroDocumento: true, nombreCompleto: true },
    });

    if (!titular) {
      throw new NotFoundException('Usuario titular no encontrado');
    }

    let documentoBeneficiario = titular.numeroDocumento;

    if (dto.dependienteId) {
      const dependiente = await this.prisma.dependiente.findUnique({
        where: { id: dto.dependienteId },
      });

      if (!dependiente || !dependiente.activo) {
        throw new NotFoundException('El integrante del Plan Familiar no existe o estÃ¡ inactivo');
      }

      if (dependiente.titularId !== userId) {
        throw new ForbiddenException(
          'El beneficiario seleccionado no pertenece a tu Plan Familiar',
        );
      }

      documentoBeneficiario = dependiente.numeroDocumento;
    }

    // 3. Validar existencia de sede y medicamento
    const [sede, medicamento] = await Promise.all([
      this.prisma.sede.findUnique({ where: { id: dto.sedeId } }),
      this.prisma.medicamento.findUnique({ where: { id: dto.medicamentoId } }),
    ]);

    if (!sede || !sede.activa) {
      throw new NotFoundException('La sede seleccionada no existe o estÃ¡ inactiva');
    }

    if (!medicamento) {
      throw new NotFoundException('El medicamento seleccionado no existe');
    }

    // 4. TransacciÃ³n atÃ³mica con bloqueo de fila (FOR UPDATE) en PostgreSQL
    const reservaCreada = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: number; cantidad: number }>>`
        SELECT id, cantidad
        FROM inventario_sedes
        WHERE sede_id = ${dto.sedeId} AND medicamento_id = ${dto.medicamentoId}
        FOR UPDATE
      `;

      const inventario = rows[0];

      if (!inventario || inventario.cantidad <= 0) {
        const sedesAlternativas = await tx.inventarioSede.findMany({
          where: {
            medicamentoId: dto.medicamentoId,
            sedeId: { not: dto.sedeId },
            cantidad: { gt: 0 },
            sede: { activa: true },
          },
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
          },
        });

        throw new ConflictException({
          message:
            'El stock se agotÃ³ hace un instante. Te sugerimos estas sedes disponibles:',
          sedesAlternativas: sedesAlternativas.map((alt) => ({
            sede: alt.sede,
            cantidadDisponible: alt.cantidad,
          })),
        });
      }

      // Descontar 1 unidad de forma atÃ³mica
      await tx.inventarioSede.update({
        where: { id: inventario.id },
        data: { cantidad: { decrement: 1 } },
      });

      // Generar cÃ³digo alfanumÃ©rico Ãºnico FS-XXXX
      let codigoReserva = ReservationRules.generarCodigoUnico();
      let existeCodigo = await tx.reserva.findUnique({
        where: { codigoReserva },
      });

      while (existeCodigo) {
        codigoReserva = ReservationRules.generarCodigoUnico();
        existeCodigo = await tx.reserva.findUnique({
          where: { codigoReserva },
        });
      }

      const codigoQr = ReservationRules.generarPayloadQr({
        codigoReserva,
        documentoBeneficiario,
        sedeId: dto.sedeId,
        medicamentoId: dto.medicamentoId,
      });

      return tx.reserva.create({
        data: {
          codigoReserva,
          codigoQr,
          userId,
          dependienteId: dto.dependienteId ?? null,
          sedeId: dto.sedeId,
          medicamentoId: dto.medicamentoId,
          numeroOrdenMedica: dto.numeroOrdenMedica.trim(),
          fechaRecogida: fechaRecogidaDate,
          fechaLimite,
          prorrogaSolicitada: false,
          estado: 'PENDIENTE',
        },
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
              requiereOrden: true,
            },
          },
          dependiente: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
              tipoDocumento: true,
              numeroDocumento: true,
              parentesco: true,
            },
          },
        },
      });
    });

    await this.notificationsService.create({
      userId,
      tipo: 'CONFIRMACION_RESERVA',
      categoria: 'RESERVA',
      prioridad: 'INFORMATIVA',
      titulo: `Reserva ${reservaCreada.codigoReserva} confirmada`,
      mensaje: `Tu reserva de ${reservaCreada.medicamento.nombreGenerico} en ${reservaCreada.sede.nombre} fue registrada. Plazo lÃ­mite de recogida: ${reservaCreada.fechaLimite.toLocaleString('es-CO')}.`,
      reservaId: reservaCreada.id,
      codigoReserva: reservaCreada.codigoReserva,
      medicamentoId: reservaCreada.medicamento.id,
      medicamentoNombre: reservaCreada.medicamento.nombreGenerico,
      medicamentoCodigo: reservaCreada.medicamento.codigo,
      sedeId: reservaCreada.sede.id,
      sedeNombre: reservaCreada.sede.nombre,
      fechaVencimiento: reservaCreada.fechaLimite,
    });

    return reservaCreada;
  }
}