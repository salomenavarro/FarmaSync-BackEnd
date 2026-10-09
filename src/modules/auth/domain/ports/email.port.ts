export const EMAIL_SERVICE = Symbol("EMAIL_SERVICE");

export interface EmailServicePort {
  sendRecoverPasswordEmail(to: string, token: string): Promise<void>;
}