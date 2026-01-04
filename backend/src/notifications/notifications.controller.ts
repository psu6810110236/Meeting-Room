import { Controller, Get, Post, Patch, Param, UseGuards, Request } from '@nestjs/common'; // ✅ เพิ่ม Patch, Param
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Request() req) {
    return this.notificationsService.findAllByUser(req.user.userId);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req) {
    return this.notificationsService.getUnreadCount(req.user.userId);
  }

  @Post('read-all')
  markAsRead(@Request() req) {
    return this.notificationsService.markAsRead(req.user.userId);
  }

  // ✅ เพิ่ม endpoint นี้: กดอ่านทีละอัน
  @Patch(':id/read')
  markOneAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markOneAsRead(+id, req.user.userId);
  }
}