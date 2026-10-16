
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";

import { GoogleLoginDto } from "./dto/google-login.dto";
import { GoogleLoginUseCase } from "../../application/use-cases/google-login.use-case";
import { GetCurrentUserUseCase } from "../../application/use-cases/get-current-user.use-case";
import { LoginUseCase } from "../../application/use-cases/login.use-case";
import { LogoutUseCase } from "../../application/use-cases/logout.use-case";
import { RegisterUseCase } from "../../application/use-cases/register.use-case";
import { RecoverPasswordUseCase } from "../../application/use-cases/recover-password.use-case";
import { ResetPasswordUseCase } from "../../application/use-cases/reset-password.use-case";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { AuthDomainExceptionFilter } from "./filters/auth-domain-exception.filter";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RecaptchaGuard } from "./guards/recaptcha.guard";
import { RequestWithUser } from "./types/request-with-user";

const COOKIE_NAME = "access_token";

// La cookie dura 15 minutos, igual que la sesión del login tradicional.
const COOKIE_MAX_AGE_MS = 15 * 60 * 1000;

@Controller("auth")
@UseFilters(AuthDomainExceptionFilter)
export class AuthController {
  constructor(
    private readonly googleLoginUseCase: GoogleLoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly recoverPasswordUseCase: RecoverPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  // Inicio de sesión con Google
  @Post("google")
  @HttpCode(200)
  async googleLogin(
    @Body() googleLoginDto: GoogleLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.googleLoginUseCase.execute(
      googleLoginDto.credentialToken,
    );

    // Se utiliza la misma cookie que en el login tradicional.
    res.cookie(COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE_MS,
      path: "/",
    });

    return {
      message: result.message,
      usuario: {
        id: result.user.id,
        nombreCompleto: result.user.nombreCompleto,
        numeroDocumento: result.user.numeroDocumento,
        correo: result.user.correo,
        roleId: result.user.roleId,
      },
    };
  }

  // Registro de usuarios
  @Post("register")
  @UseGuards(RecaptchaGuard)
  async register(@Body() dto: RegisterDto) {
    const user = await this.registerUseCase.execute(dto);

    return {
      id: user.id,
      nombreCompleto: user.nombreCompleto,
      numeroDocumento: user.numeroDocumento,
      correo: user.correo,
      roleId: user.roleId,
    };
  }

  // Inicio de sesión tradicional
  @Post("login")
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.loginUseCase.execute({
      numeroDocumento: dto.numeroDocumento,
      password: dto.password,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE_MS,
      path: "/",
    });

    return {
      usuario: {
        id: user.id,
        nombreCompleto: user.nombreCompleto,
        numeroDocumento: user.numeroDocumento,
        correo: user.correo,
        roleId: user.roleId,
      },
    };
  }

  // Consultar el usuario de la sesión actual
  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: RequestWithUser) {
    const user = await this.getCurrentUserUseCase.execute(req.userId);

    return {
      usuario: {
        id: user.id,
        nombreCompleto: user.nombreCompleto,
        numeroDocumento: user.numeroDocumento,
        correo: user.correo,
        roleId: user.roleId,
      },
    };
  }

  // Cerrar sesión
  @Post("logout")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[COOKIE_NAME];

    if (token) {
      await this.logoutUseCase.execute(token);
    }

    res.clearCookie(COOKIE_NAME, { path: "/" });

    return {
      message: "Sesión cerrada correctamente.",
    };
  }

  // Recuperar contraseña
  @Post("recover-password")
  @HttpCode(200)
  async recoverPassword(
    @Body("numeroDocumento") numeroDocumento: string,
  ) {
    return await this.recoverPasswordUseCase.execute(numeroDocumento);
  }

  // Restablecer contraseña
  @Post("reset-password")
  @HttpCode(200)
  async resetPassword(
    @Body("token") token: string,
    @Body("nuevaPassword") nuevaPassword: string,
  ) {
    return await this.resetPasswordUseCase.execute(
      token,
      nuevaPassword,
    );
  }
}
