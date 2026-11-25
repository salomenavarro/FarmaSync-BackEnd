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

  async subscribe(userId: number, medicamentoId: number) {
    const medicamento = await this.prisma.medicamento.findUnique({
      where: { id: medicamentoId },
      include: { inventarios: true },
    });

    if (!medicamento) {
      throw new NotFoundException(`Medicamento con ID ${medicamentoId} no encontrado`);
    }

    const stockTotal = medicamento.inventarios.reduce(
      (acc, inv) => acc + inv.cantidad,
      0,
    );

    if (stockTotal > 0) {
      throw new BadRequestException(
        'Este medicamento tiene unidades disponibles; no requiere alerta de stock agotado',
      );
    }

    const existingAlert = await this.prisma.alertaStock.findUnique({
      where: {
        userId_medicamentoId_notificado: {
          userId,
          medicamentoId,
          notificado: false,
        },
      },
    });

    if (existingAlert) {
      throw new ConflictException(
        'Ya tienes una alerta activa para este medicamento',
      );
    }

    return this.prisma.alertaStock.create({
      data: {
        userId,
        medicamentoId,
        notificado: false,
      },
      include: {
        medicamento: {
          select: { id: true, codigo: true, nombreGenerico: true, presentacion: true },
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
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
