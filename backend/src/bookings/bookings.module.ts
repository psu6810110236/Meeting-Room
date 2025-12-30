import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../entities/booking.entity';
import { MeetingRoom } from '../entities/meeting-room.entity'; 
import { Facility } from '../entities/facility.entity';
import { BookingFacility } from './entities/booking-facility.entity'; // ✅ เพิ่มสิ่งนี้

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking, 
      MeetingRoom, 
      Facility, 
      BookingFacility // ✅ เพิ่มตัวนี้เข้าไปในอาเรย์
    ])
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}