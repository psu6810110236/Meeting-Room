import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { MeetingRoom } from '../entities/meeting-room.entity';
import { Repository, DataSource } from 'typeorm';
import { RoomFacility } from '../entities/room-facility.entity'; // ต้อง Import

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(MeetingRoom)
    private roomsRepository: Repository<MeetingRoom>,
    private dataSource: DataSource, // ใช้ Transaction เพื่อความชัวร์
  ) {}

  async create(createRoomDto: CreateRoomDto) {
    const { facilityIds, ...roomData } = createRoomDto as any; // รับ facilityIds มาด้วย

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. สร้างห้อง
      const room = queryRunner.manager.create(MeetingRoom, roomData);
      const savedRoom = await queryRunner.manager.save(room);

      // 2. บันทึกอุปกรณ์ประจำห้อง (ถ้ามี)
      if (facilityIds && Array.isArray(facilityIds)) {
        for (const fId of facilityIds) {
          const rf = queryRunner.manager.create(RoomFacility, {
            room: savedRoom,
            facility_id: fId,
            quantity: 1 // Default ให้มีอย่างละ 1
          });
          await queryRunner.manager.save(rf);
        }
      }

      await queryRunner.commitTransaction();
      return savedRoom;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(isActive?: boolean, capacity?: number) {
    const query = this.roomsRepository.createQueryBuilder('room')
      .leftJoinAndSelect('room.room_facilities', 'rf')
      .leftJoinAndSelect('rf.facility', 'facility')
      .orderBy('room.id', 'ASC'); // เรียงตาม ID

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
    if (!room) throw new NotFoundException(`Room with ID ${id} not found`);
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