import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { MeetingRoom } from './meeting-room.entity';
import { BookingFacility } from '../bookings/entities/booking-facility.entity'; 

// src/entities/booking.entity.ts

export enum BookingStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed', // ✅ เพิ่มสถานะใหม่
}

@Entity()
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  purpose: string; 

  @Column({ type: 'timestamp' })
  start_time: Date;

  @Column({ type: 'timestamp' })
  end_time: Date;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, (user) => user.bookings)
  user: User;

  @ManyToOne(() => MeetingRoom, (room) => room.bookings)
  room: MeetingRoom;

  // ✅ เพิ่มบรรทัดนี้เพื่อเชื่อมความสัมพันธ์ให้ Service ใช้งานได้
  @OneToMany(() => BookingFacility, (bf) => bf.booking)
  booking_facilities: BookingFacility[]; 
}