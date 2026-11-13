import {
  Injectable,
  Inject,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";

import {
  USER_REPOSITORY,
  UserRepositoryPort,
} from "../../domain/ports/user-repository.port";

import {
  TOKEN_SERVICE,
  TokenServicePort,
} from "../../domain/ports/token.port";

import {
  SESSION_REPOSITORY,
  SessionRepositoryPort,
} from "../../domain/ports/session-repository.port";

const SESSION_MINUTES = 15;

@Injectable()
export class GoogleLoginUseCase {
  private readonly googleClient: OAuth2Client;

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,

    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenServicePort,

    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepositoryPort,

    private readonly configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>("GOOGLE_CLIENT_ID");
    this.googleClient = new OAuth2Client(clientId);
  }

  async execute(
    credentialToken: string,
    ipAddress: string | null = null,
    userAgent: string | null = null,
  ): Promise<{
    message: string;
    token: string;
    user: {
      id: number | string;
      correo: string;
      nombreCompleto: string;
      numeroDocumento: string;
      roleId: number;
      avatarUrl?: string;
    };
  }> {
    const clientId = this.configService.get<string>("GOOGLE_CLIENT_ID");

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credentialToken,
        audience: clientId,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException("Payload de Google inválido.");
      }

      const {
        email,
        name,
        picture,
        sub: googleId,
        email_verified: emailVerified,
      } = payload;

      if (!email) {
        throw new UnauthorizedException(
          "El token de Google no contiene un correo electrónico.",
        );
      }

      if (!emailVerified) {
        throw new UnauthorizedException(
          "El correo electrónico de Google no está verificado.",
        );
      }

      let user = await this.userRepository.findByCorreo(email);

      if (!user) {
        user = await this.userRepository.create({
          correo: email,
          nombreCompleto: name || "Usuario de Google",
          numeroDocumento: `GOO-${googleId}`,
          telefono: "",
          passwordHash: "",
          roleId: 1,
        });
      }

      const sessionToken = this.tokenService.sign({
        sub: user.id,
        roleId: user.roleId,
      });

      const expiresAt = new Date(Date.now() + SESSION_MINUTES * 60_000);

      await this.sessionRepository.create({
        userId: user.id,
        token: sessionToken,
        ipAddress,
        userAgent,
        expiresAt,
      });

      return {
        message: "Inicio de sesión exitoso.",
        token: sessionToken,
        user: {
          id: user.id,
          correo: user.correo,
          nombreCompleto: user.nombreCompleto,
          numeroDocumento: user.numeroDocumento,
          roleId: user.roleId,
          avatarUrl: picture,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      console.error("Detalle del error en GoogleLoginUseCase:", error);

      throw new UnauthorizedException(
        "No se pudo completar la autenticación con Google.",
      );
    }
  }
}