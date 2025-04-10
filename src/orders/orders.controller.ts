import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, QueryOrdersDto } from './dto/query-orders.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  create(@Body() createOrderDto: CreateOrderDto, @Req() req) {
    return this.ordersService.create(createOrderDto, req.user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query() queryOrdersDto: QueryOrdersDto, @Req() req) {
    return this.ordersService.findAll(queryOrdersDto, req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @Req() req) {
    return this.ordersService.findOne(id, req.user);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Req() req,
  ) {
    return this.ordersService.updateOrderStatus(id, status, req.user);
  }
}