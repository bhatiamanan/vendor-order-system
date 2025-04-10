import { IsEnum, IsMongoId, IsOptional } from 'class-validator';

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export class QueryOrdersDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsMongoId()
  vendorId?: string;
}