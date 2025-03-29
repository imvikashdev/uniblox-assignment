import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscountCode } from '@prisma/client';
import { Prisma } from '@prisma/client';

export interface AdminStats {
  totalItemsPurchased: number;
  totalPurchaseAmount: string;
  discountCodesGenerated: DiscountCode[];
  discountCodesUsed: DiscountCode[];
  totalDiscountAmount: string;
  totalOrders: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Finds the currently active and unused discount code.
   */
  async getActiveDiscountCode(): Promise<DiscountCode | null> {
    this.logger.log('Fetching active discount code...');
    const activeCode = await this.prisma.discountCode.findFirst({
      where: {
        isActive: true,
        isUsed: false,
      },
    });
    if (!activeCode) {
      this.logger.log('No active discount code found.');
      return null;
    }
    this.logger.log(`Found active discount code: ${activeCode.code}`);
    return activeCode;
  }

  /**
   * Calculates and returns various store statistics.
   */
  async getStatistics(): Promise<AdminStats> {
    this.logger.log('Calculating admin statistics...');

    const totalOrders = await this.prisma.order.count();

    const itemsAggregation = await this.prisma.orderItem.aggregate({
      _sum: {
        quantity: true,
      },
    });
    const totalItemsPurchased = itemsAggregation._sum.quantity ?? 0;

    const amountsAggregation = await this.prisma.order.aggregate({
      _sum: {
        total: true,
        discountAmount: true,
      },
    });
    const totalPurchaseAmount = (
      amountsAggregation._sum.total ?? new Prisma.Decimal(0)
    ).toFixed(2);
    const totalDiscountAmount = (
      amountsAggregation._sum.discountAmount ?? new Prisma.Decimal(0)
    ).toFixed(2);

    const allCodes = await this.prisma.discountCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const generatedCodes = allCodes;
    const usedCodes = allCodes.filter((code) => code.isUsed);

    this.logger.log('Statistics calculation complete.');

    return {
      totalOrders,
      totalItemsPurchased,
      totalPurchaseAmount,
      discountCodesGenerated: generatedCodes,
      discountCodesUsed: usedCodes,
      totalDiscountAmount,
    };
  }
}
