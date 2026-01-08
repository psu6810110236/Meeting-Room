import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../entities/user.entity';

@Entity()
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  message: string;

  // ✅ แก้ไขตรงนี้: ระบุ type: 'text' ให้ชัดเจน
  @Column({ type: 'text', nullable: true }) 
  image_url: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column()
  room_id: string; 

  @Column({ default: false })
  is_admin_reply: boolean; 

  @Column({ default: false })
  is_read: boolean;

  @CreateDateColumn()
  created_at: Date;
}