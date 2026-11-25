import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PARENTESCOS, TIPOS_DOCUMENTO } from './dependiente.constants';

// PATCH: todos los campos son opcionales. La regla "CC exige correo"
// NO se valida aquí porque depende del dato ya guardado (se puede editar
// solo el nombre de alguien que ya es CC); se valida en el caso de uso,
// después de combinar lo guardado con lo que llega.
export class UpdateDependienteDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Los nombres no pueden estar vacíos' })
  nombres?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Los apellidos no pueden estar vacíos' })
  apellidos?: string;

  @IsOptional()
  @IsString()
  @IsIn(TIPOS_DOCUMENTO, {
    message: 'El tipo de documento debe ser RC, TI o CC',
  })
  tipoDocumento?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El número de documento no puede estar vacío' })
  numeroDocumento?: string;

  @IsOptional()
  @IsString()
  @IsIn(PARENTESCOS, {
    message: 'El parentesco debe ser HIJO, PADRE_MADRE, ABUELO u OTRO',
  })
  parentesco?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de nacimiento debe tener formato YYYY-MM-DD' })
  fechaNacimiento?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  correoElectronico?: string;
}