import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/shared/database/prisma.service';
import { CreateFarmaceuticoDto } from '../../presentation/http/dto/create-farmaceutico.dto';
import {
  ToggleEstadoFarmaceuticoDto,
  UpdateFarmaceuticoDto,
} from '../../presentation/http/dto/update-farmaceutico.dto';

const SELECT_FARMACEUTICO = {
  id: true,
  nombreCompleto: true,
  numeroDocumento: true,
  correo: true,
  telefono: true,
  sedeId: true,
  activo: true,
  createdAt: true,
  sede: { select: { id: true, nombre: true, ciudad: true, zona: true } },
  role: { select: { name: true } },
} as const;

@Injectable()
export class ManageEmpleadosUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async createFarmaceutico(dto: CreateFarmaceuticoDto) {
    const roleFarmaceutico = await this.prisma.role.findUnique({
      where: { name: 'FARMACEUTICO' },
    });

    if (!roleFarmaceutico) {
      throw new NotFoundException('El rol FARMACEUTICO no existe en la base de datos');
    }

    const sede = await this.prisma.sede.findUnique({
      where: { id: dto.sedeId },
    });

    if (!sede) {
      throw new NotFoundException(`La sede con ID ${dto.sedeId} no existe`);
    }

    const duplicado = await this.prisma.user.findFirst({
      where: {
        OR: [
          { numeroDocumento: dto.numeroDocumento.trim() },
          { correo: dto.correo.trim().toLowerCase() },
        ],
      },
    });

    if (duplicado) {
      throw new ConflictException(
        'Ya existe un usuario registrado con ese documento o correo electrónico',
      );
    }

    const nombreCompleto = this.resolverNombreCompleto(dto);
    const passwordPlano = dto.password?.trim() || `Farma${dto.numeroDocumento.trim()}*`;
    const passwordHash = await bcrypt.hash(passwordPlano, 10);

    const creado = await this.prisma.user.create({
      data: {
        nombreCompleto,
        numeroDocumento: dto.numeroDocumento.trim(),
        correo: dto.correo.trim().toLowerCase(),
        telefono: dto.telefono?.trim() || null,
        passwordHash,
        roleId: roleFarmaceutico.id,
        sedeId: dto.sedeId,
        activo: dto.estado ? dto.estado === 'ACTIVO' : true,
      },
      select: SELECT_FARMACEUTICO,
    });

    return this.formatearFarmaceutico(creado);
  }

  async listFarmaceuticos() {
    const empleados = await this.prisma.user.findMany({
      where: { role: { name: 'FARMACEUTICO' } },
      select: SELECT_FARMACEUTICO,
      orderBy: { createdAt: 'desc' },
    });

    return empleados.map((emp) => this.formatearFarmaceutico(emp));
  }

  async updateFarmaceutico(id: number, dto: UpdateFarmaceuticoDto) {
    const actual = await this.prisma.user.findFirst({
      where: { id, role: { name: 'FARMACEUTICO' } },
    });

    if (!actual) {
      throw new NotFoundException('El farmacéutico no existe');
    }

    if (dto.sedeId !== undefined) {
      const sede = await this.prisma.sede.findUnique({
        where: { id: dto.sedeId },
      });
      if (!sede) {
        throw new NotFoundException(`La sede con ID ${dto.sedeId} no existe`);
      }
    }

    if (dto.numeroDocumento || dto.correo) {
      const duplicado = await this.prisma.user.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(dto.numeroDocumento
              ? [{ numeroDocumento: dto.numeroDocumento.trim() }]
              : []),
            ...(dto.correo ? [{ correo: dto.correo.trim().toLowerCase() }] : []),
          ],
        },
      });

      if (duplicado) {
        throw new ConflictException(
          'Otro usuario ya tiene registrado ese documento o correo electrónico',
        );
      }
    }

    const nombreCompleto =
      dto.nombreCompleto || dto.nombres || dto.apellidos
        ? this.resolverNombreCompleto(dto, actual.nombreCompleto)
        : undefined;

    const activoFinal =
      dto.activo !== undefined
        ? dto.activo
        : dto.estado !== undefined
          ? dto.estado === 'ACTIVO'
          : undefined;

    const actualizado = await this.prisma.user.update({
      where: { id },
      data: {
        nombreCompleto,
        numeroDocumento: dto.numeroDocumento?.trim(),
        correo: dto.correo?.trim().toLowerCase(),
        telefono: dto.telefono !== undefined ? dto.telefono.trim() || null : undefined,
        sedeId: dto.sedeId,
        activo: activoFinal,
      },
      select: SELECT_FARMACEUTICO,
    });

    if (activoFinal === false) {
      await this.prisma.userSession.deleteMany({ where: { userId: id } });
    }

    return this.formatearFarmaceutico(actualizado);
  }

  async toggleEstadoFarmaceutico(
    id: number,
    dto?: ToggleEstadoFarmaceuticoDto,
  ) {
    const actual = await this.prisma.user.findFirst({
      where: { id, role: { name: 'FARMACEUTICO' } },
    });

    if (!actual) {
      throw new NotFoundException('El farmacéutico no existe');
    }

    const nuevoActivo =
      dto?.activo !== undefined
        ? dto.activo
        : dto?.estado !== undefined
          ? dto.estado === 'ACTIVO'
          : !actual.activo;

    const actualizado = await this.prisma.user.update({
      where: { id },
      data: { activo: nuevoActivo },
      select: SELECT_FARMACEUTICO,
    });

    if (!nuevoActivo) {
      await this.prisma.userSession.deleteMany({ where: { userId: id } });
    }

    return this.formatearFarmaceutico(actualizado);
  }

  private resolverNombreCompleto(
    dto: { nombreCompleto?: string; nombres?: string; apellidos?: string },
    fallback = '',
  ): string {
    if (dto.nombreCompleto?.trim()) {
      return dto.nombreCompleto.trim();
    }

    const combinado = [dto.nombres?.trim(), dto.apellidos?.trim()]
      .filter(Boolean)
      .join(' ');

    if (combinado) {
      return combinado;
    }

    if (fallback) {
      return fallback;
    }

    throw new BadRequestException(
      'Debes enviar nombreCompleto o nombres y apellidos',
    );
  }

  private formatearFarmaceutico(user: {
    id: number;
    nombreCompleto: string;
    numeroDocumento: string;
    correo: string;
    telefono: string | null;
    sedeId: number | null;
    activo: boolean;
    createdAt: Date;
    sede: { id: number; nombre: string; ciudad: string; zona: string } | null;
    role: { name: string };
  }) {
    const partes = user.nombreCompleto.trim().split(/\s+/);
    const nombres =
      partes.length > 2 ? partes.slice(0, 2).join(' ') : partes[0] ?? '';
    const apellidos =
      partes.length > 2 ? partes.slice(2).join(' ') : partes.slice(1).join(' ');

    return {
      id: user.id,
      nombreCompleto: user.nombreCompleto,
      nombres,
      apellidos,
      numeroDocumento: user.numeroDocumento,
      correo: user.correo,
      telefono: user.telefono ?? '',
      sedeId: user.sedeId,
      sede: user.sede,
      estado: user.activo ? ('ACTIVO' as const) : ('INACTIVO' as const),
      activo: user.activo,
      fechaCreacion: user.createdAt.toISOString(),
    };
  }
}