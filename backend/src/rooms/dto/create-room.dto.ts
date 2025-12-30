import { IsNotEmpty, IsString, IsInt, IsOptional, IsBoolean, Min, IsUrl } from 'class-validator';

export class CreateRoomDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  capacity: number;

  @IsNotEmpty()
  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  image_url?: string; // ✅ เพิ่มบรรทัดนี้

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}