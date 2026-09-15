import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { SESSION_REPOSITORY, SessionRepositoryPort } from "../../../domain/ports/session-repository.port";
import { TOKEN_SERVICE, TokenServicePort } from "../../../domain/ports/token.port";
import { RequestWithUser } from "../types/request-with-user";

const COOKIE_NAME = "access_token";

// Se usa con @UseGuards(JwtAuthGuard) en cualquier endpoint que
// requiera sesión (RF-015: restringir vistas por rol empieza por
// aquí — primero "¿hay alguien logueado?", el rol se valida aparte).
//
// Dos chequeos, no uno: (1) el JWT firma correcto y no expiró por su
// cuenta, (2) sigue existiendo una fila en user_sessions para él. El
// segundo es el que hace que RF-017 (logout invalida el token) sea
// real — sin él, cerrar sesión solo borraría la cookie del navegador
// pero el JWT seguiría siendo válido hasta expirar solo.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenServicePort,
    @Inject(SESSION_REPOSITORY) private readonly sessionRepository: SessionRepositoryPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token: string | undefined = request.cookies?.[COOKIE_NAME];

    if (!token) {
      throw new UnauthorizedException("No hay sesión activa.");
    }

    const payload = this.tokenService.verify(token);
    if (!payload) {
      throw new UnauthorizedException("Sesión inválida o expirada.");
    }

    const hasActiveSession = await this.sessionRepository.existsActive(token);
    if (!hasActiveSession) {
      throw new UnauthorizedException("Sesión inválida o expirada.");
    }

    request.userId = payload.sub;
    request.userRoleId = payload.roleId;
    return true;
  }
}
