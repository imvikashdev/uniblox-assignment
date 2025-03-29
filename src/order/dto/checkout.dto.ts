import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  discountCode?: string;
}
