// src/orders/schemas/order.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { OrderStatus } from '../dto/query-orders.dto';
import { SubOrder } from './sub-order.schema';

class OrderItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  productId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  quantity: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  vendorId: User;
}

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  customerId: User;

  @Prop({ required: true })
  items: OrderItem[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'SubOrder' }] })
  subOrders: SubOrder[];
}

export const OrderSchema = SchemaFactory.createForClass(Order);