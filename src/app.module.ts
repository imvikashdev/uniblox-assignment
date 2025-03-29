// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CartModule } from './cart/cart.module';

@Module({
  imports: [PrismaModule, CartModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
