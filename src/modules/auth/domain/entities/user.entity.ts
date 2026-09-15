// Capa DOMAIN: esta clase no importa NestJS ni Prisma. Es la
// representación de negocio de un usuario, no la fila de la BD.
// Si mañana cambiamos Prisma por otro ORM, esta clase no se toca.
export class UserEntity {
  constructor(
    public readonly id: number,
    public readonly nombreCompleto: string,
    public readonly numeroDocumento: string,
    public readonly correo: string,
    public readonly telefono: string | null,
    public readonly passwordHash: string,
    public readonly roleId: number,
    public readonly activo: boolean,
    public readonly failedLoginAttempts: number,
    public readonly lockedUntil: Date | null,
  ) {}

  isInactive(): boolean {
    return !this.activo;
  }

  // Regla de negocio (RF-002): la cuenta queda bloqueada 15 min
  // después de 5 fallos. Esta pregunta la puede responder la
  // entidad sola, sin ayuda de la base de datos.
  isLocked(now: Date = new Date()): boolean {
    return this.lockedUntil !== null && this.lockedUntil > now;
  }
}
