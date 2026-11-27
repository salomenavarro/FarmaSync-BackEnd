import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class IngresarLoteEanDto {
  @IsString()
  @IsNotEmpty({ message: 'El código o EAN-13 es obligatorio' })
  codigo!: string;

  @IsInt()
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  cantidad!: number;

  @IsOptional()
  @IsInt()
  sedeId?: number;
}