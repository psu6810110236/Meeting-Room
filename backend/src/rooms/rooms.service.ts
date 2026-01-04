import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { MeetingRoom } from '../entities/meeting-room.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(MeetingRoom)
    private roomsRepository: Repository<MeetingRoom>,
  ) {}

  create(createRoomDto: CreateRoomDto) {
    const room = this.roomsRepository.create(createRoomDto);
    return this.roomsRepository.save(room);
  }

  findAll() {
    return this.roomsRepository.find({ order: { id: 'ASC' } });
  }

  findOne(id: number) {
    return this.roomsRepository.findOne({ where: { id } });
  }

  // ✅ เพิ่มฟังก์ชัน Update
  async update(id: number, updateRoomDto: any) {
    const room = await this.roomsRepository.findOne({ where: { id } });
    if (!room) throw new NotFoundException('Room not found');
    
    Object.assign(room, updateRoomDto);
    return this.roomsRepository.save(room);
  }

  async remove(id: number) {
    const room = await this.roomsRepository.findOne({ where: { id } });
    if (!room) throw new NotFoundException('Room not found');
    return this.roomsRepository.remove(room);
  }
}