import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/shared/database/prisma.service';
import { InventoryRules } from '../../domain/entities/inventory-status.entity';
import { UpdateStockDto } from '../../presentation/http/dto/update-stock.dto';
import { IngresarLoteEanDto } from '../../presentation/http/dto/ingresar-lote-ean.dto';

@Injectable()
export class UpdateStockUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(medicamentoId: number, dto: UpdateStockDto) {
    const medicamento = await this.prisma.medicamento.findUnique({
      where: { id: medicamentoId },
    });
    if (!medicamento) {
      throw new NotFoundException(`Medicamento con ID ${medicamentoId} no encontrado`);
    }

    const sede = await this.prisma.sede.findUnique({ where: { id: dto.sedeId } });
    if (!sede) {
      throw new NotFoundException(`La sede con ID ${dto.sedeId} no existe`);
    }

    const updatedInventario = await this.prisma.inventarioSede.upsert({
      where: {
        sedeId_medicamentoId: {
          sedeId: dto.sedeId,
          medicamentoId,
        },
      },
      update: { cantidad: dto.cantidad },
      create: {
        sedeId: dto.sedeId,
        medicamentoId,
        cantidad: dto.cantidad,
      },
      include: {
        medicamento: true,
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
    });

    let alertasNotificadas = 0;

    if (dto.cantidad > 0) {
      const alertasPendientes = await this.prisma.alertaStock.findMany({
        where: { medicamentoId, notificado: false },
      });

      if (alertasPendientes.length > 0) {
        await this.prisma.alertaStock.deleteMany({
          where: {
            medicamentoId,
            notificado: true,
            userId: { in: alertasPendientes.map((a) => a.userId) },
          },
        });

        const updated = await this.prisma.alertaStock.updateMany({
          where: { medicamentoId, notificado: false },
          data: { notificado: true },
        });

        alertasNotificadas = updated.count;
      }
    }

    return {
      ...updatedInventario,
      estadoInventario: InventoryRules.calcularEstado(updatedInventario.cantidad),
      alertasNotificadas,
    };
  }

  async ingresarPorCodigoEan(userId: number, dto: IngresarLoteEanDto) {
    const empleado = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { sedeId: true },
    });
    const sedeId = dto.sedeId ?? empleado?.sedeId;
    if (!sedeId) {
      throw new NotFoundException('El farmacéutico no tiene sede asignada');
    }

    const limpio = dto.codigo.trim();
    const medicamento = await this.prisma.medicamento.findFirst({
      where: {
        OR: [{ codigoEan: limpio }, { codigo: limpio }],
      },
    });

    if (!medicamento) {
      throw new NotFoundException(
        `No existe ningún medicamento registrado con código/EAN-13 "${limpio}"`,
      );
    }

    const actual = await this.prisma.inventarioSede.findUnique({
      where: {
        sedeId_medicamentoId: { sedeId, medicamentoId: medicamento.id },
      },
    });

    const nuevaCantidad = (actual?.cantidad ?? 0) + dto.cantidad;
    return this.execute(medicamento.id, { sedeId, cantidad: nuevaCantidad });
  }
}