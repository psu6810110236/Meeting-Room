import { Controller, Get, Post, Body } from '@nestjs/common';
import { FacilitiesService } from './facilities.service';

@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Get()
  findAll() {
    return this.facilitiesService.findAll();
  }


  @Post()
  create(@Body('name') name: string) {
    return this.facilitiesService.create(name);
  }
}