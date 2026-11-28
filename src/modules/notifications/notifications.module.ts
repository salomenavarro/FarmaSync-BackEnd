import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EMAIL_SERVICE } from '../auth/domain/ports/email.port';
import { NodemailerService } from '../auth/infrastructure/email/nodemailer.service';
import { ReservationRemindersCron } from './application/jobs/reservation-reminders.cron';
import { NotificationsService } from './application/services/notifications.service';
import { NotificationsController } from './presentation/http/notifications.controller';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    ReservationRemindersCron,
    {
      provide: EMAIL_SERVICE,
      useClass: NodemailerService,
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}