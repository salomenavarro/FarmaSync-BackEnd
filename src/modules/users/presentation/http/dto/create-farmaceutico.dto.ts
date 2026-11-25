import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateFarmaceuticoDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es obligatorio' })
  nombreCompleto!: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de documento es obligatorio' })
  numeroDocumento!: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  correo!: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;

  @IsInt({ message: 'El ID de la sede debe ser un número entero' })
  sedeId!: number;
}