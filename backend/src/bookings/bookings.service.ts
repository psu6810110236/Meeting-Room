import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { MeetingRoom } from '../entities/meeting-room.entity';
import { Repository } from 'typeorm';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(MeetingRoom)
    private roomRepository: Repository<MeetingRoom>,
  ) {}

  async create(createBookingDto: CreateBookingDto) {
    const { roomId, userId, startTime, endTime, purpose } = createBookingDto;
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      throw new BadRequestException('Start time must be before end time');
    }

    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    const overlappingBooking = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.room = :roomId', { roomId }) 
      .andWhere('booking.status = :status', { status: BookingStatus.APPROVED }) 
      .andWhere('booking.start_time < :end', { end })
      .andWhere('booking.end_time > :start', { start })
      .getOne();

    if (overlappingBooking) {
      throw new BadRequestException('This room is already booked for the selected time.');
    }

    const booking = this.bookingRepository.create({
      room: { id: roomId },
      user: { id: userId }, 
      start_time: start,
      end_time: end,
      purpose,
      status: BookingStatus.PENDING, 
    });

    return await this.bookingRepository.save(booking);
  }

  // ✅ เพิ่มฟังก์ชันนี้: ดึงการจองทั้งหมด (พร้อมชื่อคนจองและชื่อห้อง)
  async findAll() {
    return await this.bookingRepository.find({
      relations: ['user', 'room'], 
      order: { created_at: 'DESC' },
    });
  }

  async findMyBookings(userId: number) {
    return await this.bookingRepository.find({
      where: { user: { id: userId } },
      relations: ['room'], 
      order: { created_at: 'DESC' },
    });
  }

  async updateStatus(id: number, status: BookingStatus) {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    booking.status = status;
    return await this.bookingRepository.save(booking);
  }
}