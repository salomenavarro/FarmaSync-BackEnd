import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../../auth/presentation/http/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/presentation/http/guards/roles.guard';
import { Roles } from '../../../auth/presentation/http/guards/roles.decorator';
import { GetAdminDashboardUseCase } from '../../application/use-cases/get-admin-dashboard.use-case';
import { ExportAdminReportUseCase } from '../../application/use-cases/export-admin-report.use-case';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    private readonly getAdminDashboardUseCase: GetAdminDashboardUseCase,
    private readonly exportAdminReportUseCase: ExportAdminReportUseCase,
  ) {}

  @Get('dashboard-eps')
  @Roles('ADMINISTRADOR_EPS')
  getDashboardEps(
    @Query('sedeId') sedeId?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return this.getAdminDashboardUseCase.execute({
      sedeId: sedeId ? Number(sedeId) : undefined,
      fechaInicio,
      fechaFin,
    });
  }

  @Get('dashboard-eps/export/excel')
  @Roles('ADMINISTRADOR_EPS')
  async exportDashboardExcel(
    @Res() res: Response,
    @Query('sedeId') sedeId?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    const buffer = await this.exportAdminReportUseCase.generarExcel({
      sedeId: sedeId ? Number(sedeId) : undefined,
      fechaInicio,
      fechaFin,
    });

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="reporte-eps-farmasync.xlsx"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('dashboard-eps/export/pdf')
  @Roles('ADMINISTRADOR_EPS')
  async exportDashboardPdf(
    @Res() res: Response,
    @Query('sedeId') sedeId?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    const buffer = await this.exportAdminReportUseCase.generarPdf({
      sedeId: sedeId ? Number(sedeId) : undefined,
      fechaInicio,
      fechaFin,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="reporte-eps-farmasync.pdf"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}