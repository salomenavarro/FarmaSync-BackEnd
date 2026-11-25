import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/presentation/http/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/presentation/http/guards/roles.guard';
import { Roles } from '../../../auth/presentation/http/guards/roles.decorator';
import { ManageEmpleadosUseCase } from '../../application/use-cases/manage-empleados.use-case';
import { ManageGrupoFamiliarUseCase } from '../../application/use-cases/manage-grupo-familiar.use-case';
import { CreateFarmaceuticoDto } from './dto/create-farmaceutico.dto';
import { CreateDependienteDto } from './dto/create-dependiente.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly empleadosUseCase: ManageEmpleadosUseCase,
    private readonly grupoFamiliarUseCase: ManageGrupoFamiliarUseCase,
  ) {}

  // --- Gestión de Empleados (Solo ADMINISTRADOR_EPS) ---

  @Post('empleados')
  @Roles('ADMINISTRADOR_EPS')
  createEmpleado(@Body() dto: CreateFarmaceuticoDto) {
    return this.empleadosUseCase.createFarmaceutico(dto);
  }

  @Get('empleados')
  @Roles('ADMINISTRADOR_EPS')
  listEmpleados() {
    return this.empleadosUseCase.listFarmaceuticos();
  }

  // --- Gestión de Grupo Familiar (Vista Dual) ---

  @Post('grupo-familiar')
  @Roles('PACIENTE', 'FARMACEUTICO', 'ADMINISTRADOR_EPS')
  addFamiliar(@Req() req: any, @Body() dto: CreateDependienteDto) {
    return this.grupoFamiliarUseCase.addDependiente(req.userId, dto);
  }

  @Get('grupo-familiar')
  @Roles('PACIENTE', 'FARMACEUTICO', 'ADMINISTRADOR_EPS')
  listFamiliares(@Req() req: any) {
    return this.grupoFamiliarUseCase.listByTitular(req.userId);
  }

  @Delete('grupo-familiar/:id')
  @Roles('PACIENTE', 'FARMACEUTICO', 'ADMINISTRADOR_EPS')
  removeFamiliar(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.grupoFamiliarUseCase.removeDependiente(req.userId, id);
  }
}