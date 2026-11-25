import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/database/prisma.service';
import { CreateDependienteDto } from '../../presentation/http/dto/create-dependiente.dto';

@Injectable()
export class ManageGrupoFamiliarUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async addDependiente(titularId: number, dto: CreateDependienteDto) {
    const existing = await this.prisma.dependiente.findUnique({
      where: { numeroDocumento: dto.numeroDocumento },
    });

    if (existing) {
      throw new ConflictException(
        'Ya existe un dependiente registrado con ese número de documento',
      );
    }

    return this.prisma.dependiente.create({
      data: {
        titularId,
        nombreCompleto: dto.nombreCompleto,
        tipoDocumento: dto.tipoDocumento,
        numeroDocumento: dto.numeroDocumento,
        parentesco: dto.parentesco,
        fechaNacimiento: new Date(dto.fechaNacimiento),
      },
    });
  }

  async listByTitular(titularId: number) {
    return this.prisma.dependiente.findMany({
      where: { titularId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async removeDependiente(titularId: number, dependienteId: number) {
    const dependiente = await this.prisma.dependiente.findFirst({
      where: { id: dependienteId, titularId },
    });

    if (!dependiente) {
      throw new NotFoundException(
        'El dependiente no existe o no pertenece a tu grupo familiar',
      );
    }

    await this.prisma.dependiente.delete({
      where: { id: dependienteId },
    });

    return { message: 'Dependiente eliminado de tu grupo familiar' };
  }
}