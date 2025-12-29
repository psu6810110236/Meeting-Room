import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
// Import Guards และ Decorator ที่เราสร้างไว้
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // 🔒 1. ป้องกันการสร้างห้อง (เฉพาะ Admin)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) 
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  // 🔓 2. การดูห้อง (เปิดสาธารณะ หรือจะให้ Login ก่อนก็ได้แล้วแต่โจทย์)
  @Get()
  findAll(
    @Query('active') active?: string, 
    @Query('capacity') capacity?: string,
  ) {
    const isActive = active !== undefined ? active === 'true' : undefined;
    const minCapacity = capacity ? parseInt(capacity) : undefined;
    return this.roomsService.findAll(isActive, minCapacity);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(+id);
  }

  // 🔒 3. ป้องกันการแก้ไข (เฉพาะ Admin)
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomsService.update(+id, updateRoomDto);
  }

  // 🔒 4. ป้องกันการลบ (เฉพาะ Admin)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.roomsService.remove(+id);
  }
}