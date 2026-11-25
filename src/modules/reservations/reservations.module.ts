import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReservationsController } from './presentation/http/reservations.controller';
import { CreateReservationUseCase } from './application/use-cases/create-reservation.use-case';
import { ManageReservationUseCase } from './application/use-cases/manage-reservation.use-case';
import { ExpireReservationsCron } from './application/jobs/expire-reservations.cron';

@Module({
  imports: [AuthModule],
  controllers: [ReservationsController],
  providers: [
    CreateReservationUseCase,
    ManageReservationUseCase,
    ExpireReservationsCron,
  ],
  exports: [CreateReservationUseCase, ManageReservationUseCase],
})
export class ReservationsModule {}
