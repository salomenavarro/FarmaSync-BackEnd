import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { UpdateDependienteDto } from './dto/update-dependiente.dto';
import { UpdateFarmaceuticoDto } from './dto/update-farmaceutico.dto';
import { ToggleEstadoFarmaceuticoDto } from './dto/update-farmaceutico.dto';
// Controlador HTTP en la capa de presentación: autentica/autoriza mediante
// guards, parsea parámetros y delega toda la lógica al caso de uso.
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

  @Patch('empleados/:id')
  @Roles('ADMINISTRADOR_EPS')
  updateEmpleado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFarmaceuticoDto,
  ) {
    return this.empleadosUseCase.updateFarmaceutico(id, dto);
  }

  @Patch('empleados/:id/estado')
  @Roles('ADMINISTRADOR_EPS')
  toggleEstadoEmpleado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ToggleEstadoFarmaceuticoDto,
  ) {
    return this.empleadosUseCase.toggleEstadoFarmaceutico(id, dto);
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

  // Nuevo: lo usa la pantalla de detalle (/dashboard/grupo-familiar/[id]).
  @Get('grupo-familiar/:id')
  @Roles('PACIENTE', 'FARMACEUTICO', 'ADMINISTRADOR_EPS')
  getFamiliar(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.grupoFamiliarUseCase.getById(req.userId, id);
  }

  // Nuevo: lo usa el lápiz de la tarjeta (editar dependiente).
  @Patch('grupo-familiar/:id')
  @Roles('PACIENTE', 'FARMACEUTICO', 'ADMINISTRADOR_EPS')
  updateFamiliar(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDependienteDto,
  ) {
    return this.grupoFamiliarUseCase.updateDependiente(req.userId, id, dto);
  }

  @Delete('grupo-familiar/:id')
  @Roles('PACIENTE', 'FARMACEUTICO', 'ADMINISTRADOR_EPS')
  removeFamiliar(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.grupoFamiliarUseCase.removeDependiente(req.userId, id);
  }
}