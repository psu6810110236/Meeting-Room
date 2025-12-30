import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<User> {
    const { username, password, role } = registerDto;
    const existingUser = await this.usersRepository.findOne({ where: { username } });
    if (existingUser) throw new ConflictException('Username already exists');

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = this.usersRepository.create({ username, password: hashedPassword, role });
    return await this.usersRepository.save(user);
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    const { username, password } = loginDto;
    const user = await this.usersRepository.findOne({ where: { username } });
    if (user && (await bcrypt.compare(password, user.password))) {
      // payload ใส่แค่ id ก็พอ เดี๋ยวไปดึงสดเอา
      const payload = { username: user.username, sub: user.id, role: user.role };
      const accessToken = this.jwtService.sign(payload);
      return { accessToken };
    } else {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  // ✅ ฟังก์ชันดึงข้อมูล User ล่าสุดจาก DB (รวมรูปโปรไฟล์)
  async getUserProfile(userId: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const { password, ...result } = user; // ตัด password ทิ้งก่อนส่งกลับ
    return result;
  }

  // ✅ ฟังก์ชันอัปเดตโปรไฟล์
  async updateProfile(userId: number, data: Partial<User>) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    
    if (data.first_name) user.first_name = data.first_name;
    if (data.last_name) user.last_name = data.last_name;
    if (data.profile_picture) user.profile_picture = data.profile_picture;

    return await this.usersRepository.save(user);
  }
}