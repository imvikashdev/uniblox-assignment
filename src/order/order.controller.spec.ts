import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { CheckoutDto } from './dto/checkout.dto';
import { Order } from '@prisma/client';

const mockOrderService = {
  checkout: jest.fn(),
};

describe('OrderController', () => {
  let controller: OrderController;
  let service: typeof mockOrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    service = module.get(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkout', () => {
    it('should call orderService.checkout with the dto', async () => {
      const dto: CheckoutDto = { userId: 'u1', discountCode: 'test' };
      mockOrderService.checkout.mockResolvedValue({ id: 'order1' } as Order);

      await controller.checkout(dto);
      expect(service.checkout).toHaveBeenCalledWith(dto);
    });

    it('should return the result from the service', async () => {
      const dto: CheckoutDto = { userId: 'u1' };
      const mockOrderResult = {
        id: 'order2',
        total: '10.00',
      } as unknown as Order;
      mockOrderService.checkout.mockResolvedValue(mockOrderResult);

      const result = await controller.checkout(dto);
      expect(result).toEqual({
        message: 'Checkout successful!',
        order: mockOrderResult,
      });
    });
  });
});
