import { Controller, Get, Query, UseGuards, Req, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/schemas/user.schema';
import { AnalyticsService } from '../services/analytics.service';
import { AdminAnalyticsQueryDto, VendorAnalyticsQueryDto } from '../dto/analytics-query.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}
  
  // Admin routes
  @Get('admin/revenue-per-vendor')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getRevenuePerVendor(@Query() query: AdminAnalyticsQueryDto) {
    return this.analyticsService.getRevenuePerVendor(query.days);
  }
  
  @Get('admin/top-products')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getTopProducts() {
    return this.analyticsService.getTopProducts();
  }
  
  @Get('admin/average-order-value')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getAverageOrderValue() {
    return this.analyticsService.getAverageOrderValue();
  }
  
  // Vendor routes
  @Get('vendor/daily-sales')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  getVendorDailySales(@Query() query: VendorAnalyticsQueryDto, @Req() req) {
    return this.analyticsService.getVendorDailySales(req.user._id, query.days);
  }
  
  @Get('vendor/low-stock')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  getLowStockItems(@Req() req) {
    return this.analyticsService.getLowStockItems(req.user._id);
  }
}