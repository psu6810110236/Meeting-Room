import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RoomFacility } from './room-facility.entity';
import { Booking } from './booking.entity';

@Entity()
export class MeetingRoom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  capacity: number;

  @Column()
  location: string;

  @Column({ default: true })
  is_active: boolean;

  @OneToMany(() => RoomFacility, (roomFacility) => roomFacility.room)
  room_facilities: RoomFacility[];

  @OneToMany(() => Booking, (booking) => booking.room)
  bookings: Booking[];
}