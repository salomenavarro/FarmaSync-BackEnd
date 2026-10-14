import { Injectable, Inject, UnauthorizedException } from "@nestjs/common";
import { OAuth2Client } from "google-auth-library";
import { USER_REPOSITORY, UserRepositoryPort } from "../../domain/ports/user-repository.port";
import { TOKEN_SERVICE, TokenServicePort } from "../../domain/ports/token.port";

@Injectable()
export class GoogleLoginUseCase {
  private googleClient: OAuth2Client;

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenServicePort,
  ) {
    // Inicializa el cliente de Google con la variable de entorno
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async execute(credentialToken: string): Promise<{ message: string, token: string, user: any }> {
    try {
      // 1. Validar el token con Google
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credentialToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException("Payload de Google inválido.");
      }

     const { email, name, picture, sub: googleId } = payload;

      if (!email) {
        throw new UnauthorizedException("El token de Google no contiene un correo electrónico.");
      }

      // Ahora TypeScript sabe que "email" es un string seguro (no undefined)
      let user = await this.userRepository.findByCorreo(email);
  
     // 3. Crear el usuario si no existe en la base de datos
      if (!user) {
        user = await this.userRepository.create({
          correo: email,
          nombreCompleto: name || 'Usuario de Google',
          numeroDocumento: `GOO-${googleId}`, // Identificador único usando el ID de Google
          
          // Propiedades faltantes agregadas:
          telefono: '',
          passwordHash: '',
          roleId: 1,
        });
      }
      // 4. Generar el token firmado usando el payload estándar de tu sistema
      const sessionToken = this.tokenService.sign({ 
        sub: user.id, 
        roleId: user.roleId 
      });

      // 5. Retornar los datos al controlador
      return { 
        message: "Inicio de sesión exitoso.",
        token: sessionToken,
        user: {
          id: user.id,
          correo: user.correo,
          roleId: user.roleId,
          nombre: name,
          avatarUrl: picture
        }
      };

    } catch (error) {
      console.error("Error en autenticación con Google:", error);
      throw new UnauthorizedException("Token de Google inválido o expirado.");
    }
  }
}