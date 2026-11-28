import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/database/prisma.service';

@Injectable()
export class ManageStockAlertsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(userId: number, medicamentoId: number, sedeId?: number) {
    const medicamento = await this.prisma.medicamento.findUnique({
      where: { id: medicamentoId },
      include: { inventarios: true },
    });

    if (!medicamento) {
      throw new NotFoundException(`Medicamento con ID ${medicamentoId} no encontrado`);
    }

    let sedeNombre: string | null = null;

    if (sedeId !== undefined) {
      const sede = await this.prisma.sede.findUnique({ where: { id: sedeId } });
      if (!sede || !sede.activa) {
        throw new NotFoundException(`La sede con ID ${sedeId} no existe o está inactiva`);
      }
      sedeNombre = sede.nombre;

      const invSede = medicamento.inventarios.find((inv) => inv.sedeId === sedeId);
      const stockSede = invSede?.cantidad ?? 0;

      if (stockSede > 0) {
        throw new BadRequestException(
          `Este medicamento ya tiene ${stockSede} unidades disponibles en ${sede.nombre}`,
        );
      }
    } else {
      const stockTotal = medicamento.inventarios.reduce(
        (acc, inv) => acc + inv.cantidad,
        0,
      );

      if (stockTotal > 0) {
        throw new BadRequestException(
          'Este medicamento tiene unidades disponibles; no requiere alerta de stock agotado',
        );
      }
    }

    const existingAlert = await this.prisma.alertaStock.findFirst({
      where: {
        userId,
        medicamentoId,
        sedeId: sedeId ?? null,
        notificado: false,
      },
    });

    if (existingAlert) {
      throw new ConflictException(
        sedeNombre
          ? `Ya tienes una alerta activa para este medicamento en ${sedeNombre}`
          : 'Ya tienes una alerta activa para este medicamento',
      );
    }

    return this.prisma.alertaStock.create({
      data: {
        userId,
        medicamentoId,
        sedeId: sedeId ?? null,
        notificado: false,
      },
      include: {
        medicamento: {
          select: { id: true, codigo: true, nombreGenerico: true, presentacion: true },
        },
        sede: {
          select: { id: true, nombre: true, direccion: true },
        },
      },
    });
  }

  async findByUser(userId: number) {
    return this.prisma.alertaStock.findMany({
      where: { userId },
      include: {
        medicamento: {
          select: { id: true, codigo: true, nombreGenerico: true, presentacion: true },
        },
        sede: {
          select: { id: true, nombre: true, direccion: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}