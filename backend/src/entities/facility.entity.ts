import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RoomFacility } from './room-facility.entity';

@Entity()
export class Facility {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  icon: string; 

  @OneToMany(() => RoomFacility, (roomFacility) => roomFacility.facility)
  room_facilities: RoomFacility[];
}