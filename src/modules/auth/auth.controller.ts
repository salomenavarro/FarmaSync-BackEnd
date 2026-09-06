import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('numeroDocumento') numeroDocumento: string) {
    return this.authService.requestPasswordReset(numeroDocumento);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body('token') token: string,
    @Body('nuevaPassword') nuevaPassword: string,
  ) {
    return this.authService.resetPassword(token, nuevaPassword);
  }
}