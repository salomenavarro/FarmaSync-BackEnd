import { IsIn, IsOptional, IsString } from 'class-validator';

export class AlistarReservaDto {
  @IsOptional()
  @IsString()
  @IsIn(['POS', 'MANUAL'])
  metodo?: 'POS' | 'MANUAL';
}