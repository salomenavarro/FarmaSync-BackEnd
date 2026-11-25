import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  ValidateIf,
} from 'class-validator';
import { PARENTESCOS, TIPOS_DOCUMENTO } from './dependiente.constants';

// DTO de entrada en la capa de presentación (HTTP): valida la forma del payload
// mediante ValidationPipe antes de que llegue al caso de uso de aplicación.
// Usa `correoElectronico` para mantener coherencia con el modelo `Dependiente`
// en Prisma y la migración `20261125053140_update_dependiente_contract`.
export class CreateDependienteDto {
  // nombres y apellidos van separados porque el front los captura así.
  @IsString()
  @IsNotEmpty({ message: 'Los nombres del dependiente son obligatorios' })
  nombres!: string;

  @IsString()
  @IsNotEmpty({ message: 'Los apellidos del dependiente son obligatorios' })
  apellidos!: string;

  @IsString()
  @IsIn(TIPOS_DOCUMENTO, {
    message: 'El tipo de documento debe ser RC, TI o CC',
  })
  tipoDocumento!: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de documento es obligatorio' })
  numeroDocumento!: string;

  // Antes era un @IsString libre y aceptaba cualquier texto.
  @IsString()
  @IsIn(PARENTESCOS, {
    message: 'El parentesco debe ser HIJO, PADRE_MADRE, ABUELO u OTRO',
  })
  parentesco!: string;

  @IsDateString({}, { message: 'La fecha de nacimiento debe tener formato YYYY-MM-DD' })
  fechaNacimiento!: string;

  // Obligatorio SOLO si el documento es CC (mayor de edad que se vincula
  // por correo). Para RC/TI se ignora: ValidateIf salta la validación y
  // el caso de uso no lo guarda.
  @ValidateIf((dto: CreateDependienteDto) => dto.tipoDocumento === 'CC')
  @IsEmail(
    {},
    {
      message:
        'El correo electrónico es obligatorio y debe ser válido para Cédula de Ciudadanía',
    },
  )
  correoElectronico?: string;
}