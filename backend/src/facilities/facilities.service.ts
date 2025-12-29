import { Injectable } from '@nestjs/common';
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
}