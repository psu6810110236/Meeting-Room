import { IsNotEmpty, IsString, IsInt, IsOptional, IsBoolean, Min } from 'class-validator';

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
  @IsBoolean()
  is_active?: boolean;
}