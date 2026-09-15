// Puerto separado de UserRepositoryPort porque conceptualmente es una
// entidad de negocio distinta (una sesión no es un usuario).
export interface CreateSessionData {
  userId: number;
  token: string; // el JWT en texto plano; el adaptador decide si lo hashea antes de guardar
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date;
}

export const SESSION_REPOSITORY = Symbol("SESSION_REPOSITORY");

export interface SessionRepositoryPort {
  create(data: CreateSessionData): Promise<void>;
  // Recibe el token en texto plano (viene de la cookie); el
  // adaptador es quien sabe que debe hashearlo antes de comparar.
  deleteByToken(token: string): Promise<void>;
  // Usado por el guard: además de que el JWT firme correcto, debe
  // seguir existiendo una sesión activa (no expirada) para él. Así
  // logout invalida de verdad, no solo borra la cookie del navegador.
  existsActive(token: string): Promise<boolean>;
}
