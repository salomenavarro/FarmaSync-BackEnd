// Errores de DOMAIN: clases planas de Error, sin ninguna noción de
// "código HTTP". application los lanza; presentation decide a qué
// status code se traduce cada uno (eso vive en el exception filter).
export class DuplicateDocumentoError extends Error {
  constructor(message = "Ya existe un usuario con ese número de documento.") {
    super(message);
    this.name = "DuplicateDocumentoError";
  }
}

export class DuplicateCorreoError extends Error {
  constructor(message = "Ya existe un usuario con ese correo.") {
    super(message);
    this.name = "DuplicateCorreoError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor(message = "Documento o contraseña incorrectos.") {
    super(message);
    this.name = "InvalidCredentialsError";
  }
}

export class AccountLockedError extends Error {
  constructor(message = "Cuenta bloqueada temporalmente. Intenta de nuevo más tarde.") {
    super(message);
    this.name = "AccountLockedError";
  }
}

export class AccountInactiveError extends Error {
  constructor(message = "El usuario está inactivo.") {
    super(message);
    this.name = "AccountInactiveError";
  }
}
