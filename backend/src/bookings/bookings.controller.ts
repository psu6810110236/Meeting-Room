import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
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

  // ✅ เพิ่ม UseGuards เพื่อดึง User จาก Token
  @Post()
  @UseGuards(JwtAuthGuard) 
  create(@Body() createBookingDto: CreateBookingDto, @Request() req) {
    // req.user มาจาก JwtStrategy ที่แกะ Token ให้แล้ว
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
    return this.bookingsService.findMyBookings(+userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: BookingStatus,
  ) {
    return this.bookingsService.updateStatus(+id, status);
  }
  @Patch(':id/return')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // เฉพาะ Admin เท่านั้นที่กดรับของคืนได้
  confirmReturn(@Param('id') id: string) {
    return this.bookingsService.confirmReturn(+id);
  }
}