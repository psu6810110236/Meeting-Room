import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { MeetingRoom } from '../entities/meeting-room.entity';
import { Facility } from '../entities/facility.entity';
import { BookingFacility } from './entities/booking-facility.entity';
import { Repository, DataSource } from 'typeorm';

@Injectable()
export class BookingsService {

  async remove(id: number) {
  const booking = await this.bookingRepository.findOne({ where: { id } });
  if (!booking) {
    throw new NotFoundException(`ไม่พบรายการจอง #${id}`);
  }
  return await this.bookingRepository.remove(booking);
  }

  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(MeetingRoom)
    private roomRepository: Repository<MeetingRoom>,
    @InjectRepository(Facility)
    private facilityRepository: Repository<Facility>,
    @InjectRepository(BookingFacility)
    private bookingFacilityRepository: Repository<BookingFacility>,
    private dataSource: DataSource,
  ) {}

  /**
   * 1. สร้างการจอง: เช็คสต็อกที่ว่างจริงตามช่วงเวลา (Cross-Room Checking)
   */
  async create(createBookingDto: CreateBookingDto, userId: number) {
    const { roomId, startTime, endTime, purpose, facilities } = createBookingDto;
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) throw new BadRequestException('เวลาเริ่มต้นต้องอยู่ก่อนเวลาสิ้นสุด');

    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('ไม่พบห้องประชุม');

    const overlappingRoom = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.room = :roomId', { roomId })
      .andWhere('booking.status IN (:...statuses)', { 
        statuses: [BookingStatus.APPROVED, BookingStatus.PENDING] 
      })
      .andWhere('booking.start_time < :end', { end })
      .andWhere('booking.end_time > :start', { start })
      .getOne();

    if (overlappingRoom) throw new BadRequestException('ห้องนี้ถูกจองแล้วในช่วงเวลานี้');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const booking = queryRunner.manager.create(Booking, {
        room: { id: roomId },
        user: { id: userId },
        start_time: start,
        end_time: end,
        purpose,
        status: BookingStatus.PENDING,
      });
      const savedBooking = await queryRunner.manager.save(booking);

      if (facilities && facilities.length > 0) {
        for (const f of facilities) {
          const facilityInfo = await queryRunner.manager.findOne(Facility, { where: { id: f.facility_id } });
          if (!facilityInfo) throw new NotFoundException(`ไม่พบอุปกรณ์รหัส #${f.facility_id}`);

          const usedQuantityResult = await this.bookingFacilityRepository
            .createQueryBuilder('bf')
            .leftJoin('bf.booking', 'booking')
            .where('bf.facility_id = :facilityId', { facilityId: f.facility_id })
            .andWhere('booking.status IN (:...statuses)', { statuses: [BookingStatus.APPROVED, BookingStatus.PENDING] })
            .andWhere('booking.start_time < :end', { end })
            .andWhere('booking.end_time > :start', { start })
            .select('SUM(bf.quantity)', 'total')
            .getRawOne();

          const totalUsed = parseInt(usedQuantityResult.total || '0');
          const available = facilityInfo.total_stock - totalUsed;

          if (f.quantity > available) {
            throw new BadRequestException(`อุปกรณ์ ${facilityInfo.name} ไม่พอในช่วงนี้ (ว่างให้จอง: ${available})`);
          }

          const bf = queryRunner.manager.create(BookingFacility, {
            booking: savedBooking,
            facility: facilityInfo,
            quantity: f.quantity,
          });
          await queryRunner.manager.save(bf);
        }
      }
      await queryRunner.commitTransaction();
      return savedBooking;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 2. อนุมัติการจอง: หักสต็อกทันที
   */
  async updateStatus(id: number, status: BookingStatus) {
    const booking = await this.bookingRepository.findOne({ 
      where: { id },
      relations: ['booking_facilities', 'booking_facilities.facility']
    });

    if (!booking) throw new NotFoundException('ไม่พบรายการจอง');
    if (booking.status === status) return booking;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (status === BookingStatus.APPROVED) {
        for (const bf of booking.booking_facilities) {
          if (bf.facility) {
            if (bf.facility.total_stock < bf.quantity) throw new BadRequestException(`สต็อก ${bf.facility.name} ไม่พอ`);
            bf.facility.total_stock -= bf.quantity;
            await queryRunner.manager.save(Facility, bf.facility);
          }
        }
      }
      booking.status = status;
      const result = await queryRunner.manager.save(Booking, booking);
      await queryRunner.commitTransaction();
      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 3. ระบบยืนยันการคืนของ: กดยืนยันแล้วสต็อกถึงจะเพิ่มกลับมา และเปลี่ยนสถานะเป็น COMPLETED
   */
  async confirmReturn(id: number) {
    const booking = await this.bookingRepository.findOne({
      where: { id, status: BookingStatus.APPROVED },
      relations: ['booking_facilities', 'booking_facilities.facility']
    });

    if (!booking) throw new BadRequestException('รายการจองต้องมีสถานะ APPROVED ถึงจะยืนยันการคืนของได้');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const bf of booking.booking_facilities) {
        if (bf.facility) {
          bf.facility.total_stock += bf.quantity;
          await queryRunner.manager.save(Facility, bf.facility);
        }
      }
      // ✅ เปลี่ยนสถานะเป็น COMPLETED เมื่อคืนของเรียบร้อยแล้ว
      booking.status = BookingStatus.COMPLETED; 
      await queryRunner.manager.save(Booking, booking);

      await queryRunner.commitTransaction();
      return { message: 'ยืนยันการรับคืนอุปกรณ์และเพิ่มสต็อกเรียบร้อยแล้ว' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll() {
    return await this.bookingRepository.find({
      relations: ['user', 'room', 'booking_facilities', 'booking_facilities.facility'],
      order: { created_at: 'DESC' },
    });
  }

  async findMyBookings(userId: number) {
    return await this.bookingRepository.find({
      where: { user: { id: userId } },
      relations: ['room', 'booking_facilities', 'booking_facilities.facility'],
      order: { created_at: 'DESC' },
    });
  }
}