import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export const PARENTESCOS_VALIDOS = [
  'Hijo / Hija',
  'Padre / Madre',
  'Abuelo / Abuela',
  'Otro',
] as const;

export class CreateDependienteDto {
  @IsString()
  @IsNotEmpty({ message: 'Los nombres del dependiente son obligatorios' })
  nombres!: string;

  @IsString()
  @IsNotEmpty({ message: 'Los apellidos del dependiente son obligatorios' })
  apellidos!: string;

  @IsString()
  @IsIn(['RC', 'TI', 'CC'], {
    message: 'El tipo de documento debe ser RC, TI o CC',
  })
  tipoDocumento!: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de documento es obligatorio' })
  numeroDocumento!: string;

  @IsString()
  @IsIn(PARENTESCOS_VALIDOS, {
    message:
      'El parentesco debe ser Hijo / Hija, Padre / Madre, Abuelo / Abuela u Otro',
  })
  parentesco!: string;

  @IsDateString(
    {},
    { message: 'La fecha de nacimiento debe tener formato YYYY-MM-DD' },
  )
  fechaNacimiento!: string;

  @IsOptional()
  @ValidateIf((o) => o.correoElectronico !== '' && o.correoElectronico !== null)
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  correoElectronico?: string | null;
}