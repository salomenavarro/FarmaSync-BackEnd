import { IsInt, Min } from 'class-validator';

export class UpdateStockDto {
  @IsInt()
  @Min(1)
  sedeId!: number;

  @IsInt()
  @Min(0)
  cantidad!: number;
}
