import { Injectable } from "@nestjs/common";
import { User as UserRow } from "@prisma/client";
import { PrismaService } from "../../../../shared/database/prisma.service";
import { UserEntity } from "../../domain/entities/user.entity";
import { CreateUserData, UserRepositoryPort } from "../../domain/ports/user-repository.port";

// Este es el ÚNICO archivo del módulo auth que sabe que existe Prisma.
// Implementa el contrato (UserRepositoryPort) que domain/application definieron.
@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  // Traduce la fila cruda de Prisma a la entidad de dominio.
  private toEntity(row: UserRow): UserEntity {
    return new UserEntity(
      row.id,
      row.nombreCompleto,
      row.numeroDocumento,
      row.correo,
      row.telefono,
      row.passwordHash,
      row.roleId,
      row.activo,
      row.failedLoginAttempts,
      row.lockedUntil,
    );
  }

  async findById(id: number): Promise<UserEntity | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findByDocumento(numeroDocumento: string): Promise<UserEntity | null> {
    const row = await this.prisma.user.findUnique({ where: { numeroDocumento } });
    return row ? this.toEntity(row) : null;
  }

  async findByCorreo(correo: string): Promise<UserEntity | null> {
    const row = await this.prisma.user.findUnique({ where: { correo } });
    return row ? this.toEntity(row) : null;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const row = await this.prisma.user.create({ data });
    return this.toEntity(row);
  }

  async registerFailedAttempt(userId: number, lockedUntil: Date | null, attempts: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: attempts, lockedUntil },
    });
  }

  async resetFailedAttempts(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  // NUEVO MÉTODO AGREGADO: Permite actualizar la contraseña del usuario (hash) tras la recuperación
  async updatePassword(userId: number, newPasswordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });
  }
}