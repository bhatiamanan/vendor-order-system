import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { ProductsService } from '../products/products.service';
import { Product } from '../products/schemas/product.schema';
import { User, UserRole } from '../users/schemas/user.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, QueryOrdersDto } from './dto/query-orders.dto';
import { Order } from './schemas/order.schema';
import { SubOrder } from './schemas/sub-order.schema';

// Define interfaces to help TypeScript understand our data structures
interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  vendorId: any; // Using 'any' here to avoid mongoose typing issues
}

interface StockUpdate {
  productId: string;
  quantity: number;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(SubOrder.name) private subOrderModel: Model<SubOrder>,
    @InjectConnection() private connection: Connection,
    private productsService: ProductsService,
  ) {}

  async create(createOrderDto: CreateOrderDto, user: User): Promise<Order> {
    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Only customers can create orders');
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      this.logger.log(`Creating order for customer: ${user._id}`);

      // Fetch all products to validate stock and get details
      const productIds = createOrderDto.items.map((item) => item.productId);
      this.logger.debug(`Fetching products: ${productIds.join(', ')}`);
      
      const products = await this.productsService.getProductsInStock(productIds);

      // Check if all products exist and are in stock
      const productMap = new Map<string, Product>();
      products.forEach((product) => {
        productMap.set(product._id.toString(), product);
      });

      // Check if any requested product wasn't found
      const missingProducts = productIds.filter(id => !productMap.has(id));
      if (missingProducts.length > 0) {
        throw new BadRequestException(
          `Products not found or out of stock: ${missingProducts.join(', ')}`
        );
      }

      // Validate all products have enough stock
      for (const item of createOrderDto.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new BadRequestException(`Product with ID ${item.productId} not found or out of stock`);
        }
        
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Not enough stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
          );
        }
      }

      // Group items by vendor
      const vendorItems = new Map<string, OrderItem[]>();
      
      let totalAmount = 0;
      const orderItems: OrderItem[] = [];
      const stockUpdates: StockUpdate[] = []; // Track stock updates for later execution

      // Process each item and group by vendor
      for (const item of createOrderDto.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          // This should never happen after our validation, but TypeScript needs it
          continue;
        }

        const vendorId = product.vendorId.toString();
        const orderItem: OrderItem = {
          productId: item.productId,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          vendorId: product.vendorId,
        };
        
        // Add to main order items
        orderItems.push(orderItem);

        // Group by vendor
        if (!vendorItems.has(vendorId)) {
          vendorItems.set(vendorId, []);
        }
        
        const vendorItemsArray = vendorItems.get(vendorId);
        if (vendorItemsArray) {
          vendorItemsArray.push(orderItem);
        }
        
        // Accumulate total amount
        totalAmount += product.price * item.quantity;
        
        // Queue stock update for later (don't update yet)
        stockUpdates.push({ productId: item.productId, quantity: item.quantity });
      }

      this.logger.debug(`Creating main order with ${orderItems.length} items, total: ${totalAmount}`);

      // Create the main order
      const order = new this.orderModel({
        customerId: user._id,
        items: orderItems,
        totalAmount,
        status: OrderStatus.PENDING,
        subOrders: [], // Initialize with empty array
      });

      await order.save({ session });

      // Create sub-orders for each vendor
      const subOrderIds: any[] = [];
      
      this.logger.debug(`Creating sub-orders for ${vendorItems.size} vendors`);
      
      for (const [vendorId, items] of vendorItems.entries()) {
        // Calculate sub-order amount
        const subOrderAmount = items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );
        
        const subOrder = new this.subOrderModel({
          parentOrderId: order._id,
          vendorId,
          items,
          amount: subOrderAmount,
          status: OrderStatus.PENDING,
        });
        
        const savedSubOrder = await subOrder.save({ session });
        subOrderIds.push(savedSubOrder._id);
        
        this.logger.debug(`Created sub-order for vendor ${vendorId} with amount ${subOrderAmount}`);
      }

      // Update main order with sub-order references
      order.subOrders = subOrderIds;
      await order.save({ session });
      
      // Now update stock for all products as part of the transaction
      this.logger.debug(`Updating stock for ${stockUpdates.length} products`);
      
      for (const update of stockUpdates) {
        // Use Model.findByIdAndUpdate to update stock directly with session
        await this.productsService.decrementStock(
          update.productId,
          update.quantity,
          session
        );
      }

      await session.commitTransaction();
      this.logger.log(`Order ${order._id} created successfully`);
      return order;
    } catch (error) {
      this.logger.error(`Error creating order: ${error.message}`, error.stack);
      await session.abortTransaction();
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to create order: ${error.message}`
      );
    } finally {
      session.endSession();
    }
  }

  async findAll(queryOrdersDto: QueryOrdersDto, user: User): Promise<any> {
    const { status, vendorId } = queryOrdersDto;
    
    try {
      // If customer, only return their orders
      if (user.role === UserRole.CUSTOMER) {
        const query: Record<string, any> = { customerId: user._id };
        
        if (status) {
          query.status = status;
        }
        
        this.logger.debug(`Finding orders for customer ${user._id}`);
        return this.orderModel
          .find(query)
          .populate({
            path: 'subOrders',
            populate: {
              path: 'vendorId',
              select: 'name email',
            },
          })
          .sort({ createdAt: -1 })
          .exec();
      }
      
      // If vendor, return sub-orders assigned to them
      else if (user.role === UserRole.VENDOR) {
        const query: Record<string, any> = { vendorId: user._id };
        
        if (status) {
          query.status = status;
        }
        
        this.logger.debug(`Finding sub-orders for vendor ${user._id}`);
        return this.subOrderModel
          .find(query)
          .populate('parentOrderId')
          .sort({ createdAt: -1 })
          .exec();
      }
      
      // If admin, return all orders or filter by vendor if specified
      else if (user.role === UserRole.ADMIN) {
        if (vendorId) {
          const query: Record<string, any> = { vendorId };
          
          if (status) {
            query.status = status;
          }
          
          this.logger.debug(`Admin finding sub-orders for vendor ${vendorId}`);
          return this.subOrderModel
            .find(query)
            .populate('parentOrderId')
            .sort({ createdAt: -1 })
            .exec();
        } else {
          const query: Record<string, any> = {};
          
          if (status) {
            query.status = status;
          }
          
          this.logger.debug('Admin finding all orders');
          return this.orderModel
            .find(query)
            .populate({
              path: 'subOrders',
              populate: {
                path: 'vendorId',
                select: 'name email',
              },
            })
            .populate('customerId', 'name email')
            .sort({ createdAt: -1 })
            .exec();
        }
      }
      
      // Default return empty array if no role matches
      return [];
    } catch (error) {
      this.logger.error(`Error finding orders: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to fetch orders: ${error.message}`
      );
    }
  }

  async findOne(id: string, user: User): Promise<any> {
    try {
      let order: any;
      
      // If customer, find their order
      if (user.role === UserRole.CUSTOMER) {
        this.logger.debug(`Customer ${user._id} finding order ${id}`);
        order = await this.orderModel
          .findOne({ _id: id, customerId: user._id })
          .populate({
            path: 'subOrders',
            populate: {
              path: 'vendorId',
              select: 'name email',
            },
          })
          .exec();
      }
      // If vendor, find sub-order assigned to them
      else if (user.role === UserRole.VENDOR) {
        this.logger.debug(`Vendor ${user._id} finding order ${id}`);
        // First try to find it as a sub-order ID
        order = await this.subOrderModel
          .findOne({ _id: id, vendorId: user._id })
          .populate('parentOrderId')
          .exec();
          
        if (!order) {
          // Try to find if this is a parent order ID that has a sub-order for this vendor
          order = await this.subOrderModel
            .findOne({ parentOrderId: id, vendorId: user._id })
            .populate('parentOrderId')
            .exec();
        }
      }
      // If admin, find any order or sub-order
      else if (user.role === UserRole.ADMIN) {
        this.logger.debug(`Admin finding order ${id}`);
        // Try to find as main order first
        order = await this.orderModel
          .findById(id)
          .populate({
            path: 'subOrders',
            populate: {
              path: 'vendorId',
              select: 'name email',
            },
          })
          .populate('customerId', 'name email')
          .exec();
          
        if (!order) {
          // Try to find as sub-order
          order = await this.subOrderModel
            .findById(id)
            .populate('parentOrderId')
            .exec();
        }
      }

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found or not accessible`);
      }
      
      return order;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error finding order ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Failed to fetch order: ${error.message}`
      );
    }
  }

  async updateOrderStatus(id: string, status: OrderStatus, user: User): Promise<any> {
    this.logger.log(`Updating order ${id} status to ${status} by ${user.role} ${user._id}`);
    
    try {
      // Check if this is a parent order or sub-order
      const isParentOrder = await this.orderModel.exists({ _id: id });
      
      if (isParentOrder) {
        // This is a parent order - update it and all its sub-orders
        const order = await this.orderModel.findById(id).populate('subOrders');
        
        if (!order) {
          throw new NotFoundException(`Order ${id} not found`);
        }
        
        // Only admins can update parent orders
        if (user.role === UserRole.VENDOR) {
          throw new ForbiddenException('Vendors can only update their own sub-orders');
        }
        
        // Update parent order status (admin only)
        order.status = status;
        await order.save();
        
        // Update all sub-orders to match parent
        if (order.subOrders && order.subOrders.length > 0) {
          await this.subOrderModel.updateMany(
            { _id: { $in: order.subOrders.map(so => so._id) } },
            { $set: { status: status } }
          );
        }
        
        return order;
      } else {
        // This is a sub-order
        const subOrder = await this.subOrderModel.findById(id);
        if (!subOrder) {
          throw new NotFoundException(`Sub-order ${id} not found`);
        }
        
        // Vendors can only update their own sub-orders
        if (user.role === UserRole.VENDOR && !subOrder.vendorId.equals(user._id)) {
          throw new ForbiddenException('You can only update your own sub-orders');
        }
        
        // Update sub-order status
        subOrder.status = status;
        await subOrder.save();
        
        // Get parent order
        const parentOrder = await this.orderModel.findById(subOrder.parentOrderId);
        if (!parentOrder) {
          throw new NotFoundException(`Parent order not found for sub-order ${id}`);
        }
        
        // Get all sibling sub-orders
        const allSubOrders = await this.subOrderModel.find({
          parentOrderId: parentOrder._id
        });
        
        // Apply logic for updating parent order status
        if (allSubOrders.length === 1) {
          // If there's only one sub-order, parent status should match sub-order status
          parentOrder.status = status;
          await parentOrder.save();
        } else if (allSubOrders.length > 1) {
          // If all sub-orders have the same status as the updated one, update parent
          const allSameStatus = allSubOrders.every(so => so.status === status);
          if (allSameStatus) {
            parentOrder.status = status;
            await parentOrder.save();
          }
          // Otherwise, leave parent status as is
        }
        
        return subOrder;
      }
    } catch (error) {
      this.logger.error(`Error updating order status: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to update order status: ${error.message}`);
    }
  }
}