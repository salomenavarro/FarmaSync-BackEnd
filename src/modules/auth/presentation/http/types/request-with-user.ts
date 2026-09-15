import type { Request } from "express";

// El guard rellena estos dos campos una vez valida la cookie.
// Los controllers protegidos reciben este tipo en vez de Request a
// secas, para no tener que castear con `any` en cada uno.
export interface RequestWithUser extends Request {
  userId: number;
  userRoleId: number;
}
