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
   * 1. Create Booking
   * - Rule: Max 3 Approved bookings per user
   * - Rule: No self-overlapping bookings
   * - Rule: Check room availability and facility stock
   */
  async create(createBookingDto: CreateBookingDto, userId: number) {
    const { roomId, startTime, endTime, purpose, facilities } = createBookingDto;
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) throw new BadRequestException('Start time must be before end time.');

    // 🛑 Rule 1: Check if user has 3 APPROVED bookings
    const approvedCount = await this.bookingRepository.count({
      where: {
        user: { id: userId },
        status: BookingStatus.APPROVED
      }
    });

    if (approvedCount >= 3) {
      throw new BadRequestException('You have reached the limit of 3 approved bookings.');
    }

    // 🛑 Rule 2: Check self-overlapping (User cannot be in two places at once)
    const overlappingUser = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.user = :userId', { userId })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.APPROVED, BookingStatus.PENDING]
      })
      .andWhere('booking.start_time < :end', { end })
      .andWhere('booking.end_time > :start', { start })
      .getOne();

    if (overlappingUser) {
      throw new BadRequestException('You already have a booking during this time.');
    }

    // --- Check Room Availability ---
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Meeting room not found.');

    const overlappingRoom = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.room = :roomId', { roomId })
      .andWhere('booking.status IN (:...statuses)', { 
        statuses: [BookingStatus.APPROVED, BookingStatus.PENDING] 
      })
      .andWhere('booking.start_time < :end', { end })
      .andWhere('booking.end_time > :start', { start })
      .getOne();

    if (overlappingRoom) throw new BadRequestException('This room is already booked during this time.');

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
          if (!facilityInfo) throw new NotFoundException(`Facility ID #${f.facility_id} not found.`);

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
            throw new BadRequestException(`Facility '${facilityInfo.name}' is insufficient (Available: ${available}).`);
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
   * 2. Update Status (Approve/Reject)
   */
  async updateStatus(id: number, status: BookingStatus) {
    const booking = await this.bookingRepository.findOne({ 
      where: { id },
      relations: ['booking_facilities', 'booking_facilities.facility']
    });

    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.status === status) return booking;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (status === BookingStatus.APPROVED) {
        for (const bf of booking.booking_facilities) {
          if (bf.facility) {
            if (bf.facility.total_stock < bf.quantity) throw new BadRequestException(`Stock for '${bf.facility.name}' is insufficient.`);
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
   * 3. Confirm Return Items
   */
  async confirmReturn(id: number) {
    const booking = await this.bookingRepository.findOne({
      where: { id, status: BookingStatus.APPROVED },
      relations: ['booking_facilities', 'booking_facilities.facility']
    });

    if (!booking) throw new BadRequestException('Booking must be APPROVED to return items.');

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
      // Change status to COMPLETED
      booking.status = BookingStatus.COMPLETED; 
      await queryRunner.manager.save(Booking, booking);

      await queryRunner.commitTransaction();
      return { message: 'Items returned and stock updated successfully.' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 4. User Cancel Booking
   */
  async cancelBooking(id: number, userId: number) {
    const booking = await this.bookingRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ['booking_facilities', 'booking_facilities.facility'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found or you do not have permission.');
    }

    if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.APPROVED) {
      throw new BadRequestException('Cannot cancel a completed or already cancelled booking.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // If approved, return stock
      if (booking.status === BookingStatus.APPROVED) {
        for (const bf of booking.booking_facilities) {
          if (bf.facility) {
            bf.facility.total_stock += bf.quantity;
            await queryRunner.manager.save(Facility, bf.facility);
          }
        }
      }

      booking.status = BookingStatus.CANCELLED;
      await queryRunner.manager.save(Booking, booking);

      await queryRunner.commitTransaction();
      return { message: 'Booking cancelled successfully.' };
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

  async remove(id: number) {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    return await this.bookingRepository.remove(booking);
  }
}