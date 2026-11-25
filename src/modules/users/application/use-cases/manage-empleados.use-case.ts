import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/shared/database/prisma.service';
import { CreateFarmaceuticoDto } from '../../presentation/http/dto/create-farmaceutico.dto';

@Injectable()
export class ManageEmpleadosUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async createFarmaceutico(dto: CreateFarmaceuticoDto) {
    const sede = await this.prisma.sede.findUnique({
      where: { id: dto.sedeId },
    });

    if (!sede || !sede.activa) {
      throw new NotFoundException('La sede asignada no existe o está inactiva');
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { numeroDocumento: dto.numeroDocumento },
          { correo: dto.correo },
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        'Ya existe un usuario registrado con ese número de documento o correo',
      );
    }

    const roleFarmaceutico = await this.prisma.role.findUnique({
      where: { name: 'FARMACEUTICO' },
    });

    if (!roleFarmaceutico) {
      throw new BadRequestException('El rol FARMACEUTICO no está configurado en la BD');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        nombreCompleto: dto.nombreCompleto,
        numeroDocumento: dto.numeroDocumento,
        correo: dto.correo,
        telefono: dto.telefono,
        passwordHash,
        roleId: roleFarmaceutico.id,
        sedeId: dto.sedeId,
      },
      select: {
        id: true,
        nombreCompleto: true,
        numeroDocumento: true,
        correo: true,
        telefono: true,
        sede: { select: { id: true, nombre: true, ciudad: true } },
        role: { select: { name: true } },
        createdAt: true,
      },
    });
  }

  async listFarmaceuticos() {
    return this.prisma.user.findMany({
      where: { role: { name: 'FARMACEUTICO' } },
      select: {
        id: true,
        nombreCompleto: true,
        numeroDocumento: true,
        correo: true,
        telefono: true,
        activo: true,
        sede: { select: { id: true, nombre: true, ciudad: true, zona: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}