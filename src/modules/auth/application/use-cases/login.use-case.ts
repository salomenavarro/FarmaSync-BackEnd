import { Inject, Injectable } from "@nestjs/common";
import { AccountInactiveError, AccountLockedError, InvalidCredentialsError } from "../../domain/errors/auth.errors";
import { PASSWORD_HASHER, PasswordHasherPort } from "../../domain/ports/password-hasher.port";
import { SESSION_REPOSITORY, SessionRepositoryPort } from "../../domain/ports/session-repository.port";
import { TOKEN_SERVICE, TokenServicePort } from "../../domain/ports/token.port";
import { USER_REPOSITORY, UserRepositoryPort } from "../../domain/ports/user-repository.port";

export interface LoginCommand {
  numeroDocumento: string;
  password: string;
  ipAddress: string | null;
  userAgent: string | null;
}

// RF-002: bloquear 15 min después de 5 fallos consecutivos.
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
// RF-004: cerrar sesión automáticamente tras 15 min de inactividad.
// (Aproximación con expiración fija; la inactividad "real" se
// refinará cuando se agregue el guard que actualiza la sesión en
// cada request.)
const SESSION_MINUTES = 15;

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasherPort,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenServicePort,
    @Inject(SESSION_REPOSITORY) private readonly sessionRepository: SessionRepositoryPort,
  ) {}

  async execute(command: LoginCommand) {
    const user = await this.userRepository.findByDocumento(command.numeroDocumento);

    // Mismo error tanto si el documento no existe como si la
    // contraseña es incorrecta: evita que alguien "adivine" qué
    // documentos están registrados probando uno por uno.
    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (user.isInactive()) {
      throw new AccountInactiveError();
    }

    if (user.isLocked()) {
      throw new AccountLockedError();
    }

    const isValidPassword = await this.passwordHasher.compare(command.password, user.passwordHash);

    if (!isValidPassword) {
      const attempts = user.failedLoginAttempts + 1;
      const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null;
      await this.userRepository.registerFailedAttempt(user.id, lockedUntil, attempts);
      throw new InvalidCredentialsError();
    }

    await this.userRepository.resetFailedAttempts(user.id);

    const token = this.tokenService.sign({ sub: user.id, roleId: user.roleId });
    const expiresAt = new Date(Date.now() + SESSION_MINUTES * 60_000);

    await this.sessionRepository.create({
      userId: user.id,
      token,
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
      expiresAt,
    });

    return { user, token };
  }
}
