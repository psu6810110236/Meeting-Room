import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Facility } from '../entities/facility.entity';
import { Repository } from 'typeorm';

@Injectable()
export class FacilitiesService {
  constructor(
    @InjectRepository(Facility)
    private facilityRepository: Repository<Facility>,
  ) {}

  create(createFacilityDto: CreateFacilityDto) {
    const facility = this.facilityRepository.create(createFacilityDto);
    return this.facilityRepository.save(facility);
  }

  findAll() {
    return this.facilityRepository.find({ order: { id: 'ASC' } });
  }

  // ✅ เพิ่มฟังก์ชัน Update
  async update(id: number, updateFacilityDto: any) {
    const facility = await this.facilityRepository.findOne({ where: { id } });
    if (!facility) throw new NotFoundException('Facility not found');
    
    Object.assign(facility, updateFacilityDto);
    return this.facilityRepository.save(facility);
  }

  async remove(id: number) {
     const facility = await this.facilityRepository.findOne({ where: { id } });
     if (!facility) throw new NotFoundException('Facility not found');
     return this.facilityRepository.remove(facility);
  }
}