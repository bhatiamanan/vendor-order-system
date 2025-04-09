import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

@Schema({ timestamps: true })
export class Product extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  stock: number;

  @Prop({ required: true })
  category: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  vendorId: User;
}

export const ProductSchema = SchemaFactory.createForClass(Product);