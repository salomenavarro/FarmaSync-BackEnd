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
import { CreateReservationUseCase } from '../../application/use-cases/create-reservation.use-case';
import { ManageReservationUseCase } from '../../application/use-cases/manage-reservation.use-case';
import { ExpireReservationsCron } from '../../application/jobs/expire-reservations.cron';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { AlistarReservaDto } from './dto/alistar-reserva.dto';
import { RechazarReservaDto } from './dto/rechazar-reserva.dto';

@Controller('reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservationsController {
  constructor(
    private readonly createReservationUseCase: CreateReservationUseCase,
    private readonly manageReservationUseCase: ManageReservationUseCase,
    private readonly expireReservationsCron: ExpireReservationsCron,
  ) {}

  @Post()
  @Roles('PACIENTE', 'FARMACEUTICO', 'ADMINISTRADOR_EPS')
  create(@Req() req: any, @Body() dto: CreateReservationDto) {
    return this.createReservationUseCase.execute(req.userId, dto);
  }

  @Get('mias')
  @Roles('PACIENTE', 'FARMACEUTICO', 'ADMINISTRADOR_EPS')
  findMine(@Req() req: any) {
    return this.manageReservationUseCase.findMyReservations(req.userId);
  }

  @Get('farmacia/sede')
  @Roles('FARMACEUTICO', 'ADMINISTRADOR_EPS')
  findPharmacyQueue(@Req() req: any, @Query('sedeId') sedeId?: string) {
    return this.manageReservationUseCase.findBySedeOperacion(
      req.userId,
      sedeId ? Number(sedeId) : undefined,
    );
  }

  @Get('farmacia/codigo/:codigoReserva')
  @Roles('FARMACEUTICO', 'ADMINISTRADOR_EPS')
  findByCode(@Param('codigoReserva') codigoReserva: string) {
    return this.manageReservationUseCase.findByCodeForPharmacy(codigoReserva);
  }

  @Patch(':id/prorroga')
  @Roles('PACIENTE', 'FARMACEUTICO', 'ADMINISTRADOR_EPS')
  requestExtension(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.manageReservationUseCase.requestExtension(req.userId, id);
  }

  @Patch(':id/cancelar')
  @Roles('PACIENTE', 'FARMACEUTICO', 'ADMINISTRADOR_EPS')
  cancelByUser(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.manageReservationUseCase.cancelByUser(req.userId, id);
  }

  @Patch('alistar/:codigoReserva')
  @Roles('FARMACEUTICO', 'ADMINISTRADOR_EPS')
  markAsReady(
    @Req() req: any,
    @Param('codigoReserva') codigoReserva: string,
    @Body() dto: AlistarReservaDto,
  ) {
    return this.manageReservationUseCase.markAsReady(
      req.userId,
      codigoReserva,
      dto.metodo ?? 'POS',
    );
  }

  @Patch('entregar/:codigoReserva')
  @Roles('FARMACEUTICO', 'ADMINISTRADOR_EPS')
  markAsDelivered(
    @Req() req: any,
    @Param('codigoReserva') codigoReserva: string,
  ) {
    return this.manageReservationUseCase.markAsDelivered(
      codigoReserva,
      req.userId,
    );
  }

  @Patch('rechazar/:codigoReserva')
  @Roles('FARMACEUTICO', 'ADMINISTRADOR_EPS')
  rejectByPharmacy(
    @Req() req: any,
    @Param('codigoReserva') codigoReserva: string,
    @Body() dto: RechazarReservaDto,
  ) {
    return this.manageReservationUseCase.rejectByPharmacy(
      req.userId,
      codigoReserva,
      dto.motivo,
    );
  }

  @Post('cron/expirar-vencidas')
  @Roles('ADMINISTRADOR_EPS')
  triggerExpirationJob() {
    return this.expireReservationsCron.handleExpiredReservations();
  }
}