import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { User } from '../entities/user.entity';
import { Booking } from '../entities/booking.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private chatRepo: Repository<ChatMessage>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
  ) {}

  async saveMessage(userId: number, message: string, isAdmin: boolean, roomId: string, imageUrl: string | null = null) {
    const chat = this.chatRepo.create({
      message,
      sender: { id: userId } as User, 
      is_admin_reply: isAdmin,       
      room_id: roomId,
      is_read: false,
      image_url: imageUrl
    });
    return await this.chatRepo.save(chat);
  }

  // ✅ ฟังก์ชันใหม่: ลบข้อความ
  async deleteMessage(messageId: number, userId: number, role: string) {
    // ค้นหาข้อความก่อน
    const msg = await this.chatRepo.findOne({ 
        where: { id: messageId },
        relations: ['sender']
    });

    if (!msg) return null;

    // ตรวจสอบสิทธิ์: Admin ลบได้หมด หรือ เจ้าของข้อความลบของตัวเองได้
    if (role === 'admin' || msg.sender.id === userId) {
        await this.chatRepo.remove(msg);
        return msg; // ส่งข้อความที่ถูกลบกลับไป (เพื่อเอา roomId ไปบอกคนอื่น)
    }
    
    return null;
  }

  async getMessages(roomId: string) {
    return await this.chatRepo.find({
      where: { room_id: roomId },
      relations: ['sender'],         
      order: { created_at: 'ASC' },  
    });
  }

  async getActiveChats() {
    const rawRooms = await this.chatRepo
      .createQueryBuilder('chat')
      .select('chat.room_id', 'room_id')
      .distinct(true)
      .getRawMany();

    const chatRooms = await Promise.all(rawRooms.map(async (r) => {
       const roomId = r.room_id;
       let userName = roomId; 
       
       if (roomId && roomId.startsWith('user_')) {
           const userId = roomId.split('_')[1];
           const user = await this.userRepo.findOne({ where: { id: Number(userId) } });
           if (user) userName = user.username;
       }
       
       const unreadCount = await this.chatRepo.count({
           where: { room_id: roomId, is_admin_reply: false, is_read: false }
       });
       
       return { roomId, name: userName, unread: unreadCount };
    }));

    return chatRooms;
  }

  async getUnreadCount(userId: number, role: string) {
    if (role === 'admin') {
      return await this.chatRepo.count({
        where: { is_admin_reply: false, is_read: false }
      });
    } else {
      return await this.chatRepo.count({
        where: { room_id: `user_${userId}`, is_admin_reply: true, is_read: false }
      });
    }
  }

  async markAsRead(roomId: string, userRole: string) {
    const targetIsAdminReply = userRole !== 'admin';
    await this.chatRepo.update(
      { room_id: roomId, is_admin_reply: targetIsAdminReply, is_read: false },
      { is_read: true }
    );
  }

  async getUserLatestBookingContext(userId: number) {
      const booking = await this.bookingRepo.findOne({
          where: { user: { id: userId } },
          order: { created_at: 'DESC' },
          relations: ['room']
      });

      if (!booking) return null;
      return `Latest booking: ${booking.room.name} (${booking.status}) on ${new Date(booking.start_time).toLocaleDateString()}`;
  }
}