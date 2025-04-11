import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from '../../orders/schemas/order.schema';
import { SubOrder } from '../../orders/schemas/sub-order.schema';
import { Product } from '../../products/schemas/product.schema';
import { VendorRevenue, TopProduct, DailySales, LowStockItem, AverageOrderValue } from '../interfaces/analytics-response.interface';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(SubOrder.name) private subOrderModel: Model<SubOrder>,
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  // Admin Analytics
  async getRevenuePerVendor(days: number = 30): Promise<VendorRevenue[]> {
    this.logger.log(`Getting revenue per vendor for last ${days} days`);
    
    const date = new Date();
    date.setDate(date.getDate() - days);

    return this.subOrderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: date },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: '$vendorId',
          totalRevenue: { $sum: '$amount' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'vendorInfo'
        }
      },
      {
        $unwind: '$vendorInfo'
      },
      {
        $project: {
          vendorId: '$_id',
          vendorName: '$vendorInfo.name',
          totalRevenue: 1,
          _id: 0
        }
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ]);
  }

async getTopProducts(limit: number = 5): Promise<TopProduct[]> {
    this.logger.log(`Getting top ${limit} products by sales`);

    // POTENTIAL ENHANCEMENT: Apply Strategy Pattern to support different 
    // ranking algorithms (by revenue, units sold, profit margin, etc.)
  
    // POTENTIAL ENHANCEMENT: Implement background processing with caching
    // to avoid recalculating expensive analytics queries on every request
    
    try {
      // Aggregation pipeline with better error handling
      return this.subOrderModel.aggregate([
        {
          $match: {
            status: { $ne: 'cancelled' }
          }
        },
        {
          $unwind: '$items'
        },
        {
          $project: {
            productId: { $toString: '$items.productId' },
            quantity: '$items.quantity',
            price: '$items.price',
            vendorId: { $toString: '$vendorId' }
          }
        },
        {
          $group: {
            _id: '$productId',
            totalSales: { $sum: '$quantity' },
            revenue: { $sum: { $multiply: ['$price', '$quantity'] } },
            vendorId: { $first: '$vendorId' }
          }
        },

        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendorInfo'
          }
        },
        {
          $unwind: {
            path: '$productInfo',
            preserveNullAndEmptyArrays: true // Keep results even if lookup fails
          }
        },
        {
          $unwind: {
            path: '$vendorInfo',
            preserveNullAndEmptyArrays: true // Keep results even if lookup fails
          }
        },
        {
          $project: {
            productId: '$_id',
            productName: { $ifNull: ['$productInfo.name', 'Unknown Product'] },
            vendorId: '$vendorId',
            vendorName: { $ifNull: ['$vendorInfo.name', 'Unknown Vendor'] },
            totalSales: 1,
            revenue: 1,
            _id: 0
          }
        },
        {
          $sort: { totalSales: -1 }
        },
        {
          $limit: limit
        }
      ]);
    } catch (error) {
      this.logger.error(`Error getting top products: ${error.message}`, error.stack);
      return [];
    }
  }

  async getAverageOrderValue(): Promise<AverageOrderValue> {
    this.logger.log('Getting average order value');
    
    const result = await this.orderModel.aggregate([
      {
        $match: {
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          totalRevenue: 1,
          totalOrders: 1,
          averageOrderValue: { $divide: ['$totalRevenue', '$totalOrders'] }
        }
      }
    ]);

    return result.length > 0 ? result[0] : {
      averageOrderValue: 0,
      totalOrders: 0,
      totalRevenue: 0
    };
  }

  // Vendor Analytics
  async getVendorDailySales(vendorId: string, days: number = 7): Promise<DailySales[]> {
    this.logger.log(`Getting daily sales for vendor ${vendorId} for last ${days} days`);
    
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    return this.subOrderModel.aggregate([
      {
        $match: {
          vendorId: vendorId,
          createdAt: { $gte: date },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          totalSales: { $sum: '$amount' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalSales: 1,
          orderCount: 1
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);
  }

  async getLowStockItems(vendorId: string, threshold: number = 10): Promise<LowStockItem[]> {
    this.logger.log(`Getting low stock items for vendor ${vendorId} (threshold: ${threshold})`);
    
    return this.productModel.find({
      vendorId: vendorId,
      stock: { $lte: threshold }
    }, {
      _id: 1,
      name: 1,
      stock: 1,
      category: 1
    }).lean().then(products => products.map(p => ({
      productId: p._id.toString(),
      name: p.name,
      stock: p.stock,
      category: p.category
    })));
  }
}