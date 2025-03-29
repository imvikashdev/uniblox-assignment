import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { OrderService } from './order.service';
import { CheckoutDto } from './dto/checkout.dto';
import { Order } from '@prisma/client';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  async checkout(
    @Body() checkoutDto: CheckoutDto,
  ): Promise<{ message: string; order: Order }> {
    const createdOrder = await this.orderService.checkout(checkoutDto);
    return {
      message: 'Checkout successful!',
      order: createdOrder,
    };
  }
}
