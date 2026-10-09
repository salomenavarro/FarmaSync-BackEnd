import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from "class-validator";

// RF-001: contraseña mínimo 8 caracteres, una mayúscula y un número.
// @MaxLength en cada campo coincide con el tamaño de columna real en
// el script SQL (users.nombre_completo VARCHAR(150), etc.) — así, si
// alguien manda un texto larguísimo, lo rechaza con un 400 claro acá
// en vez de que Postgres tire un error crudo de "value too long".
export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: "El nombre completo es obligatorio." })
  @MaxLength(150)
  nombreCompleto!: string;

  @IsString()
  @IsNotEmpty({ message: "El número de documento es obligatorio." })
  @MaxLength(20)
  numeroDocumento!: string;

  @IsEmail({}, { message: "Ingresa un correo válido." })
  @MaxLength(150)
  correo!: string;

  @IsString()
  @IsNotEmpty({ message: "El teléfono es obligatorio." })
  @MaxLength(20)
  telefono!: string;

  @MinLength(8, { message: "La contraseña debe tener mínimo 8 caracteres." })
  @Matches(/[A-Z]/, { message: "La contraseña debe tener al menos una mayúscula." })
  @Matches(/[0-9]/, { message: "La contraseña debe tener al menos un número." })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: "Por favor confirma que no eres un robot." })
  recaptchaToken!: string;
}  