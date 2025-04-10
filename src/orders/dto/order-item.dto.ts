import { IsMongoId, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsNotEmpty()
  @IsMongoId()
  productId: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity: number;
}