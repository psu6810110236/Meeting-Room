import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus } from '../entities/booking.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';


@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard) 
  create(@Body() createBookingDto: CreateBookingDto, @Request() req) {
    return this.bookingsService.create(createBookingDto, req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.bookingsService.findAll();
  }

  @Get('my-history')
  findMyBookings(@Query('userId') userId: string) {
    // หมายเหตุ: แนะนำให้เปลี่ยนมาใช้ req.user.userId แทน query string ในอนาคตเพื่อความปลอดภัย
    return this.bookingsService.findMyBookings(+userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(@Param('id') id: string, @Body('status') status: BookingStatus) {
    return this.bookingsService.updateStatus(+id, status);
  }

  @Patch(':id/return')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) 
  confirmReturn(@Param('id') id: string) {
    return this.bookingsService.confirmReturn(+id);
  }

  // ✅ (เพิ่มใหม่) Endpoint สำหรับ User กดยกเลิกการจอง
  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(@Param('id') id: string, @Request() req) {
    // ส่ง userId ไปด้วยเพื่อยืนยันว่าเป็นเจ้าของรายการ
    return this.bookingsService.cancelBooking(+id, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.bookingsService.remove(+id);
  }
}