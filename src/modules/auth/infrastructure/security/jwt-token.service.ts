import { Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { TokenPayload, TokenServicePort } from "../../domain/ports/token.port";

@Injectable()
export class JwtTokenService implements TokenServicePort {
  private readonly logger = new Logger(JwtTokenService.name);

  constructor(private readonly jwtService: JwtService) {}

  sign(payload: TokenPayload): string {
    return this.jwtService.sign(payload as unknown as Record<string, unknown>);
  }

  verify(token: string): TokenPayload | null {
    try {
      return this.jwtService.verify<TokenPayload>(token);
    } catch (error) {
      // Firma inválida, token expirado o manipulado: todos estos
      // casos son "no autenticado", no un error del servidor.
      this.logger.debug(`Token inválido: ${(error as Error).message}`);
      return null;
    }
  }
}
