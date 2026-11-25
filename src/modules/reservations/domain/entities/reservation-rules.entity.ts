import { BadRequestException } from '@nestjs/common';

export class ReservationRules {
  static readonly MAX_RESERVAS_ACTIVAS = 5;
  static readonly MAX_DIAS_HABILES = 5;
  static readonly HORAS_PRORROGA = 24;
  static readonly HORAS_MINIMAS_CANCELACION = 1;

  static generarCodigoUnico(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let sufijo = '';
    for (let i = 0; i < 4; i++) {
      sufijo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `FS-${sufijo}`;
  }

  static generarPayloadQr(data: {
    codigoReserva: string;
    documentoBeneficiario: string;
    sedeId: number;
    medicamentoId: number;
  }): string {
    return JSON.stringify({
      app: 'FarmaSync',
      codigo: data.codigoReserva,
      doc: data.documentoBeneficiario,
      sedeId: data.sedeId,
      medId: data.medicamentoId,
    });
  }

  static calcularFechaMaxima5DiasHabiles(desde: Date = new Date()): Date {
    const fecha = new Date(desde);
    let diasHabilesSumados = 0;

    while (diasHabilesSumados < this.MAX_DIAS_HABILES) {
      fecha.setDate(fecha.getDate() + 1);
      const diaSemana = fecha.getDay(); // 0 = Domingo, 6 = Sábado
      if (diaSemana !== 0 && diaSemana !== 6) {
        diasHabilesSumados++;
      }
    }

    fecha.setHours(23, 59, 59, 999);
    return fecha;
  }

  static validarFechaRecogida(fechaRecogida: Date, ahora: Date = new Date()): Date {
    if (Number.isNaN(fechaRecogida.getTime())) {
      throw new BadRequestException('La fecha de recogida no es válida');
    }

    const inicioHoy = new Date(ahora);
    inicioHoy.setHours(0, 0, 0, 0);

    if (fechaRecogida < inicioHoy) {
      throw new BadRequestException(
        'La fecha de recogida no puede ser anterior al día de hoy',
      );
    }

    const maxPermitida = this.calcularFechaMaxima5DiasHabiles(ahora);
    if (fechaRecogida > maxPermitida) {
      throw new BadRequestException(
        'La fecha de recogida no puede superar los 5 días hábiles a partir de hoy',
      );
    }

    // El plazo límite vence al cierre del día seleccionado (23:59:59)
    const fechaLimite = new Date(fechaRecogida);
    fechaLimite.setHours(23, 59, 59, 999);
    return fechaLimite;
  }

  static validarPuedeSolicitarProrroga(reserva: {
    estado: string;
    prorrogaSolicitada: boolean;
    fechaLimite: Date;
  }): Date {
    if (reserva.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        'Solo se puede solicitar prórroga sobre reservas en estado PENDIENTE',
      );
    }

    if (reserva.prorrogaSolicitada) {
      throw new BadRequestException(
        'Ya utilizaste la prórroga única de 24 horas para esta reserva',
      );
    }

    const ahora = new Date();
    if (ahora > reserva.fechaLimite) {
      throw new BadRequestException(
        'La reserva ya superó su fecha límite y no admite prórroga',
      );
    }

    const nuevaFechaLimite = new Date(reserva.fechaLimite);
    nuevaFechaLimite.setHours(
      nuevaFechaLimite.getHours() + this.HORAS_PRORROGA,
    );
    return nuevaFechaLimite;
  }

  static validarPuedeCancelar(reserva: {
    estado: string;
    fechaLimite: Date;
  }): void {
    if (reserva.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        'Solo se pueden cancelar reservas en estado PENDIENTE',
      );
    }

    const ahora = new Date();
    const diferenciaMs = reserva.fechaLimite.getTime() - ahora.getTime();
    const unaHoraMs = this.HORAS_MINIMAS_CANCELACION * 60 * 60 * 1000;

    if (diferenciaMs < unaHoraMs) {
      throw new BadRequestException(
        'Solo puedes cancelar voluntariamente hasta 1 hora antes del vencimiento del plazo',
      );
    }
  }
}
