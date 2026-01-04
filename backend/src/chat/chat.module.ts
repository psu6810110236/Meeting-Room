import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { User } from '../entities/user.entity';
import { Booking } from '../entities/booking.entity'; // ✅ Import Booking
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage, User, Booking]), // ✅ เพิ่ม Booking เข้าไปใน Feature
    AuthModule,
    JwtModule.registerAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => ({
          secret: configService.get<string>('JWT_SECRET') || 'yourSecretKey',
          signOptions: { expiresIn: '60m' },
        }),
      }),
  ],
  providers: [ChatGateway, ChatService],
  exports: [ChatService]
})
export class ChatModule {}