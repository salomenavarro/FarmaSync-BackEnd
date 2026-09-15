import { IsString } from "class-validator";

export class LoginDto {
  @IsString()
  numeroDocumento!: string;

  @IsString()
  password!: string;
}
