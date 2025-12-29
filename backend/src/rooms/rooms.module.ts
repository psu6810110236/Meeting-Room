import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingRoom } from '../entities/meeting-room.entity'; 

@Module({
  imports: [TypeOrmModule.forFeature([MeetingRoom])], 
  controllers: [RoomsController],
  providers: [RoomsService],
})
export class RoomsModule {}