import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm'; // ✅ เพิ่ม LessThan
import { Notification } from './entities/notification.entity';
import { Cron, CronExpression } from '@nestjs/schedule'; // ✅ เพิ่ม Cron

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notiRepo: Repository<Notification>,
  ) {}

  async create(userId: number, message: string, type: string = 'info') {
    const noti = this.notiRepo.create({ user: { id: userId }, message, type });
    return this.notiRepo.save(noti);
  }

  async findAllByUser(userId: number) {
    return this.notiRepo.find({
      where: { user: { id: userId } },
      order: { created_at: 'DESC' },
      take: 20, 
    });
  }

  async markAsRead(userId: number) {
    return this.notiRepo.update({ user: { id: userId }, is_read: false }, { is_read: true });
  }

  // ✅ เพิ่มฟังก์ชันกดอ่านทีละอัน
  async markOneAsRead(id: number, userId: number) {
      return this.notiRepo.update({ id, user: { id: userId } }, { is_read: true });
  }

  async getUnreadCount(userId: number) {
    return this.notiRepo.count({ where: { user: { id: userId }, is_read: false } });
  }

  // ✅ 🚀 Auto-Cleanup Bug Fix: ลบแจ้งเตือนเก่าเกิน 30 วันทิ้ง ทุกเที่ยงคืน
  // ป้องกันตาราง Notification บวมจน query ช้า
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCleanup() {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      await this.notiRepo.delete({
          created_at: LessThan(thirtyDaysAgo)
      });
  }
}