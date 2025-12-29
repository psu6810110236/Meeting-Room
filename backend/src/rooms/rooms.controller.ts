import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseBoolPipe, ParseIntPipe } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  create(@Body() createRoomDto: CreateRoomDto) {
    
    return this.roomsService.create(createRoomDto);
  }

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

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomsService.update(+id, updateRoomDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roomsService.remove(+id);
  }
}