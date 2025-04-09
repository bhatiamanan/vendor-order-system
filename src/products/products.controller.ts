import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UserRole } from '../users/schemas/user.schema';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  create(@Body() createProductDto: CreateProductDto, @Req() req) {
    return this.productsService.create(createProductDto, req.user);
  }

  @Get()
  async findAll(@Query() queryProductsDto: QueryProductsDto, @Req() req) {
    // If authenticated, pass the user for filtering
    const user = req.user || null;
    return this.productsService.findAll(queryProductsDto, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Req() req,
  ) {
    return this.productsService.update(id, updateProductDto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  remove(@Param('id') id: string, @Req() req) {
    return this.productsService.remove(id, req.user);
  }

  @Get('vendor/:vendorId')
  findByVendor(@Param('vendorId') vendorId: string) {
    return this.productsService.findByVendor(vendorId);
  }

  @Get('inventory/low-stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  getLowStockProducts(@Req() req, @Query('threshold') threshold: number) {
    return this.productsService.getLowStockProducts(
      req.user._id,
      threshold || 5,
    );
  }
}