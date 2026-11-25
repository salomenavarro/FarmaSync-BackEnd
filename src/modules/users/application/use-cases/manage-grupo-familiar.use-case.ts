import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoReserva } from '@prisma/client';
import { PrismaService } from 'src/shared/database/prisma.service';
import { CreateDependienteDto } from '../../presentation/http/dto/create-dependiente.dto';
import { UpdateDependienteDto } from '../../presentation/http/dto/update-dependiente.dto';

// Campos que salen hacia el front. Se declara una sola vez para no
// filtrar titularId, createdAt, etc., y para que lista, detalle, alta y
// edición respondan SIEMPRE con la misma forma.
const CAMPOS_PUBLICOS = {
  id: true,
  nombres: true,
  apellidos: true,
  tipoDocumento: true,
  numeroDocumento: true,
  parentesco: true,
  fechaNacimiento: true,
  correoElectronico: true,
  activo: true,
} as const;

// Caso de uso en la capa de aplicación: orquesta las reglas de negocio del
// Plan Familiar (propiedad por titularId, unicidad de documento, reactivación
// de registros desactivados y borrado seguro frente a reservas) usando Prisma.
@Injectable()
export class ManageGrupoFamiliarUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async addDependiente(titularId: number, dto: CreateDependienteDto) {
    const existing = await this.prisma.dependiente.findUnique({
      where: { numeroDocumento: dto.numeroDocumento },
    });

    if (existing) {
      // Si el mismo titular lo "eliminó" antes (quedó activo = false por
      // tener historial de reservas), volver a agregarlo lo reactiva en
      // vez de dar 409: para la persona es un alta normal.
      if (existing.titularId === titularId && !existing.activo) {
        return this.prisma.dependiente.update({
          where: { id: existing.id },
          data: { ...this.toData(dto), activo: true },
          select: CAMPOS_PUBLICOS,
        });
      }

      throw new ConflictException(
        'Ya existe un dependiente registrado con ese número de documento',
      );
    }

    return this.prisma.dependiente.create({
      data: { titularId, ...this.toData(dto) },
      select: CAMPOS_PUBLICOS,
    });
  }

  async listByTitular(titularId: number) {
    // Solo activos: lo desactivado "ya no está" para la persona.
    return this.prisma.dependiente.findMany({
      where: { titularId, activo: true },
      orderBy: { createdAt: 'asc' },
      select: CAMPOS_PUBLICOS,
    });
  }

  async getById(titularId: number, dependienteId: number) {
    return this.findOwned(titularId, dependienteId);
  }

  async updateDependiente(
    titularId: number,
    dependienteId: number,
    dto: UpdateDependienteDto,
  ) {
    const current = await this.findOwned(titularId, dependienteId);

    // Regla de negocio: se evalúa con el estado FINAL (guardado + cambios).
    const tipoFinal = dto.tipoDocumento ?? current.tipoDocumento;
    const correoFinal = dto.correoElectronico ?? current.correoElectronico;

    if (tipoFinal === 'CC' && !correoFinal?.trim()) {
      throw new BadRequestException(
        'El correo electrónico es obligatorio para Cédula de Ciudadanía',
      );
    }

    if (
      dto.numeroDocumento !== undefined &&
      dto.numeroDocumento !== current.numeroDocumento
    ) {
      const repetido = await this.prisma.dependiente.findUnique({
        where: { numeroDocumento: dto.numeroDocumento },
      });
      if (repetido) {
        throw new ConflictException(
          'Ya existe un dependiente registrado con ese número de documento',
        );
      }
    }

    return this.prisma.dependiente.update({
      where: { id: dependienteId },
      data: {
        nombres: dto.nombres?.trim(),
        apellidos: dto.apellidos?.trim(),
        tipoDocumento: dto.tipoDocumento,
        numeroDocumento: dto.numeroDocumento?.trim(),
        parentesco: dto.parentesco,
        fechaNacimiento: dto.fechaNacimiento
          ? new Date(dto.fechaNacimiento)
          : undefined,
        // El correo solo existe para CC; si deja de ser CC se limpia.
        correoElectronico:
          tipoFinal === 'CC' ? correoFinal!.trim() : null,
      },
      select: CAMPOS_PUBLICOS,
    });
  }

  // Eliminar = lo que la persona ve (desaparece de su lista), pero el
  // backend protege el historial (RF-013) porque reservas.dependiente_id
  // es ON DELETE SET NULL y un borrado real dejaría reservas sin dueño.
  async removeDependiente(titularId: number, dependienteId: number) {
    await this.findOwned(titularId, dependienteId);

    // 1. Reservas activas: no se puede eliminar.
    const reservasActivas = await this.prisma.reserva.count({
      where: { dependienteId, estado: EstadoReserva.PENDIENTE },
    });

    if (reservasActivas > 0) {
      throw new ConflictException(
        'Cancela sus reservas pendientes antes de eliminarlo',
      );
    }

    // 2. Con historial: se desactiva (sale de la lista, el historial queda).
    const historial = await this.prisma.reserva.count({
      where: { dependienteId },
    });

    if (historial > 0) {
      await this.prisma.dependiente.update({
        where: { id: dependienteId },
        data: { activo: false },
      });
    } else {
      // 3. Sin reservas: borrado real (RNF-003, derecho a eliminar datos).
      await this.prisma.dependiente.delete({ where: { id: dependienteId } });
    }

    return { message: 'Dependiente eliminado de tu grupo familiar' };
  }

  // Busca por id Y titular Y activo: así un usuario no puede ver ni tocar
  // dependientes de otro. Un 404 evita confirmar que el id existe.
  private async findOwned(titularId: number, dependienteId: number) {
    const dependiente = await this.prisma.dependiente.findFirst({
      where: { id: dependienteId, titularId, activo: true },
      select: CAMPOS_PUBLICOS,
    });

    if (!dependiente) {
      throw new NotFoundException(
        'El dependiente no existe o no pertenece a tu grupo familiar',
      );
    }

    return dependiente;
  }

  private toData(dto: CreateDependienteDto) {
    return {
      nombres: dto.nombres.trim(),
      apellidos: dto.apellidos.trim(),
      tipoDocumento: dto.tipoDocumento,
      numeroDocumento: dto.numeroDocumento.trim(),
      parentesco: dto.parentesco,
      fechaNacimiento: new Date(dto.fechaNacimiento),
      // Solo se guarda para CC; para RC/TI se ignora aunque llegue.
      correoElectronico:
        dto.tipoDocumento === 'CC' ? dto.correoElectronico!.trim() : null,
    };
  }
}