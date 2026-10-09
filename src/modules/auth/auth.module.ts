import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { GetCurrentUserUseCase } from "./application/use-cases/get-current-user.use-case";
import { LoginUseCase } from "./application/use-cases/login.use-case";
import { LogoutUseCase } from "./application/use-cases/logout.use-case";
import { RegisterUseCase } from "./application/use-cases/register.use-case";
import { PASSWORD_HASHER } from "./domain/ports/password-hasher.port";
import { SESSION_REPOSITORY } from "./domain/ports/session-repository.port";
import { TOKEN_SERVICE } from "./domain/ports/token.port";
import { USER_REPOSITORY } from "./domain/ports/user-repository.port";
import { PrismaSessionRepository } from "./infrastructure/persistence/prisma-session.repository";
import { PrismaUserRepository } from "./infrastructure/persistence/prisma-user.repository";
import { BcryptPasswordHasher } from "./infrastructure/security/bcrypt-password-hasher";
import { JwtTokenService } from "./infrastructure/security/jwt-token.service";
import { AuthController } from "./presentation/http/auth.controller";
import { RecaptchaGuard } from "./presentation/http/guards/recaptcha.guard";

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        // RF-004: debe coincidir con COOKIE_MAX_AGE_MS (controller)
        // y SESSION_MINUTES (LoginUseCase).
        signOptions: { expiresIn: "15m" },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    RegisterUseCase,
    LoginUseCase,
    GetCurrentUserUseCase,
    LogoutUseCase,
    RecaptchaGuard,
    // Aquí es donde el Symbol (el "enchufe") se conecta con la
    // implementación real (el "aparato"). Si mañana cambian bcrypt
    // por argon2, solo se cambia esta línea.
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
  ],
})
export class AuthModule {}