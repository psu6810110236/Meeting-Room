import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { MeetingRoom } from '../entities/meeting-room.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(MeetingRoom)
    private roomsRepository: Repository<MeetingRoom>,
  ) {}

  async create(createRoomDto: CreateRoomDto) {
    const room = this.roomsRepository.create(createRoomDto);
    return await this.roomsRepository.save(room);
  }

  async findAll(isActive?: boolean, capacity?: number) {
    const query = this.roomsRepository.createQueryBuilder('room');

    if (isActive !== undefined) {
      query.andWhere('room.is_active = :isActive', { isActive });
    }

    if (capacity) {
      query.andWhere('room.capacity >= :capacity', { capacity });
    }

    return await query.getMany();
  }

  async findOne(id: number) {
    const room = await this.roomsRepository.findOne({ where: { id } });
    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }
    return room;
  }

  async update(id: number, updateRoomDto: UpdateRoomDto) {
    const room = await this.findOne(id); 
    Object.assign(room, updateRoomDto);
    return await this.roomsRepository.save(room);
  }

  async remove(id: number) {
    const room = await this.findOne(id); 
    return await this.roomsRepository.remove(room);
  }
}