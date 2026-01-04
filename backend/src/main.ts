import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // เปิดใช้งาน CORS เพื่อให้ Frontend (Port 5173) เรียก API ได้
  app.enableCors();
  
  // ตรวจสอบข้อมูลที่ส่งเข้ามา (DTO Validation)
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // จัดการ Error format ให้เป็นมาตรฐานเดียวกันทั้งระบบ
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(3000);
}
bootstrap();