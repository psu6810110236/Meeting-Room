import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateFacilityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  // ✅ รับค่าจำนวนสต็อก
  @IsNumber()
  @Min(1)
  total_stock: number;
}