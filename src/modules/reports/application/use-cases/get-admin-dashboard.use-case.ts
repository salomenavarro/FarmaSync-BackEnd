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
          sede: {
            select: {
              nombre: true,
              ciudad: true,
            },
          },
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
        sedeNombre: item.sede.nombre,
        ciudad: item.sede.ciudad,
        unidadesDisponibles: item.cantidad,
        nivel: item.cantidad === 0 ? ('CRITICO' as const) : ('BAJO' as const),
      };
    });

    const sedesFiltradas = filtros?.sedeId
      ? sedes.filter((s) => s.id === filtros.sedeId)
      : sedes;

    const desabastecimientoPorSede = sedesFiltradas.map((sede) => {
      const alertasSede = alertasStock.filter((a) => a.sedeId === sede.id);
      const agotados = alertasSede.filter((a) => a.nivel === 'CRITICO').length;
      const stockBajo = alertasSede.filter((a) => a.nivel === 'BAJO').length;

      return {
        sedeId: sede.id,
        sedeNombre: sede.nombre,
        ciudad: sede.ciudad,
        medicamentosAgotados: agotados,
        medicamentosStockBajo: stockBajo,
        totalEnAlerta: alertasSede.length,
      };
    });

    const totalReservas = reservas.length;
    const reservasEntregadas = reservas.filter(
      (r) => r.estado === 'ENTREGADA',
    ).length;
    const reservasNoEfectuadas = reservas.filter(
      (r) =>
        r.estado === 'CANCELADA_USUARIO' ||
        r.estado === 'EXPIRADA' ||
        r.estado === 'RECHAZADA_FARMACIA',
    ).length;
    const reservasPendientes = reservas.filter(
      (r) =>
        r.estado === 'PENDIENTE' ||
        r.estado === 'LISTA_PARA_RETIRO',
    ).length;

    const porcentajeEfectividad =
      totalReservas > 0
        ? Number(((reservasEntregadas / totalReservas) * 100).toFixed(2))
        : 0;

    const mapaSedes = new Map(sedes.map((s) => [s.id, s.nombre]));
    const mapaDemanda = new Map<
      string,
      {
        fecha: string;
        sedeId: number;
        sedeNombre: string;
        cantidadSolicitudes: number;
      }
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
          sedeNombre: mapaSedes.get(reserva.sedeId) ?? `Sede #${reserva.sedeId}`,
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
        medicamentosAgotados: alertasStock.filter((a) => a.nivel === 'CRITICO')
          .length,
      },
      alertasStock,
      desabastecimientoPorSede,
      demanda,
      efectividad: {
        totalReservas,
        reservasEntregadas,
        reservasNoEfectuadas,
        reservasPendientes,
        porcentajeEfectividad,
      },
    };
  }
}