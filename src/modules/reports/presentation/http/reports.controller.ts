import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/presentation/http/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/presentation/http/guards/roles.guard';
import { Roles } from '../../../auth/presentation/http/guards/roles.decorator';
import { GetAdminDashboardUseCase } from '../../application/use-cases/get-admin-dashboard.use-case';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    private readonly getAdminDashboardUseCase: GetAdminDashboardUseCase,
  ) {}

  @Get('dashboard-eps')
  @Roles('ADMINISTRADOR_EPS')
  getDashboardEps() {
    return this.getAdminDashboardUseCase.execute();
  }
}