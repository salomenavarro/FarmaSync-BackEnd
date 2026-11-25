import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { PARENTESCOS_VALIDOS } from './create-dependiente.dto';

export class UpdateDependienteDto {
  @IsOptional()
  @IsString()
  nombres?: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

  @IsOptional()
  @IsString()
  @IsIn(['RC', 'TI', 'CC'], {
    message: 'El tipo de documento debe ser RC, TI o CC',
  })
  tipoDocumento?: string;

  @IsOptional()
  @IsString()
  numeroDocumento?: string;

  @IsOptional()
  @IsString()
  @IsIn(PARENTESCOS_VALIDOS, {
    message:
      'El parentesco debe ser Hijo / Hija, Padre / Madre, Abuelo / Abuela u Otro',
  })
  parentesco?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de nacimiento debe tener formato YYYY-MM-DD' },
  )
  fechaNacimiento?: string;

  @IsOptional()
  @ValidateIf((o) => o.correoElectronico !== '' && o.correoElectronico !== null)
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  correoElectronico?: string | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}