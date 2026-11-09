import {
  Injectable,
  Inject,
  UnauthorizedException,
} from "@nestjs/common";
import { OAuth2Client } from "google-auth-library";
import * as bcrypt from "bcrypt";

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
    necesitaCompletarPerfil: boolean;
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
        throw new UnauthorizedException("El token de Google no contiene un correo electrónico.");
      }

      if (!emailVerified) {
        throw new UnauthorizedException("El correo electrónico de Google no está verificado.");
      }

      // 2. Buscar al usuario por su correo electrónico.
      let user = await this.userRepository.findByCorreo(email);
      let necesitaCompletarPerfil = false;

      // 3. Crear el usuario si no existe.
      if (!user) {
        necesitaCompletarPerfil = true;
        const dummyPasswordHash = await bcrypt.hash(`GOOGLE_${googleId}_${Date.now()}`, 10);
        
        // Asignamos un documento temporal seguro que cumple con VARCHAR(20)
        // Podremos saber que es temporal si empieza con "TEMP-"
        const documentoTemporal = `TEMP-${googleId.slice(-10)}`;

        user = await this.userRepository.create({
          correo: email,
          nombreCompleto: name || "Usuario de Google",
          numeroDocumento: documentoTemporal,
          telefono: "",
          passwordHash: dummyPasswordHash,
          roleId: 1, // Rol paciente por defecto
        });
      } else {
        // Si el usuario ya existe pero su documento sigue siendo temporal, le pedimos completarlo
        if (user.numeroDocumento.startsWith("TEMP-")) {
          necesitaCompletarPerfil = true;
        }
      }

      // 4. Generar el JWT de sesión de FarmaSync.
      const sessionToken = this.tokenService.sign({
        sub: user.id,
        roleId: user.roleId,
      });

      // 5. Devolver la respuesta incluyendo la bandera para el frontend
      return {
        message: "Inicio de sesión exitoso.",
        token: sessionToken,
        necesitaCompletarPerfil,
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

      console.error("Error en autenticación con Google:", error);
      throw new UnauthorizedException("Token de Google inválido o expirado.");
    }
  }
}