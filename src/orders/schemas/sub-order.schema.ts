import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { OrderStatus } from '../dto/query-orders.dto';

class OrderItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  productId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  quantity: number;
}

@Schema({ timestamps: true })
export class SubOrder extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Order', required: true })
  parentOrderId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  vendorId: User;

  @Prop({ required: true })
  items: OrderItem[];

  @Prop({ required: true })
  amount: number;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;
}

export const SubOrderSchema = SchemaFactory.createForClass(SubOrder);