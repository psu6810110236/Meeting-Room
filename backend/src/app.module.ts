import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from './entities/user.entity';
import { MeetingRoom } from './entities/meeting-room.entity';
import { Facility } from './entities/facility.entity';
import { RoomFacility } from './entities/room-facility.entity';
import { Booking } from './entities/booking.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432'), 
      username: process.env.DB_USERNAME || 'admin',
      password: process.env.DB_PASSWORD || 'password123',
      database: process.env.DB_NAME || 'meeting_room',
      entities: [User, MeetingRoom, Facility, RoomFacility, Booking],
      synchronize: true,
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}