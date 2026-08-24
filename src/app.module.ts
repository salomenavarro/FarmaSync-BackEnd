import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { MedicinesModule } from "./modules/medicines/medicines.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { ReservationsModule } from "./modules/reservations/reservations.module";
import { UsersModule } from "./modules/users/users.module";
import { validateEnvironment } from "./config/environment";
import { DatabaseModule } from "./shared/database/database.module";
import { HealthModule } from "./shared/health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    MedicinesModule,
    ReservationsModule,
    NotificationsModule,
    ReportsModule,
  ],
})
export class AppModule {}
