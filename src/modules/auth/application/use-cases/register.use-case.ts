import { Inject, Injectable } from "@nestjs/common";
import { DuplicateCorreoError, DuplicateDocumentoError } from "../../domain/errors/auth.errors";
import { PASSWORD_HASHER, PasswordHasherPort } from "../../domain/ports/password-hasher.port";
import { USER_REPOSITORY, UserRepositoryPort } from "../../domain/ports/user-repository.port";

export interface RegisterCommand {
  nombreCompleto: string;
  numeroDocumento: string;
  correo: string;
  telefono: string;
  password: string;
}

// RF-001: el registro público siempre crea pacientes.
const PACIENTE_ROLE_ID = 1;

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(command: RegisterCommand) {
    const existingByDocumento = await this.userRepository.findByDocumento(command.numeroDocumento);
    if (existingByDocumento) {
      throw new DuplicateDocumentoError();
    }

    const existingByCorreo = await this.userRepository.findByCorreo(command.correo);
    if (existingByCorreo) {
      throw new DuplicateCorreoError();
    }

    const passwordHash = await this.passwordHasher.hash(command.password);

    return this.userRepository.create({
      nombreCompleto: command.nombreCompleto,
      numeroDocumento: command.numeroDocumento,
      correo: command.correo,
      telefono: command.telefono,
      passwordHash,
      roleId: PACIENTE_ROLE_ID,
    });
  }
}
