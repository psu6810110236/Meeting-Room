import { Injectable, NotFoundException } from '@nestjs/common'; // เพิ่ม NotFoundException
import { InjectRepository } from '@nestjs/typeorm';
import { Facility } from '../entities/facility.entity';
import { Repository } from 'typeorm';

@Injectable()
export class FacilitiesService {
  constructor(
    @InjectRepository(Facility)
    private facilityRepository: Repository<Facility>,
  ) {}

  findAll() {
    return this.facilityRepository.find();
  }
  
  async create(name: string) {
     const facility = this.facilityRepository.create({ name });
     return this.facilityRepository.save(facility);
  }

  // ✅ เพิ่มฟังก์ชันลบ
  async remove(id: number) {
    const facility = await this.facilityRepository.findOne({ where: { id } });
    if (!facility) {
      throw new NotFoundException(`Facility #${id} not found`);
    }
    return this.facilityRepository.remove(facility);
  }
}