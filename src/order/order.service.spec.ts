import { mockUid } from '../../test/mocks/prisma.service.mock';

const mockShortUniqueId = jest.fn().mockImplementation(() => {
  return {
    rnd: mockUid.rnd,
  };
});

jest.mock('short-unique-id', () => ({
  __esModule: true,
  default: mockShortUniqueId,
}));

import { CartItem, Order, OrderItem, DiscountCode } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';

import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  DISCOUNT_PERCENTAGE,
  NTH_ORDER_FOR_DISCOUNT,
} from '../utils/constants';
import {
  mockPrismaService,
  mockTxClient,
  resetAllMocks,
} from '../../test/mocks/prisma.service.mock';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: typeof mockPrismaService;
  let tx: typeof mockTxClient;

  const userId = 'user-checkout-test';
  const sampleCartItems: CartItem[] = [
    {
      id: 'ci1',
      userId,
      itemId: 'itemA',
      name: 'A',
      price: new Decimal('10.00'),
      quantity: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ci2',
      userId,
      itemId: 'itemB',
      name: 'B',
      price: new Decimal('5.50'),
      quantity: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const sampleSubtotal = new Decimal('21.00');
  const sampleOrderId = 'order-id-123';
  const sampleOrder: Order = {
    id: sampleOrderId,
    userId,
    subtotal: sampleSubtotal,
    discountCode: null,
    discountAmount: new Decimal(0),
    total: sampleSubtotal,
    createdAt: new Date(),
  };
  const sampleOrderWithItems = { ...sampleOrder, items: [] as OrderItem[] };

  beforeEach(async () => {
    resetAllMocks();
    mockShortUniqueId.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
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

    service = module.get<OrderService>(OrderService);
    prisma = module.get(PrismaService);
    tx = mockTxClient;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkout', () => {
    beforeEach(() => {
      prisma.cartItem.findMany.mockResolvedValue(sampleCartItems);
      prisma.order.findUnique.mockResolvedValue(sampleOrderWithItems);
      tx.appState.upsert.mockResolvedValue({ id: 'singleton', orderCount: 1 });
      tx.order.create.mockResolvedValue(sampleOrder);
      tx.orderItem.createMany.mockResolvedValue({
        count: sampleCartItems.length,
      });
      tx.cartItem.deleteMany.mockResolvedValue({
        count: sampleCartItems.length,
      });
      tx.discountCode.findFirst.mockResolvedValue(null);
      tx.discountCode.update.mockResolvedValue({} as DiscountCode);
      tx.discountCode.updateMany.mockResolvedValue({ count: 0 });
      tx.discountCode.create.mockResolvedValue({} as DiscountCode);
    });

    it('should throw NotFoundException if cart is empty', async () => {
      prisma.cartItem.findMany.mockResolvedValue([]);
      const dto: CheckoutDto = { userId };

      await expect(service.checkout(dto)).rejects.toThrow(NotFoundException);
      await expect(service.checkout(dto)).rejects.toThrow(
        'Cart is empty for user user-checkout-test. Cannot checkout.',
      );
    });

    it('should throw BadRequestException if cart subtotal is zero', async () => {
      const zeroValueCart: CartItem[] = [
        { ...sampleCartItems[0], price: new Decimal(0), quantity: 1 },
      ];
      prisma.cartItem.findMany.mockResolvedValue(zeroValueCart);
      const dto: CheckoutDto = { userId };

      await expect(service.checkout(dto)).rejects.toThrow(BadRequestException);
      await expect(service.checkout(dto)).rejects.toThrow(
        'Cart total value is zero. Cannot checkout.',
      );
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should successfully create an order with correct totals (no discount, not Nth)', async () => {
      const dto: CheckoutDto = { userId };

      tx.appState.upsert.mockResolvedValue({ id: 'singleton', orderCount: 1 });

      const result = await service.checkout(dto);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.order.create).toHaveBeenCalledWith({
        data: {
          userId: userId,
          subtotal: sampleSubtotal,
          discountCode: null,
          discountAmount: new Decimal(0),
          total: sampleSubtotal,
        },
      });
      expect(tx.orderItem.createMany).toHaveBeenCalled();
      expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(tx.discountCode.create).not.toHaveBeenCalled();
      expect(tx.discountCode.update).not.toHaveBeenCalled();

      expect(result).toEqual(sampleOrderWithItems);
      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: sampleOrderId },
        include: { items: true },
      });
    });

    it('should apply a valid discount code', async () => {
      const discountCode = 'VALID10';
      const dto: CheckoutDto = { userId, discountCode };
      const activeCode: DiscountCode = {
        id: 'dc-id-1',
        code: discountCode,
        discountPercent: DISCOUNT_PERCENTAGE,
        isActive: true,
        isUsed: false,
        createdAt: new Date(),
        orderUsedInId: null,
      };
      const expectedDiscountAmount = sampleSubtotal
        .mul(DISCOUNT_PERCENTAGE)
        .div(100)
        .toDecimalPlaces(2);
      const expectedTotal = sampleSubtotal.sub(expectedDiscountAmount);

      tx.discountCode.findFirst.mockResolvedValue(activeCode);
      const discountedOrder = {
        ...sampleOrder,
        discountCode,
        discountAmount: expectedDiscountAmount,
        total: expectedTotal,
      };
      tx.order.create.mockResolvedValue(discountedOrder);
      prisma.order.findUnique.mockResolvedValue({
        ...discountedOrder,
        items: [],
      });

      const result = await service.checkout(dto);

      expect(tx.discountCode.findFirst).toHaveBeenCalledWith({
        where: { code: discountCode, isActive: true, isUsed: false },
      });
      expect(tx.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          discountCode: discountCode,
          discountAmount: expectedDiscountAmount,
          total: expectedTotal,
        }),
      });
      expect(tx.discountCode.update).toHaveBeenCalledWith({
        where: { id: activeCode.id },
        data: { isUsed: true, isActive: false, orderUsedInId: sampleOrderId },
      });

      expect(result.total).toEqual(expectedTotal);
      expect(result.discountAmount).toEqual(expectedDiscountAmount);
    });

    it('should ignore invalid/used discount code', async () => {
      const discountCode = 'INVALIDCODE';
      const dto: CheckoutDto = { userId, discountCode };

      tx.discountCode.findFirst.mockResolvedValue(null);

      const result = await service.checkout(dto);

      expect(tx.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          discountCode: null,
          discountAmount: new Decimal(0),
          total: sampleSubtotal,
        }),
      });
      expect(tx.discountCode.update).not.toHaveBeenCalled();

      expect(result.total).toEqual(sampleSubtotal);
      expect(result.discountAmount).toEqual(new Decimal(0));
    });

    it('should generate a new discount code on the Nth order', async () => {
      const dto: CheckoutDto = { userId };
      const nthOrderNumber = NTH_ORDER_FOR_DISCOUNT;

      tx.appState.upsert.mockResolvedValue({
        id: 'singleton',
        orderCount: nthOrderNumber,
      });
      const generatedCodeValue = `DISCOUNT-${mockUid.rnd()}`;
      const generatedCode: DiscountCode = {
        id: 'dc-new-id',
        code: generatedCodeValue,
        discountPercent: DISCOUNT_PERCENTAGE,
        isActive: true,
        isUsed: false,
        createdAt: new Date(),
        orderUsedInId: null,
      };
      tx.discountCode.create.mockResolvedValue(generatedCode);

      await service.checkout(dto);

      expect(tx.discountCode.updateMany).toHaveBeenCalledWith({
        where: { isActive: true },
        data: { isActive: false },
      });
      expect(tx.discountCode.create).toHaveBeenCalledWith({
        data: {
          code: generatedCodeValue,
          discountPercent: DISCOUNT_PERCENTAGE,
          isActive: true,
          isUsed: false,
        },
      });
      expect(tx.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          discountCode: null,
          discountAmount: new Decimal(0),
        }),
      });
    });

    it('should handle transaction failure', async () => {
      const dto: CheckoutDto = { userId };
      const error = new Error('Database connection lost');

      tx.orderItem.createMany.mockRejectedValue(error);

      await expect(service.checkout(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.order.findUnique).not.toHaveBeenCalled();
    });
  });
});
