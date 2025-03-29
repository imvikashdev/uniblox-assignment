import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/cart.dto';
import { CartItem } from '@prisma/client';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addItemToCart(
    @Body() addToCartDto: AddToCartDto,
  ): Promise<{ message: string; item: CartItem }> {
    const addedItem = await this.cartService.addItem(addToCartDto);
    return {
      message: 'Item added to cart successfully',
      item: addedItem,
    };
  }

  @Get(':userId')
  async getUserCart(@Param('userId') userId: string): Promise<CartItem[]> {
    if (!userId) {
      throw new Error('User ID parameter is required.');
    }
    return this.cartService.getCart(userId);
  }
}
