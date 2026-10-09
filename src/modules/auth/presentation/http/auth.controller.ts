import { Body, Controller, Get, HttpCode, Post, Req, Res, UseFilters, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { GetCurrentUserUseCase } from "../../application/use-cases/get-current-user.use-case";
import { LoginUseCase } from "../../application/use-cases/login.use-case";
import { LogoutUseCase } from "../../application/use-cases/logout.use-case";
import { RegisterUseCase } from "../../application/use-cases/register.use-case";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { AuthDomainExceptionFilter } from "./filters/auth-domain-exception.filter";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RecaptchaGuard } from "./guards/recaptcha.guard";
import { RequestWithUser } from "./types/request-with-user";

const COOKIE_NAME = "access_token";
// RF-004: 15 minutos. Debe coincidir con el expiresIn del JwtModule
// (ver auth.module.ts) y con SESSION_MINUTES en LoginUseCase.
const COOKIE_MAX_AGE_MS = 15 * 60 * 1000;

// Esta es la única capa que sabe de Request/Response/cookies.
// Traduce HTTP <-> casos de uso; no tiene reglas de negocio propias.
@Controller("auth")
@UseFilters(AuthDomainExceptionFilter)
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

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

  @Post("login")
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const { user, token } = await this.loginUseCase.execute({
      numeroDocumento: dto.numeroDocumento,
      password: dto.password,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });

    // El JWT viaja en una cookie httpOnly: JavaScript en el navegador
    // NO puede leerla (mitiga XSS). Por eso el frontend nuevo ya NO
    // necesita hacer localStorage.setItem("token", ...).
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

  // Lo consulta el frontend (server-side, reenviando la cookie) para
  // saber "¿sigue habiendo sesión?" antes de mostrar /dashboard.
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

  // RF-017: requiere sesión activa para poder cerrarla (no tiene
  // sentido "cerrar sesión" sin haber tenido una).
  @Post("logout")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[COOKIE_NAME];

    if (token) {
      await this.logoutUseCase.execute(token);
    }

    res.clearCookie(COOKIE_NAME, { path: "/" });

    return { message: "Sesión cerrada correctamente." };
  }
}