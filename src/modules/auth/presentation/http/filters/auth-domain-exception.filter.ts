import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import type { Response } from "express";
import {
  AccountInactiveError,
  AccountLockedError,
  DuplicateCorreoError,
  DuplicateDocumentoError,
  InvalidCredentialsError,
} from "../../../domain/errors/auth.errors";

// Única pieza del módulo auth que decide "este error de negocio =
// este código HTTP". application nunca necesita saber qué es un 409.
// Se registra con @UseFilters(...) en el controller.
@Catch(DuplicateDocumentoError, DuplicateCorreoError, InvalidCredentialsError, AccountLockedError, AccountInactiveError)
export class AuthDomainExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost): void {
    const httpException = this.toHttpException(exception);

    const response = host.switchToHttp().getResponse<Response>();
    response.status(httpException.getStatus()).json(httpException.getResponse());
  }

  private toHttpException(exception: Error) {
    if (exception instanceof DuplicateDocumentoError || exception instanceof DuplicateCorreoError) {
      return new ConflictException(exception.message);
    }

    if (exception instanceof AccountInactiveError) {
      return new ForbiddenException(exception.message);
    }

    return new UnauthorizedException(exception.message);
  }
}
