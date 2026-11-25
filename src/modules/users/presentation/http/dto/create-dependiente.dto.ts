import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateDependienteDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre completo del dependiente es obligatorio' })
  nombreCompleto!: string;

  @IsString()
  @IsIn(['RC', 'TI', 'CC'], {
    message: 'El tipo de documento debe ser RC, TI o CC',
  })
  tipoDocumento!: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de documento es obligatorio' })
  numeroDocumento!: string;

  @IsString()
  @IsNotEmpty({ message: 'El parentesco es obligatorio' })
  parentesco!: string;

  @IsDateString({}, { message: 'La fecha de nacimiento debe tener formato YYYY-MM-DD' })
  fechaNacimiento!: string;
}