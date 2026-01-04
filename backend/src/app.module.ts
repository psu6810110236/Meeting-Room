import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Entities
import { User } from './entities/user.entity';
import { MeetingRoom } from './entities/meeting-room.entity';
import { Facility } from './entities/facility.entity';
import { RoomFacility } from './entities/room-facility.entity';
import { Booking } from './entities/booking.entity';
import { BookingFacility } from './bookings/entities/booking-facility.entity';
import { Notification } from './notifications/entities/notification.entity';

// Modules
import { RoomsModule } from './rooms/rooms.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { BookingsModule } from './bookings/bookings.module';
import { AuthModule } from './auth/auth.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    
    // ✅ Rate Limit: 100 requests / 60 วินาที
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'meeting_room',
      entities: [User, MeetingRoom, Facility, RoomFacility, Booking, BookingFacility, Notification],
      synchronize: true, // ระวังใน Production
    }),

    RoomsModule,
    FacilitiesModule,
    BookingsModule,
    AuthModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}