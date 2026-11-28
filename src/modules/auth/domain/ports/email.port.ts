export const EMAIL_SERVICE = Symbol("EMAIL_SERVICE");

export interface NotificationEmailPayload {
  to: string;
  nombreCompleto: string;
  titulo: string;
  mensaje: string;
  codigoReserva?: string;
}

export interface EmailServicePort {
  sendRecoverPasswordEmail(to: string, token: string): Promise<void>;
  sendNotificationEmail(payload: NotificationEmailPayload): Promise<void>;
}