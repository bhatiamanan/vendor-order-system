import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserRole } from '../users/schemas/user.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './schemas/product.schema';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  async create(createProductDto: CreateProductDto, user: User): Promise<Product> {
    // Only vendors can create products
    if (user.role !== UserRole.VENDOR) {
      throw new ForbiddenException('Only vendors can create products');
    }

    const newProduct = new this.productModel({
      ...createProductDto,
      vendorId: user._id,
    });

    return newProduct.save();
  }

  async findAll(queryProductsDto: QueryProductsDto, user?: User): Promise<Product[]> {
    const { category, minPrice, maxPrice, search } = queryProductsDto;
    
    // Base query
    const query: any = {};
    
    // Apply filters if provided
    if (category) {
      query.category = category;
    }
    
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) {
        query.price.$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        query.price.$lte = maxPrice;
      }
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    // If user is a vendor, only return their products
    if (user && user.role === UserRole.VENDOR) {
      query.vendorId = user._id;
    }
    
    return this.productModel.find(query).exec();
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productModel.findById(id).exec();
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: User): Promise<Product> {
    // Find the product first
    const product = await this.findOne(id);
    
    // Check if user is the vendor who owns this product
    if (user.role === UserRole.VENDOR && product.vendorId.toString() !== user._id.toString()) {
      throw new ForbiddenException('You can only update your own products');
    }
    
    // Admin can update any product
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.VENDOR) {
      throw new ForbiddenException('You do not have permission to update products');
    }
    
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, updateProductDto, { new: true })
      .exec();
      
    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    
    return updatedProduct;
  }

  async remove(id: string, user: User): Promise<Product> {
    // Find the product first
    const product = await this.findOne(id);
    
    // Check if user is the vendor who owns this product
    if (user.role === UserRole.VENDOR && product.vendorId.toString() !== user._id.toString()) {
      throw new ForbiddenException('You can only delete your own products');
    }
    
    // Admin can delete any product
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.VENDOR) {
      throw new ForbiddenException('You do not have permission to delete products');
    }
    
    const deletedProduct = await this.productModel.findByIdAndDelete(id).exec();
    
    if (!deletedProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    
    return deletedProduct;
  }

  async findByVendor(vendorId: string): Promise<Product[]> {
    return this.productModel.find({ vendorId }).exec();
  }

  async getProductsInStock(ids: string[]): Promise<Product[]> {
    return this.productModel.find({
      _id: { $in: ids },
      stock: { $gt: 0 }
    }).exec();
  }

  async updateStock(productId: string, quantity: number): Promise<Product> {
    const product = await this.productModel.findById(productId);
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    
    if (product.stock < quantity) {
      throw new ForbiddenException(`Not enough stock for product ${product.name}`);
    }
    
    product.stock -= quantity;
    return product.save();
  }

  async getLowStockProducts(vendorId: string, threshold: number = 5): Promise<Product[]> {
    return this.productModel.find({
      vendorId,
      stock: { $lte: threshold }
    }).exec();
  }
}