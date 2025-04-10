import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { SubOrder, SubOrderSchema } from '../orders/schemas/sub-order.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: SubOrder.name, schema: SubOrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService]
})
export class AnalyticsModule {}