// Otro puerto: domain/application saben que necesitan "hashear" y
// "comparar" contraseñas, pero no saben si por debajo es bcrypt,
// argon2 o cualquier otra librería. Eso lo decide infrastructure.
export const PASSWORD_HASHER = Symbol("PASSWORD_HASHER");

export interface PasswordHasherPort {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}
