import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Dependiente } from '@prisma/client';
import { PrismaService } from 'src/shared/database/prisma.service';
import { CreateDependienteDto } from '../../presentation/http/dto/create-dependiente.dto';
import { UpdateDependienteDto } from '../../presentation/http/dto/update-dependiente.dto';

@Injectable()
export class ManageGrupoFamiliarUseCase {
  constructor(private readonly prisma: PrismaService) {}

  private toFrontendContract(dep: Dependiente) {
    return {
      id: String(dep.id),
      nombres: dep.nombres,
      apellidos: dep.apellidos,
      tipoDocumento: dep.tipoDocumento,
      numeroDocumento: dep.numeroDocumento,
      parentesco: dep.parentesco,
      fechaNacimiento: dep.fechaNacimiento.toISOString().slice(0, 10),
      correoElectronico: dep.correoElectronico ?? undefined,
      estado: dep.activo ? 'Activo' : 'Inactivo',
      activo: dep.activo,
    };
  }

  async addDependiente(titularId: number, dto: CreateDependienteDto) {
    const existing = await this.prisma.dependiente.findUnique({
      where: { numeroDocumento: dto.numeroDocumento },
    });

    if (existing) {
      throw new ConflictException(
        'Ya existe un dependiente registrado con ese número de documento',
      );
    }

    const created = await this.prisma.dependiente.create({
      data: {
        titularId,
        nombres: dto.nombres.trim(),
        apellidos: dto.apellidos.trim(),
        tipoDocumento: dto.tipoDocumento,
        numeroDocumento: dto.numeroDocumento.trim(),
        parentesco: dto.parentesco,
        fechaNacimiento: new Date(`${dto.fechaNacimiento.slice(0, 10)}T00:00:00.000Z`),
        correoElectronico:
          dto.tipoDocumento === 'CC' && dto.correoElectronico?.trim()
            ? dto.correoElectronico.trim()
            : null,
        activo: true,
      },
    });

    return this.toFrontendContract(created);
  }

  async listByTitular(titularId: number) {
    const dependientes = await this.prisma.dependiente.findMany({
      where: { titularId },
      orderBy: { createdAt: 'asc' },
    });

    return dependientes.map((dep) => this.toFrontendContract(dep));
  }

  async getDependienteById(titularId: number, dependienteId: number) {
    const dependiente = await this.prisma.dependiente.findFirst({
      where: { id: dependienteId, titularId },
    });

    if (!dependiente) {
      throw new NotFoundException(
        'El dependiente no existe o no pertenece a tu grupo familiar',
      );
    }

    return this.toFrontendContract(dependiente);
  }

  async updateDependiente(
    titularId: number,
    dependienteId: number,
    dto: UpdateDependienteDto,
  ) {
    const dependiente = await this.prisma.dependiente.findFirst({
      where: { id: dependienteId, titularId },
    });

    if (!dependiente) {
      throw new NotFoundException(
        'El dependiente no existe o no pertenece a tu grupo familiar',
      );
    }

    if (
      dto.numeroDocumento &&
      dto.numeroDocumento.trim() !== dependiente.numeroDocumento
    ) {
      const duplicate = await this.prisma.dependiente.findUnique({
        where: { numeroDocumento: dto.numeroDocumento.trim() },
      });
      if (duplicate) {
        throw new ConflictException(
          'Ya existe otro dependiente registrado con ese número de documento',
        );
      }
    }

    const nextTipoDoc = dto.tipoDocumento ?? dependiente.tipoDocumento;
    let nextCorreo = dependiente.correoElectronico;
    if (nextTipoDoc !== 'CC') {
      nextCorreo = null;
    } else if (dto.correoElectronico !== undefined) {
      nextCorreo = dto.correoElectronico?.trim() || null;
    }

    const updated = await this.prisma.dependiente.update({
      where: { id: dependienteId },
      data: {
        ...(dto.nombres !== undefined && { nombres: dto.nombres.trim() }),
        ...(dto.apellidos !== undefined && { apellidos: dto.apellidos.trim() }),
        ...(dto.tipoDocumento !== undefined && { tipoDocumento: dto.tipoDocumento }),
        ...(dto.numeroDocumento !== undefined && {
          numeroDocumento: dto.numeroDocumento.trim(),
        }),
        ...(dto.parentesco !== undefined && { parentesco: dto.parentesco }),
        ...(dto.fechaNacimiento !== undefined && {
          fechaNacimiento: new Date(`${dto.fechaNacimiento.slice(0, 10)}T00:00:00.000Z`),
        }),
        correoElectronico: nextCorreo,
        ...(dto.activo !== undefined && { activo: dto.activo }),
      },
    });

    return this.toFrontendContract(updated);
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

    const deactivated = await this.prisma.dependiente.update({
      where: { id: dependienteId },
      data: { activo: false },
    });

    return {
      message: 'Dependiente desactivado de tu grupo familiar',
      dependiente: this.toFrontendContract(deactivated),
    };
  }
}