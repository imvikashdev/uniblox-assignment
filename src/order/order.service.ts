import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';
import { Prisma, Order } from '@prisma/client';

import ShortUniqueId from 'short-unique-id';
import {
  DISCOUNT_PERCENTAGE,
  NTH_ORDER_FOR_DISCOUNT,
} from 'src/utils/constants';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private readonly uid = new ShortUniqueId({ length: 8 });

  constructor(private prisma: PrismaService) {}

  async checkout(dto: CheckoutDto): Promise<Order> {
    const { userId, discountCode: providedDiscountCode } = dto;
    this.logger.log(`Checkout initiated for user: ${userId}`);

    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId: userId },
    });

    if (cartItems.length === 0) {
      throw new NotFoundException(
        `Cart is empty for user ${userId}. Cannot checkout.`,
      );
    }

    let subtotal = new Prisma.Decimal(0.0);
    cartItems.forEach((item) => {
      const itemPrice = new Prisma.Decimal(item.price);
      subtotal = subtotal.add(itemPrice.mul(item.quantity));
    });

    if (subtotal.lessThanOrEqualTo(0)) {
      this.logger.warn(
        `Cart subtotal is zero or negative for user ${userId}. Clearing cart.`,
      );
      await this.prisma.cartItem.deleteMany({ where: { userId: userId } });
      throw new BadRequestException(
        'Cart total value is zero. Cannot checkout.',
      );
    }
    this.logger.log(
      `Calculated subtotal for user ${userId}: ${subtotal.toString()}`,
    );

    try {
      const order = await this.prisma.$transaction(async (tx) => {
        let discountAmount = new Prisma.Decimal(0.0);
        let appliedDiscountCode: string | null = null;
        let activeDiscountCodeId: string | null = null;

        if (providedDiscountCode) {
          this.logger.log(
            `Attempting to apply discount code: ${providedDiscountCode}`,
          );
          const activeCode = await tx.discountCode.findFirst({
            where: {
              code: providedDiscountCode,
              isActive: true,
              isUsed: false,
            },
          });

          if (activeCode) {
            this.logger.log(`Valid discount code found: ${activeCode.code}`);

            discountAmount = subtotal
              .mul(activeCode.discountPercent)
              .div(100)
              .toDecimalPlaces(2);
            appliedDiscountCode = activeCode.code;
            activeDiscountCodeId = activeCode.id;
            this.logger.log(
              `Calculated discount amount: ${discountAmount.toString()}`,
            );
          } else {
            this.logger.warn(
              `Provided discount code ${providedDiscountCode} is invalid, inactive, or already used.`,
            );
          }
        }

        const finalTotal = subtotal.sub(discountAmount);
        this.logger.log(`Calculated final total: ${finalTotal.toString()}`);

        const appState = await tx.appState.upsert({
          where: { id: 'singleton' },
          update: { orderCount: { increment: 1 } },
          create: { id: 'singleton', orderCount: 1 },
        });
        const currentOrderNumber = appState.orderCount;
        this.logger.log(`This is order number: ${currentOrderNumber}`);

        const createdOrder = await tx.order.create({
          data: {
            userId: userId,
            subtotal: subtotal,
            discountCode: appliedDiscountCode,
            discountAmount: discountAmount,
            total: finalTotal,
          },
        });
        this.logger.log(`Created order record with ID: ${createdOrder.id}`);

        const orderItemsData = cartItems.map((item) => ({
          orderId: createdOrder.id,
          itemId: item.itemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        }));
        await tx.orderItem.createMany({
          data: orderItemsData,
        });
        this.logger.log(`Created ${orderItemsData.length} order item records.`);

        if (appliedDiscountCode && activeDiscountCodeId) {
          await tx.discountCode.update({
            where: { id: activeDiscountCodeId },
            data: {
              isUsed: true,
              isActive: false,
              orderUsedInId: createdOrder.id,
            },
          });
          this.logger.log(
            `Marked discount code ${appliedDiscountCode} as used for order ${createdOrder.id}.`,
          );
        }

        const deleteResult = await tx.cartItem.deleteMany({
          where: { userId: userId },
        });
        this.logger.log(
          `Cleared ${deleteResult.count} items from cart for user ${userId}.`,
        );

        if (currentOrderNumber % NTH_ORDER_FOR_DISCOUNT === 0) {
          this.logger.log(
            `Order ${currentOrderNumber} is an Nth order. Generating new discount code.`,
          );
          await tx.discountCode.updateMany({
            where: { isActive: true },
            data: { isActive: false },
          });
          this.logger.log(`Deactivated any existing active codes.`);

          const newCodeValue = `DISCOUNT-${this.uid.rnd()}`;
          const newDiscount = await tx.discountCode.create({
            data: {
              code: newCodeValue,
              discountPercent: DISCOUNT_PERCENTAGE,
              isActive: true,
              isUsed: false,
            },
          });
          this.logger.log(
            `Generated and activated new discount code: ${newDiscount.code}`,
          );
        }

        return createdOrder;
      });

      const finalOrderDetails = await this.prisma.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });

      if (!finalOrderDetails) {
        throw new InternalServerErrorException(
          'Failed to retrieve order details after creation.',
        );
      }

      this.logger.log(
        `Checkout successful for order ID: ${finalOrderDetails.id}`,
      );
      return finalOrderDetails;
    } catch (error) {
      let errorMessage = 'An unknown error occurred during checkout.';
      let errorStack: string | undefined = undefined;

      if (error instanceof Error) {
        errorMessage = error.message;
        errorStack = error.stack;
        this.logger.error(
          `Checkout transaction failed for user ${userId}: ${errorMessage}`,
          errorStack,
        );
      } else {
        errorMessage = String(error);
        this.logger.error(
          `Checkout transaction failed for user ${userId} with non-Error type: ${errorMessage}`,
        );
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.logger.warn(
          `Prisma Error Code: ${error.code}, Target: ${JSON.stringify(error.meta)}`,
        );
      }

      throw new InternalServerErrorException(
        `Checkout failed. Please try again. Reason: ${errorMessage}`,
      );
    }
  }
}
