import { Controller, Get, Post, Body, Delete, Param, UseGuards } from '@nestjs/common';
import { FacilitiesService } from './facilities.service';
// Import Guards
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Get()
  findAll() {
    return this.facilitiesService.findAll();
  }

  // 🔒 สร้างได้เฉพาะ Admin
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body('name') name: string) {
    return this.facilitiesService.create(name);
  }

  // 🔒 ลบได้เฉพาะ Admin (เพิ่มใหม่)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.facilitiesService.remove(+id);
  }
}