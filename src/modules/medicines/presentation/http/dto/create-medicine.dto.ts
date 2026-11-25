import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateMedicineDto {
  @IsString()
  @IsNotEmpty()
  codigo!: string;

  @IsString()
  @IsNotEmpty()
  nombreGenerico!: string;

  @IsString()
  @IsNotEmpty()
  presentacion!: string;

  @IsString()
  @IsOptional()
  concentracion?: string;

  @IsBoolean()
  @IsOptional()
  requiereOrden?: boolean;

  @IsInt()
  @Min(0)
  cantidad!: number;

  @IsInt()
  @Min(1)
  sedeId!: number;
}
