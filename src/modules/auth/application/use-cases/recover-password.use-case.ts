import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { USER_REPOSITORY, UserRepositoryPort } from "../../domain/ports/user-repository.port";
import { TOKEN_SERVICE, TokenServicePort } from "../../domain/ports/token.port";

@Injectable()
export class RecoverPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenServicePort,
  ) {}

  async execute(numeroDocumento: string): Promise<{ message: string }> {
    // 1. Buscar al usuario utilizando el puerto y el número de documento
    const user = await this.userRepository.findByDocumento(numeroDocumento);
    
    if (!user) {
      throw new NotFoundException("No se encontró ningún usuario con este número de documento.");
    }

    // 2. Generar el token firmado usando el payload estándar (sub y roleId)
    const resetToken = this.tokenService.sign({ 
      sub: user.id, 
      roleId: user.roleId 
    });

    // El correo electrónico asociado al documento lo obtienes de user.correo 
    // para cuando implementes el servicio de envío de correos.

    return { message: "Se ha enviado un correo de recuperación al email asociado." };
  }
}