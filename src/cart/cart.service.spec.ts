import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/cart.dto';
import { CartItem, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Logger } from '@nestjs/common';

const mockPrismaService = {
  cartItem: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('CartService', () => {
  let service: CartService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
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

    service = module.get<CartService>(CartService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addItem', () => {
    it('should call prisma.cartItem.upsert with correct parameters', async () => {
      const dto: AddToCartDto = {
        userId: 'user1',
        itemId: 'item1',
        name: 'Test Item',
        price: 10.5,
        quantity: 2,
      };
      const expectedPriceDecimal = new Prisma.Decimal(dto.price);
      const mockResolvedCartItem: CartItem = {
        id: 'cart-item-id',
        userId: dto.userId,
        itemId: dto.itemId,
        name: dto.name,
        price: expectedPriceDecimal,
        quantity: dto.quantity,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.cartItem.upsert.mockResolvedValue(mockResolvedCartItem);

      await service.addItem(dto);

      expect(prisma.cartItem.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.cartItem.upsert).toHaveBeenCalledWith({
        where: {
          userId_itemId: {
            userId: dto.userId,
            itemId: dto.itemId,
          },
        },
        update: {
          quantity: {
            increment: dto.quantity,
          },
          name: dto.name,
          price: expectedPriceDecimal as unknown as Decimal,
          updatedAt: expect.any(Date) as unknown as Date,
        },
        create: {
          userId: dto.userId,
          itemId: dto.itemId,
          name: dto.name,
          price: expectedPriceDecimal,
          quantity: dto.quantity,
        },
      });
    });

    it('should return the result from prisma.cartItem.upsert', async () => {
      const dto: AddToCartDto = {
        userId: 'user1',
        itemId: 'item1',
        name: 'Test Item',
        price: 10.5,
        quantity: 2,
      };
      const mockResolvedCartItem: CartItem = {
        id: 'cart-item-id',
        userId: dto.userId,
        itemId: dto.itemId,
        name: dto.name,
        price: new Prisma.Decimal(dto.price),
        quantity: dto.quantity,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.cartItem.upsert.mockResolvedValue(mockResolvedCartItem);

      const result = await service.addItem(dto);

      expect(result).toEqual(mockResolvedCartItem);
    });
  });

  describe('getCart', () => {
    it('should call prisma.cartItem.findMany with correct userId', async () => {
      const userId = 'user-cart-test';
      prisma.cartItem.findMany.mockResolvedValue([]);

      await service.getCart(userId);

      expect(prisma.cartItem.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.cartItem.findMany).toHaveBeenCalledWith({
        where: { userId: userId },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return the array of cart items found', async () => {
      const userId = 'user-cart-test';
      const mockCartItems: CartItem[] = [
        {
          id: 'ci1',
          userId: userId,
          itemId: 'itemA',
          name: 'A',
          price: new Prisma.Decimal('10.00'),
          quantity: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'ci2',
          userId: userId,
          itemId: 'itemB',
          name: 'B',
          price: new Prisma.Decimal('5.50'),
          quantity: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      prisma.cartItem.findMany.mockResolvedValue(mockCartItems);

      const result = await service.getCart(userId);

      expect(result).toEqual(mockCartItems);
    });

    it('should return an empty array if no items are found', async () => {
      const userId = 'user-empty-cart';
      prisma.cartItem.findMany.mockResolvedValue([]);

      const result = await service.getCart(userId);

      expect(result).toEqual([]);
    });
  });

  describe('clearCart', () => {
    it('should call prisma.cartItem.deleteMany with correct userId', async () => {
      const userId = 'user-clear-test';
      const mockDeleteResult = { count: 3 };
      prisma.cartItem.deleteMany.mockResolvedValue(mockDeleteResult);

      await service.clearCart(userId);

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledTimes(1);
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { userId: userId },
      });
    });

    it('should return the result from prisma.cartItem.deleteMany', async () => {
      const userId = 'user-clear-test';
      const mockDeleteResult = { count: 3 };
      prisma.cartItem.deleteMany.mockResolvedValue(mockDeleteResult);

      const result = await service.clearCart(userId);

      expect(result).toEqual(mockDeleteResult);
    });
  });
});
