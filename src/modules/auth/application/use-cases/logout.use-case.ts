import { Inject, Injectable } from "@nestjs/common";
import { SESSION_REPOSITORY, SessionRepositoryPort } from "../../domain/ports/session-repository.port";

// RF-017: invalidar el token de sesión. Borra la fila de
// user_sessions correspondiente; como JwtAuthGuard ahora también
// chequea que exista una sesión activa (no solo la firma del JWT),
// borrarla aquí hace que el token deje de servir de inmediato, sin
// esperar a que expire solo.
@Injectable()
export class LogoutUseCase {
  constructor(@Inject(SESSION_REPOSITORY) private readonly sessionRepository: SessionRepositoryPort) {}

  async execute(token: string): Promise<void> {
    await this.sessionRepository.deleteByToken(token);
  }
}
