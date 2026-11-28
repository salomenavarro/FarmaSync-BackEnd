import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/presentation/http/guards/jwt-auth.guard';
import { RequestWithUser } from '../../../auth/presentation/http/types/request-with-user';
import { NotificationsService } from '../../application/services/notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findMine(@Req() req: RequestWithUser) {
    return this.notificationsService.findByUser(req.userId);
  }

  @Patch('leer-todas')
  markAllAsRead(@Req() req: RequestWithUser) {
    return this.notificationsService.markAllAsRead(req.userId);
  }

  @Patch(':id/leida')
  markAsRead(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.markAsRead(req.userId, id);
  }

  @Patch(':id/no-leida')
  markAsUnread(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.markAsUnread(req.userId, id);
  }
}