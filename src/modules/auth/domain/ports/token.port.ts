// Puerto para emitir el token de sesión. El caso de uso de login
// solo sabe que puede pedir un token firmado; no sabe si es JWT,
// ni con qué librería se firma.
export const TOKEN_SERVICE = Symbol("TOKEN_SERVICE");

export interface TokenPayload {
  sub: number; // id del usuario (convención estándar de JWT)
  roleId: number;
}

export interface TokenServicePort {
  sign(payload: TokenPayload): string;
  // Devuelve el payload si el token es válido (firma correcta y no
  // expirado), o null si no. Nunca lanza: el guard decide qué hacer.
  verify(token: string): TokenPayload | null;
}
