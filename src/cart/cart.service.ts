import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/cart.dto';
import { CartItem } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(private prisma: PrismaService) {}

  async addItem(dto: AddToCartDto): Promise<CartItem> {
    const { userId, itemId, name, price, quantity } = dto;

    const priceDecimal = new Prisma.Decimal(price);

    const cartItem = await this.prisma.cartItem.upsert({
      where: {
        userId_itemId: {
          userId: userId,
          itemId: itemId,
        },
      },
      update: {
        quantity: {
          increment: quantity,
        },
        name: name,
        price: priceDecimal,
        updatedAt: new Date(),
      },
      create: {
        userId: userId,
        itemId: itemId,
        name: name,
        price: priceDecimal,
        quantity: quantity,
      },
    });

    this.logger.log(
      `Item ${itemId} added/updated for user ${userId}. New quantity: ${cartItem.quantity}`,
    );
    return cartItem;
  }

  async getCart(userId: string): Promise<CartItem[]> {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'asc' },
    });

    if (!cartItems) {
      throw new NotFoundException(`Cart for user ${userId} not found.`);
    }
    return cartItems;
  }

  async clearCart(userId: string): Promise<{ count: number }> {
    const deleteResult = await this.prisma.cartItem.deleteMany({
      where: { userId: userId },
    });
    this.logger.log(
      `Cleared ${deleteResult.count} items from cart for user ${userId}.`,
    );
    return deleteResult;
  }
}
