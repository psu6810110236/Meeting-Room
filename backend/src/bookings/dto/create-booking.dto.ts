import { IsNotEmpty, IsInt, IsDateString, IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BookingFacilityDto {
  @IsInt()
  facility_id: number;

  @IsInt()
  quantity: number; // ✅ รับจำนวนอุปกรณ์ที่ต้องการจอง
}

export class CreateBookingDto {
  @IsNotEmpty()
  @IsInt()
  roomId: number;

  @IsNotEmpty()
  @IsDateString() 
  startTime: string;

  @IsNotEmpty()
  @IsDateString()
  endTime: string;

  @IsNotEmpty()
  @IsString()
  purpose: string;
  
  @IsOptional() 
  @IsInt()
  userId?: number; 

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingFacilityDto)
  facilities?: BookingFacilityDto[]; // ✅ เปลี่ยนจาก facilityIds เป็นรายการออบเจกต์
}