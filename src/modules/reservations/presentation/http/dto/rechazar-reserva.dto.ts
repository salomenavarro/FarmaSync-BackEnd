import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RechazarReservaDto {
  @IsString()
  @IsNotEmpty({ message: 'El motivo de rechazo es obligatorio' })
  @MinLength(5, { message: 'Describe brevemente el motivo de rechazo' })
  motivo!: string;
}