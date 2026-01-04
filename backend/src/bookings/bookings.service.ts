import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { MeetingRoom } from '../entities/meeting-room.entity';
import { Facility } from '../entities/facility.entity';
import { BookingFacility } from './entities/booking-facility.entity';
import { Repository, DataSource, LessThan, Between, Not, MoreThan } from 'typeorm'; // ✅ เพิ่ม Import
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

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
    private notificationsService: NotificationsService,
  ) {}

  // 1. Create Booking
  async create(createBookingDto: CreateBookingDto, userId: number) {
    const { roomId, startTime, endTime, purpose, facilities } = createBookingDto;
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) throw new BadRequestException('Start time must be before end time.');

    // Rule: Limit 3 approved bookings per user
    const approvedCount = await this.bookingRepository.count({
      where: { user: { id: userId }, status: BookingStatus.APPROVED }
    });
    if (approvedCount >= 3) throw new BadRequestException('You have reached the limit of 3 approved bookings.');

    // ✅ Rule: Check SELF-overlap (ป้องกันตัวเองจองชนตัวเอง)
    const overlappingUser = await this.bookingRepository.createQueryBuilder('booking')
      .where('booking.user = :userId', { userId })
      .andWhere('booking.status IN (:...statuses)', { statuses: [BookingStatus.APPROVED, BookingStatus.PENDING] })
      .andWhere('booking.start_time < :end', { end })
      .andWhere('booking.end_time > :start', { start })
      .getOne();
    
    if (overlappingUser) {
        throw new BadRequestException('You already have a booking during this time.');
    }

    // Check Room Availability
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Meeting room not found.');

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
        status: BookingStatus.PENDING, // สร้างเป็น Pending เสมอ รอ Admin อนุมัติ
      });
      const savedBooking = await queryRunner.manager.save(booking);

      if (facilities && facilities.length > 0) {
        for (const f of facilities) {
          const facilityInfo = await queryRunner.manager.findOne(Facility, { where: { id: f.facility_id } });
          if (!facilityInfo) throw new NotFoundException(`Facility ID #${f.facility_id} not found.`);

          const bf = queryRunner.manager.create(BookingFacility, {
            booking: savedBooking,
            facility: facilityInfo,
            quantity: f.quantity,
          });
          await queryRunner.manager.save(bf);
        }
      }
      await queryRunner.commitTransaction();

      this.logger.log(`Booking created by User ID ${userId}`);
      await this.notificationsService.create(userId, `Booking request submitted for ${room.name}`, 'info');

      return savedBooking;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ✅ Pagination Support
  async findAll(page: number = 1, limit: number = 10) {
    const [data, total] = await this.bookingRepository.findAndCount({
      relations: ['user', 'room', 'booking_facilities', 'booking_facilities.facility'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  // ✅ Cron Jobs
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCronJobs() {
    const now = new Date();

    // 1. Auto-Cancel Expired Pending
    const expired = await this.bookingRepository.find({ 
      where: { status: BookingStatus.PENDING, start_time: LessThan(now) }, 
      relations: ['user'] 
    });
    for (const b of expired) {
      b.status = BookingStatus.CANCELLED;
      await this.bookingRepository.save(b);
      await this.notificationsService.create(b.user.id, `Booking #${b.id} was auto-cancelled (expired).`, 'error');
      this.logger.warn(`Auto-cancelled booking #${b.id}`);
    }

    // 2. Auto-Complete Finished Bookings
    const finished = await this.bookingRepository.find({ 
      where: { status: BookingStatus.APPROVED, end_time: LessThan(now) }, 
      relations: ['user'] 
    });
    for (const b of finished) {
        const hasFacilities = await this.bookingFacilityRepository.count({ where: { booking_id: b.id } });
        if (hasFacilities === 0) {
            b.status = BookingStatus.COMPLETED;
            await this.bookingRepository.save(b);
            await this.notificationsService.create(b.user.id, `Booking #${b.id} completed. Thank you!`, 'success');
            this.logger.log(`Auto-completed booking #${b.id}`);
        }
    }

    // 3. Reminder (15 mins before)
    const fifteenMinsLater = new Date(now.getTime() + 15 * 60000);
    const reminderBookings = await this.bookingRepository.find({
        where: { 
            status: BookingStatus.APPROVED, 
            reminder_sent: false,
            start_time: Between(now, fifteenMinsLater) 
        },
        relations: ['user', 'room']
    });
    
    for (const b of reminderBookings) {
        await this.notificationsService.create(b.user.id, `Reminder: Your booking at ${b.room.name} starts in 15 mins.`, 'warning');
        b.reminder_sent = true;
        await this.bookingRepository.save(b);
        this.logger.log(`Sent reminder for booking #${b.id}`);
    }
  }

  // Update Status
  async updateStatus(id: number, status: BookingStatus) {
    const booking = await this.bookingRepository.findOne({ 
      where: { id },
      relations: ['user', 'room', 'booking_facilities', 'booking_facilities.facility']
    });

    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.status === status) return booking;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (status === BookingStatus.APPROVED) {
        // ✅ 1. แก้ไข: เปิดการเช็ค Overlap เพื่อไม่ให้ Approve ซ้อนกัน
        const overlap = await queryRunner.manager.findOne(Booking, {
            where: {
                room: { id: booking.room.id },
                status: BookingStatus.APPROVED,
                start_time: LessThan(booking.end_time),
                end_time: MoreThan(booking.start_time),
                id: Not(booking.id)
            }
        });
        
        if (overlap) {
            throw new BadRequestException(`Cannot approve: Time slot overlaps with Booking #${overlap.id}`);
        }

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

      await this.notificationsService.create(booking.user.id, `Your booking #${id} is now ${status}.`, status === 'approved' ? 'success' : 'error');

      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async confirmReturn(id: number) {
    const booking = await this.bookingRepository.findOne({
      where: { id, status: BookingStatus.APPROVED },
      relations: ['user', 'booking_facilities', 'booking_facilities.facility']
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
      booking.status = BookingStatus.COMPLETED; 
      await queryRunner.manager.save(Booking, booking);
      await queryRunner.commitTransaction();

      await this.notificationsService.create(booking.user.id, `Items returned for Booking #${id}. Status Completed.`, 'success');

      return { message: 'Items returned and stock updated successfully.' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async cancelBooking(id: number, userId: number) {
    const booking = await this.bookingRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ['booking_facilities', 'booking_facilities.facility'],
    });

    if (!booking) throw new NotFoundException('Booking not found or permission denied.');
    if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.APPROVED) {
      throw new BadRequestException('Cannot cancel completed/cancelled booking.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
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