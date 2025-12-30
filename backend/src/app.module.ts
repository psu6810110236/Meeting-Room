import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule'; // ✅ 1. เพิ่ม Import สำหรับระบบตั้งเวลา
import { User } from './entities/user.entity';
import { MeetingRoom } from './entities/meeting-room.entity';
import { Facility } from './entities/facility.entity';
import { RoomFacility } from './entities/room-facility.entity';
import { Booking } from './entities/booking.entity';
import { BookingFacility } from './bookings/entities/booking-facility.entity'; 
import { RoomsModule } from './rooms/rooms.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { BookingsModule } from './bookings/bookings.module'; 
import { AuthModule } from './auth/auth.module'; 

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // ✅ 2. เปิดใช้งาน ScheduleModule เพื่อให้ระบบคืนสต็อกอัตโนมัติทำงานได้
    ScheduleModule.forRoot(), 
    
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432'), 
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'meeting_room',
      entities: [User, MeetingRoom, Facility, RoomFacility, Booking, BookingFacility],
      synchronize: true, // ควรระวังใน Production
    }),
    
    RoomsModule,
    FacilitiesModule,
    BookingsModule, 
    AuthModule,    
  ],
})
export class AppModule {}