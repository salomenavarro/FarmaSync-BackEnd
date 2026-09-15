import { UserEntity } from "../entities/user.entity";

// Un "puerto" es solo una interfaz: el contrato de lo que domain/application
// necesitan de la persistencia, sin decir CÓMO se cumple (eso lo decide infrastructure).
export interface CreateUserData {
  nombreCompleto: string;
  numeroDocumento: string;
  correo: string;
  telefono: string;
  passwordHash: string;
  roleId: number;
}

// NestJS no puede inyectar una interfaz de TypeScript en tiempo de
// ejecución (se borra al compilar), por eso se usa un Symbol como
// "token" de inyección. Se usa tanto en auth.module.ts como en el
// use case que lo pide con @Inject(USER_REPOSITORY).
export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

export interface UserRepositoryPort {
  findById(id: number): Promise<UserEntity | null>;
  findByDocumento(numeroDocumento: string): Promise<UserEntity | null>;
  findByCorreo(correo: string): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  registerFailedAttempt(userId: number, lockedUntil: Date | null, attempts: number): Promise<void>;
  resetFailedAttempts(userId: number): Promise<void>;
}
