import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/database/prisma.service';

export interface FiltroReporteEps {
  sedeId?: number;
  fechaInicio?: string;
  fechaFin?: string;
}

@Injectable()
export class GetAdminDashboardUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(filtros?: FiltroReporteEps) {
    const whereReservas = {
      ...(filtros?.sedeId ? { sedeId: filtros.sedeId } : {}),
      ...(filtros?.fechaInicio || filtros?.fechaFin
        ? {
            createdAt: {
              ...(filtros.fechaInicio
                ? { gte: new Date(`${filtros.fechaInicio}T00:00:00.000Z`) }
                : {}),
              ...(filtros.fechaFin
                ? { lte: new Date(`${filtros.fechaFin}T23:59:59.999Z`) }
                : {}),
            },
          }
        : {}),
    };

    const [
      sedes,
      farmaceuticosActivos,
      inventariosEnAlerta,
      reservas,
    ] = await Promise.all([
      this.prisma.sede.findMany({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          nombre: true,
          direccion: true,
          ciudad: true,
          activa: true,
        },
      }),
      this.prisma.user.count({
        where: {
          activo: true,
          role: { name: 'FARMACEUTICO' },
          ...(filtros?.sedeId ? { sedeId: filtros.sedeId } : {}),
        },
      }),
      this.prisma.inventarioSede.findMany({
        where: {
          cantidad: { lte: 15 },
          sede: { activa: true },
          ...(filtros?.sedeId ? { sedeId: filtros.sedeId } : {}),
        },
        include: {
          medicamento: {
            select: {
              nombreGenerico: true,
              concentracion: true,
            },
          },
        },
        orderBy: { cantidad: 'asc' },
      }),
      this.prisma.reserva.findMany({
        where: whereReservas,
        select: {
          sedeId: true,
          estado: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const alertasStock = inventariosEnAlerta.map((item) => {
      const nombre = [
        item.medicamento.nombreGenerico,
        item.medicamento.concentracion,
      ]
        .filter(Boolean)
        .join(' ');

      return {
        id: item.id,
        medicamento: nombre,
        sedeId: item.sedeId,
        unidadesDisponibles: item.cantidad,
        nivel: item.cantidad === 0 ? ('CRITICO' as const) : ('BAJO' as const),
      };
    });

    const totalReservas = reservas.length;
    const reservasEntregadas = reservas.filter(
      (r) => r.estado === 'ENTREGADA',
    ).length;
    const reservasNoEfectuadas = reservas.filter(
      (r) => r.estado === 'CANCELADA_USUARIO' || r.estado === 'EXPIRADA',
    ).length;
    const reservasPendientes = reservas.filter(
      (r) => r.estado === 'PENDIENTE',
    ).length;

    const mapaDemanda = new Map<
      string,
      { fecha: string; sedeId: number; cantidadSolicitudes: number }
    >();

    for (const reserva of reservas) {
      const fecha = reserva.createdAt.toISOString().split('T')[0];
      const clave = `${fecha}__${reserva.sedeId}`;
      const actual = mapaDemanda.get(clave);

      if (actual) {
        actual.cantidadSolicitudes += 1;
      } else {
        mapaDemanda.set(clave, {
          fecha,
          sedeId: reserva.sedeId,
          cantidadSolicitudes: 1,
        });
      }
    }

    const demanda = Array.from(mapaDemanda.values()).sort((a, b) =>
      a.fecha.localeCompare(b.fecha),
    );

    return {
      sedes,
      indicadores: {
        farmaceuticosActivos,
        sedesRegistradas: sedes.filter((s) => s.activa).length,
        reservasTotales: totalReservas,
        medicamentosEnAlerta: alertasStock.length,
      },
      alertasStock,
      demanda,
      efectividad: {
        totalReservas,
        reservasEntregadas,
        reservasNoEfectuadas,
        reservasPendientes,
      },
    };
  }
}