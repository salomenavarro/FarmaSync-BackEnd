import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateFarmaceuticoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombreCompleto?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombres?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  apellidos?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  numeroDocumento?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  correo?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsInt({ message: 'El ID de la sede debe ser un número entero' })
  sedeId?: number;

  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser booleano' })
  activo?: boolean;

  @IsOptional()
  @IsIn(['ACTIVO', 'INACTIVO'], {
    message: 'El estado debe ser ACTIVO o INACTIVO',
  })
  estado?: 'ACTIVO' | 'INACTIVO';
}

export class ToggleEstadoFarmaceuticoDto {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsIn(['ACTIVO', 'INACTIVO'])
  estado?: 'ACTIVO' | 'INACTIVO';
}