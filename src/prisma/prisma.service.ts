import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({});
    console.log('PrismaService Initialized');
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('Prisma Client Connected Successfully');
    } catch (error) {
      console.error('Failed to connect Prisma Client:', error);
    }
  }

  async onModuleDestroy() {
    console.log('Prisma Client Disconnecting...');
    await this.$disconnect();
    console.log('Prisma Client Disconnected');
  }

  // Optional: Add a method for cleaning the database during tests
  // async cleanDatabase() {
  //   // Use $transaction for sequential deletion respecting foreign keys
  //   if (process.env.NODE_ENV === 'test') { // Only run in test environment
  //     console.log('Cleaning test database...');
  //     // Add deletion logic for your models in the correct order
  //     // e.g., await this.orderItem.deleteMany();
  //     //      await this.order.deleteMany();
  //     //      await this.cartItem.deleteMany();
  //     //      await this.discountCode.deleteMany();
  //     //      await this.appState.deleteMany();
  //     console.log('Test database cleaned.');
  //   }
  // }
}
