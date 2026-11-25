import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateReservationDto {
  @IsInt()
  @IsPositive()
  sedeId!: number;

  @IsInt()
  @IsPositive()
  medicamentoId!: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  dependienteId?: number;

  @IsString()
  @IsNotEmpty({ message: 'El número de fórmula u orden médica EPS es obligatorio' })
  @MinLength(4, { message: 'El número de orden médica debe tener al menos 4 caracteres' })
  numeroOrdenMedica!: string;

  @IsDateString({}, { message: 'fechaRecogida debe ser una fecha ISO válida (YYYY-MM-DD)' })
  fechaRecogida!: string;
}
