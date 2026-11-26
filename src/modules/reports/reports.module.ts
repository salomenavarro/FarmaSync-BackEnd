import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReportsController } from './presentation/http/reports.controller';
import { GetAdminDashboardUseCase } from './application/use-cases/get-admin-dashboard.use-case';

@Module({
  imports: [AuthModule],
  controllers: [ReportsController],
  providers: [GetAdminDashboardUseCase],
})
export class ReportsModule {}