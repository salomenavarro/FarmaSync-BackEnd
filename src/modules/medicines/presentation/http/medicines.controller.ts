import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/presentation/http/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/presentation/http/guards/roles.guard';
import { Roles } from '../../../auth/presentation/http/guards/roles.decorator';
import { SearchMedicinesUseCase } from '../../application/use-cases/search-medicines.use-case';
import { UpdateStockUseCase } from '../../application/use-cases/update-stock.use-case';
import { ManageStockAlertsUseCase } from '../../application/use-cases/manage-stock-alerts.use-case';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { IngresarLoteEanDto } from './dto/ingresar-lote-ean.dto';

@Controller('medicines')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicinesController {
  constructor(
    private readonly searchMedicinesUseCase: SearchMedicinesUseCase,
    private readonly updateStockUseCase: UpdateStockUseCase,
    private readonly manageStockAlertsUseCase: ManageStockAlertsUseCase,
  ) {}

  @Get()
  @Roles('PACIENTE', 'FARMACEUTICO', 'ADMINISTRADOR_EPS')
  findAll(
    @Query('search') search?: string,
    @Query('sedeId') sedeId?: string,
    @Query('ciudad') ciudad?: string,
    @Query('zona') zona?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    return this.searchMedicinesUseCase.findAll({
      search,
      sedeId: sedeId ? Number(sedeId) : undefined,
      ciudad,
      zona,
      lat: lat !== undefined ? Number(lat) : undefined,
      lng: lng !== undefined ? Number(lng) : undefined,
    });
  }

  @Post()
  @Roles('FARMACEUTICO', 'ADMINISTRADOR_EPS')
  create(@Body() dto: CreateMedicineDto) {
    return this.searchMedicinesUseCase.create(dto);
  }

  @Post('lotes/ean')
  @Roles('FARMACEUTICO', 'ADMINISTRADOR_EPS')
  ingresarLoteEan(@Req() req: any, @Body() dto: IngresarLoteEanDto) {
    return this.updateStockUseCase.ingresarPorCodigoEan(req.userId, dto);
  }

  @Patch(':id/stock')
  @Roles('FARMACEUTICO', 'ADMINISTRADOR_EPS')
  updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockDto,
  ) {
    return this.updateStockUseCase.execute(id, dto);
  }

  @Post(':id/alertas')
  @Roles('PACIENTE', 'FARMACEUTICO', 'ADMINISTRADOR_EPS')
  subscribeAlert(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.manageStockAlertsUseCase.subscribe(req.userId, id);
  }

  @Get('alertas/mias')
  @Roles('PACIENTE', 'FARMACEUTICO', 'ADMINISTRADOR_EPS')
  getMyAlerts(@Req() req: any) {
    return this.manageStockAlertsUseCase.findByUser(req.userId);
  }
}