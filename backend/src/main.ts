import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ✅ ต้องมีบรรทัดนี้! ถ้าไม่มี หรือมี // ข้างหน้า ให้แก้ครับ
  app.enableCors(); 

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();