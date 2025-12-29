import { IsNotEmpty, IsInt, IsDateString, IsString } from 'class-validator';

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
  
  @IsNotEmpty()
  @IsInt()
  userId: number; 
}