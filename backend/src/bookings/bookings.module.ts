import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../entities/booking.entity';
import { MeetingRoom } from '../entities/meeting-room.entity'; 

@Module({
  imports: [TypeOrmModule.forFeature([Booking, MeetingRoom])],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}