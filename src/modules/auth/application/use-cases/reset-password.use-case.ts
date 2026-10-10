import { Injectable, Inject, BadRequestException, NotFoundException } from "@nestjs/common";
import { USER_REPOSITORY, UserRepositoryPort } from "../../domain/ports/user-repository.port";
import { TOKEN_SERVICE, TokenServicePort } from "../../domain/ports/token.port";
import { PASSWORD_HASHER, PasswordHasherPort } from "../../domain/ports/password-hasher.port";

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenServicePort,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(token: string, nuevaPassword: string): Promise<{ message: string }> {
    // 1. Verificar si el token es válido
    const payload = this.tokenService.verify(token);
    if (!payload) {
      throw new BadRequestException("El token de recuperación es inválido o ha expirado.");
    }

    // 2. Buscar al usuario por el ID (sub) que viene dentro del token
    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new NotFoundException("Usuario no encontrado.");
    }

    // 3. Validar que la nueva contraseña no sea idéntica a la actual
    const isSamePassword = await this.passwordHasher.compare(nuevaPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException("La nueva contraseña no puede ser igual a la contraseña actual.");
    }

    // 4. Hashear la nueva contraseña
    const hashedPassword = await this.passwordHasher.hash(nuevaPassword);

    // 5. Actualizar la contraseña en la base de datos
    await this.userRepository.updatePassword(user.id, hashedPassword);

    return { message: "Contraseña actualizada exitosamente." };
  }
}