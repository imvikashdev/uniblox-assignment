import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/cart.dto';
import { CartItem } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const mockCartService = {
  addItem: jest.fn(),
  getCart: jest.fn(),
};

describe('CartController', () => {
  let controller: CartController;
  let service: typeof mockCartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: mockCartService,
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
    service = module.get(CartService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('addItemToCart', () => {
    it('should call cartService.addItem with the correct DTO', async () => {
      const dto: AddToCartDto = {
        userId: 'u1',
        itemId: 'i1',
        name: 'Test',
        price: 10,
        quantity: 1,
      };
      const mockResultItem: CartItem = {
        id: 'ci1',
        userId: 'u1',
        itemId: 'i1',
        name: 'Test',
        price: new Decimal(10),
        quantity: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCartService.addItem.mockResolvedValue(mockResultItem);

      await controller.addItemToCart(dto);
      expect(service.addItem).toHaveBeenCalledWith(dto);
    });
  });

  describe('getUserCart', () => {
    it('should call cartService.getCart with the correct userId', async () => {
      const userId = 'user123';
      mockCartService.getCart.mockResolvedValue([]);

      await controller.getUserCart(userId);
      expect(service.getCart).toHaveBeenCalledWith(userId);
    });
  });
});
