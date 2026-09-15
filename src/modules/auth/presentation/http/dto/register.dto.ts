import { IsEmail, IsString, Matches, MinLength } from "class-validator";

// RF-001: contraseña mínimo 8 caracteres, una mayúscula y un número.
// Esto es validación de FORMATO (borde HTTP), no regla de negocio,
// por eso vive aquí y no en domain.
export class RegisterDto {
  @IsString()
  nombreCompleto!: string;

  @IsString()
  numeroDocumento!: string;

  @IsEmail()
  correo!: string;

  @IsString()
  telefono!: string;

  @MinLength(8, { message: "La contraseña debe tener mínimo 8 caracteres." })
  @Matches(/[A-Z]/, { message: "La contraseña debe tener al menos una mayúscula." })
  @Matches(/[0-9]/, { message: "La contraseña debe tener al menos un número." })
  password!: string;
}
