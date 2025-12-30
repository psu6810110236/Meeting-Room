// src/bookings/entities/booking-facility.entity.ts
import { Entity, Column, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { Booking } from '../../entities/booking.entity'; 
import { Facility } from '../../entities/facility.entity'; 

@Entity()
export class BookingFacility {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  booking_id: number;

  @Column()
  facility_id: number;

  @Column({ default: 1 })
  quantity: number;

  @ManyToOne(() => Booking, (booking) => booking.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @ManyToOne(() => Facility, (facility) => facility.booking_facilities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;
}