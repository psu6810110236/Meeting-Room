import { Entity, Column, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm'; // เพิ่ม JoinColumn
import { MeetingRoom } from './meeting-room.entity';
import { Facility } from './facility.entity';

@Entity()
export class RoomFacility {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  room_id: number;

  @Column()
  facility_id: number;

  @Column({ default: 1 })
  quantity: number;

  
  @ManyToOne(() => MeetingRoom, (room) => room.room_facilities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' }) 
  room: MeetingRoom;

  @ManyToOne(() => Facility, (facility) => facility.room_facilities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;
}