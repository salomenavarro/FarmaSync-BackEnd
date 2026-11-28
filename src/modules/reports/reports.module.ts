import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReportsController } from './presentation/http/reports.controller';
import { GetAdminDashboardUseCase } from './application/use-cases/get-admin-dashboard.use-case';
import { ExportAdminReportUseCase } from './application/use-cases/export-admin-report.use-case';

@Module({
  imports: [AuthModule],
  controllers: [ReportsController],
  providers: [GetAdminDashboardUseCase, ExportAdminReportUseCase],
})
export class ReportsModule {}