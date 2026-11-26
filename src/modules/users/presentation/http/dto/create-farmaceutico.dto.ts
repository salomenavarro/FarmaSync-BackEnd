import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateFarmaceuticoDto {
  @ValidateIf((dto: CreateFarmaceuticoDto) => !dto.nombres)
  @IsString()
  @IsNotEmpty({ message: 'El nombre completo o los nombres son obligatorios' })
  nombreCompleto?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Los nombres son obligatorios' })
  nombres?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Los apellidos son obligatorios' })
  apellidos?: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de documento es obligatorio' })
  numeroDocumento!: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  correo!: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password?: string;

  @IsInt({ message: 'El ID de la sede debe ser un número entero' })
  sedeId!: number;

  @IsOptional()
  @IsIn(['ACTIVO', 'INACTIVO'], {
    message: 'El estado debe ser ACTIVO o INACTIVO',
  })
  estado?: 'ACTIVO' | 'INACTIVO';
}