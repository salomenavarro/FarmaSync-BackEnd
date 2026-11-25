import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/shared/database/prisma.service';
import { InventoryRules } from '../../domain/entities/inventory-status.entity';
import { CreateMedicineDto } from '../../presentation/http/dto/create-medicine.dto';

export interface SearchMedicinesFilters {
  search?: string;
  sedeId?: number;
  ciudad?: string;
  zona?: string;
  lat?: number;
  lng?: number;
}

@Injectable()
export class SearchMedicinesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  private formatMedicamento(med: any, filters?: SearchMedicinesFilters) {
    const todosInventarios = (med.inventarios || []).map((inv: any) => {
      const distanciaKm =
        filters?.lat !== undefined &&
        filters?.lng !== undefined &&
        inv.sede?.latitud !== null &&
        inv.sede?.longitud !== null
          ? InventoryRules.calcularDistanciaKm(
              filters.lat,
              filters.lng,
              inv.sede.latitud,
              inv.sede.longitud,
            )
          : undefined;

      return {
        ...inv,
        estadoInventario: InventoryRules.calcularEstado(inv.cantidad),
        ...(distanciaKm !== undefined && { distanciaKm }),
      };
    });

    if (filters?.lat !== undefined && filters?.lng !== undefined) {
      todosInventarios.sort(
        (a: any, b: any) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity),
      );
    }

    const ciudadFiltro = InventoryRules.normalizeText(filters?.ciudad);
    const zonaFiltro = InventoryRules.normalizeText(filters?.zona);

    const inventariosFiltrados = todosInventarios.filter((inv: any) => {
      if (filters?.sedeId && inv.sedeId !== filters.sedeId) return false;
      if (
        ciudadFiltro &&
        !InventoryRules.normalizeText(inv.sede?.ciudad).includes(ciudadFiltro)
      ) {
        return false;
      }
      if (
        zonaFiltro &&
        !InventoryRules.normalizeText(inv.sede?.zona).includes(zonaFiltro)
      ) {
        return false;
      }
      return true;
    });

    let sedesAlternativas: any[] = [];
    if (filters?.sedeId) {
      const invSedeSeleccionada = inventariosFiltrados.find(
        (inv: any) => inv.sedeId === filters.sedeId,
      );

      if (!invSedeSeleccionada || invSedeSeleccionada.cantidad <= 0) {
        sedesAlternativas = todosInventarios
          .filter((inv: any) => inv.sedeId !== filters.sedeId && inv.cantidad > 0)
          .map((inv: any) => ({
            sede: inv.sede,
            cantidadDisponible: inv.cantidad,
            estadoInventario: inv.estadoInventario,
            ...(inv.distanciaKm !== undefined && { distanciaKm: inv.distanciaKm }),
          }));
      }
    }

    const stockTotalGlobal = todosInventarios.reduce(
      (acc: number, inv: any) => acc + inv.cantidad,
      0,
    );

    return {
      id: med.id,
      codigo: med.codigo,
      nombreGenerico: med.nombreGenerico,
      presentacion: med.presentacion,
      concentracion: med.concentracion,
      requiereOrden: med.requiereOrden,
      createdAt: med.createdAt,
      updatedAt: med.updatedAt,
      inventarios: inventariosFiltrados,
      ...(filters?.sedeId && { sedesAlternativas }),
      puedeActivarAlerta: stockTotalGlobal === 0,
    };
  }

  async create(dto: CreateMedicineDto) {
    const sede = await this.prisma.sede.findUnique({ where: { id: dto.sedeId } });
    if (!sede) {
      throw new NotFoundException(`La sede con ID ${dto.sedeId} no existe`);
    }

    const medicamento = await this.prisma.medicamento.upsert({
      where: { codigo: dto.codigo },
      update: {},
      create: {
        codigo: dto.codigo,
        nombreGenerico: dto.nombreGenerico,
        presentacion: dto.presentacion,
        concentracion: dto.concentracion,
        requiereOrden: dto.requiereOrden ?? false,
      },
    });

    await this.prisma.inventarioSede.upsert({
      where: {
        sedeId_medicamentoId: {
          sedeId: dto.sedeId,
          medicamentoId: medicamento.id,
        },
      },
      update: { cantidad: dto.cantidad },
      create: {
        sedeId: dto.sedeId,
        medicamentoId: medicamento.id,
        cantidad: dto.cantidad,
      },
    });

    const result = await this.prisma.medicamento.findUnique({
      where: { id: medicamento.id },
      include: {
        inventarios: {
          include: {
            sede: {
              select: {
                id: true,
                nombre: true,
                ciudad: true,
                zona: true,
                direccion: true,
                latitud: true,
                longitud: true,
              },
            },
          },
        },
      },
    });

    return this.formatMedicamento(result);
  }

  async findAll(filters: SearchMedicinesFilters) {
    const medicamentos = await this.prisma.medicamento.findMany({
      include: {
        inventarios: {
          where: { sede: { activa: true } },
          include: {
            sede: {
              select: {
                id: true,
                nombre: true,
                ciudad: true,
                zona: true,
                direccion: true,
                latitud: true,
                longitud: true,
              },
            },
          },
        },
      },
      orderBy: { nombreGenerico: 'asc' },
    });

    const searchFiltro = InventoryRules.normalizeText(filters.search);

    return medicamentos
      .filter((med) => {
        if (!searchFiltro) return true;
        return (
          InventoryRules.normalizeText(med.nombreGenerico).includes(searchFiltro) ||
          InventoryRules.normalizeText(med.codigo).includes(searchFiltro)
        );
      })
      .map((med) => this.formatMedicamento(med, filters))
      .filter((med) => {
        if ((filters.ciudad || filters.zona) && !filters.sedeId) {
          return med.inventarios.length > 0;
        }
        return true;
      });
  }
}
