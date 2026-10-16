
import {
  Injectable,
  Inject,
  UnauthorizedException,
} from "@nestjs/common";
import { OAuth2Client } from "google-auth-library";

import {
  USER_REPOSITORY,
  UserRepositoryPort,
} from "../../domain/ports/user-repository.port";

import {
  TOKEN_SERVICE,
  TokenServicePort,
} from "../../domain/ports/token.port";

@Injectable()
export class GoogleLoginUseCase {
  private readonly googleClient: OAuth2Client;

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,

    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenServicePort,
  ) {
    this.googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
    );
  }

  async execute(credentialToken: string): Promise<{
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
    try {
      // 1. Validar la credencial de identidad de Google.
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credentialToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException(
          "Payload de Google inválido.",
        );
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

      // 2. Buscar al usuario por su correo electrónico.
      let user = await this.userRepository.findByCorreo(email);

      // 3. Crear el usuario si no existe.
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

      // 4. Generar el JWT de sesión de FarmaSync.
      const sessionToken = this.tokenService.sign({
        sub: user.id,
        roleId: user.roleId,
      });

      // 5. Devolver los datos al controlador.
      // El controlador debe guardar sessionToken en la cookie
      // httpOnly llamada access_token.
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

      console.error(
        "Error en autenticación con Google:",
        error,
      );

      throw new UnauthorizedException(
        "Token de Google inválido o expirado.",
      );
    }
  }
}
