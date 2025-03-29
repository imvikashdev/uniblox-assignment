// src/cart/dto/add-to-cart.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsPositive,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer'; // Important for type transformation

export class AddToCartDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}
