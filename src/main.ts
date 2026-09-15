import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 3001);
  const corsOrigin = configService.get<string>("CORS_ORIGIN", "http://localhost:3000");

  app.setGlobalPrefix("api/v1");
  app.enableCors({ origin: corsOrigin, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Necesario para que el JwtAuthGuard pueda leer req.cookies.access_token
  app.use(cookieParser());

  await app.listen(port);
}

void bootstrap();
