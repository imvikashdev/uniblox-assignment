import { Test, TestingModule } from '@nestjs/testing';
import { AdminService, AdminStats } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { DiscountCode } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Logger } from '@nestjs/common';
import {
  mockPrismaService,
  resetAllMocks,
} from '../../test/mocks/prisma.service.mock';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            setContext: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveDiscountCode', () => {
    it('should return the active discount code if found', async () => {
      const mockActiveCode: DiscountCode = {
        id: 'dc-active',
        code: 'ACTIVE10',
        discountPercent: new Decimal('10.00'),
        isActive: true,
        isUsed: false,
        createdAt: new Date(),
        orderUsedInId: null,
      };
      prisma.discountCode.findFirst.mockResolvedValue(mockActiveCode);

      const result = await service.getActiveDiscountCode();

      expect(prisma.discountCode.findFirst).toHaveBeenCalledWith({
        where: { isActive: true, isUsed: false },
      });
      expect(result).toEqual(mockActiveCode);
    });

    it('should return null if no active discount code is found', async () => {
      prisma.discountCode.findFirst.mockResolvedValue(null);

      const result = await service.getActiveDiscountCode();

      expect(prisma.discountCode.findFirst).toHaveBeenCalledWith({
        where: { isActive: true, isUsed: false },
      });
      expect(result).toBeNull();
    });
  });

  describe('getStatistics', () => {
    it('should calculate and return correct statistics', async () => {
      const mockTotalOrders = 5;
      const mockItemsSum = { _sum: { quantity: 50 } };
      const mockAmountsSum = {
        _sum: {
          total: new Decimal('450.75'),
          discountAmount: new Decimal('49.25'),
        },
      };
      const mockAllCodes: DiscountCode[] = [
        {
          id: 'dc1',
          code: 'USED1',
          discountPercent: new Decimal(10),
          isActive: false,
          isUsed: true,
          createdAt: new Date(),
          orderUsedInId: 'o1',
        },
        {
          id: 'dc2',
          code: 'ACTIVE1',
          discountPercent: new Decimal(10),
          isActive: true,
          isUsed: false,
          createdAt: new Date(),
          orderUsedInId: null,
        },
        {
          id: 'dc3',
          code: 'OLDUNUSED',
          discountPercent: new Decimal(10),
          isActive: false,
          isUsed: false,
          createdAt: new Date(),
          orderUsedInId: null,
        },
      ];
      const mockUsedCodes = mockAllCodes.filter((c) => c.isUsed);

      prisma.order.count.mockResolvedValue(mockTotalOrders);
      prisma.orderItem.aggregate.mockResolvedValue(mockItemsSum);
      prisma.order.aggregate.mockResolvedValue(mockAmountsSum);
      prisma.discountCode.findMany.mockResolvedValue(mockAllCodes);

      const result = await service.getStatistics();

      expect(prisma.order.count).toHaveBeenCalledTimes(1);
      expect(prisma.orderItem.aggregate).toHaveBeenCalledWith({
        _sum: { quantity: true },
      });
      expect(prisma.order.aggregate).toHaveBeenCalledWith({
        _sum: { total: true, discountAmount: true },
      });
      expect(prisma.discountCode.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });

      const expectedStats: AdminStats = {
        totalOrders: mockTotalOrders,
        totalItemsPurchased: mockItemsSum._sum.quantity,
        totalPurchaseAmount: '450.75',
        discountCodesGenerated: mockAllCodes,
        discountCodesUsed: mockUsedCodes,
        totalDiscountAmount: '49.25',
      };
      expect(result).toEqual(expectedStats);
    });

    it('should handle zero orders/items correctly', async () => {
      prisma.order.count.mockResolvedValue(0);
      prisma.orderItem.aggregate.mockResolvedValue({
        _sum: { quantity: null },
      });
      prisma.order.aggregate.mockResolvedValue({
        _sum: { total: null, discountAmount: null },
      });
      prisma.discountCode.findMany.mockResolvedValue([]);

      const result = await service.getStatistics();

      const expectedStats: AdminStats = {
        totalOrders: 0,
        totalItemsPurchased: 0,
        totalPurchaseAmount: '0.00',
        discountCodesGenerated: [],
        discountCodesUsed: [],
        totalDiscountAmount: '0.00',
      };
      expect(result).toEqual(expectedStats);
    });
  });
});
