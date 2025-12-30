import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { BookingFacility } from '../bookings/entities/booking-facility.entity'; 
import { RoomFacility } from './room-facility.entity';

@Entity()
export class Facility {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: 0 }) 
  total_stock: number; // ✅ ฟิลด์สต็อกสำหรับ Admin

  // ✅ แก้ไข: ให้สัมพันธ์กับฟิลด์ facility ใน BookingFacility
  @OneToMany(() => BookingFacility, (bf: BookingFacility) => bf.facility)
  booking_facilities: BookingFacility[];

  @OneToMany(() => RoomFacility, (rf: RoomFacility) => rf.facility)
  room_facilities: RoomFacility[];
}