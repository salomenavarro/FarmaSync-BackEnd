import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class RecaptchaGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.body?.recaptchaToken;

    if (!token) {
      throw new BadRequestException("El token de reCAPTCHA es obligatorio");
    }

    const secretKey = this.configService.get<string>("RECAPTCHA_SECRET_KEY");
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;

    try {
      const response = await fetch(verifyUrl, { method: "POST" });
      const data = await response.json();

      if (!data.success) {
        throw new BadRequestException("La verificación de reCAPTCHA ha fallado");
      }

      return true;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException("Error al validar el captcha con Google");
    }
  }
}