import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { MeetingRoom } from './meeting-room.entity';
import { BookingFacility } from '../bookings/entities/booking-facility.entity'; 

export enum BookingStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity()
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: false })
  reminder_sent: boolean;

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

  // ✅ รวมเหลืออันเดียว และใส่ Option ให้ถูกต้อง
  @OneToMany(() => BookingFacility, (bf) => bf.booking, { 
    cascade: true, 
    onDelete: 'CASCADE' 
  })
  booking_facilities: BookingFacility[]; 
}