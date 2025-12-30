import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Facility } from '../entities/facility.entity';
import { Repository } from 'typeorm';
import { CreateFacilityDto } from './dto/create-facility.dto';

@Injectable()
export class FacilitiesService {
  constructor(
    @InjectRepository(Facility)
    private facilityRepository: Repository<Facility>,
  ) {}

  findAll() {
    return this.facilityRepository.find();
  }
  
  async create(createFacilityDto: CreateFacilityDto) {
     const facility = this.facilityRepository.create(createFacilityDto);
     return this.facilityRepository.save(facility);
  }

  async remove(id: number) {
    const facility = await this.facilityRepository.findOne({ where: { id } });
    if (!facility) {
      throw new NotFoundException(`ไม่พบอุปกรณ์รหัส #${id}`);
    }
    return this.facilityRepository.remove(facility);
  }
}