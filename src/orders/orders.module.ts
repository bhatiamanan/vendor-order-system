// src/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { ProductsModule } from '../products/products.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';
import { SubOrder, SubOrderSchema } from './schemas/sub-order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: SubOrder.name, schema: SubOrderSchema },
    ]),
    AuthModule,
    ProductsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}