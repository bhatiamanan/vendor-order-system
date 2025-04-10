export interface VendorRevenue {
  vendorId: string;
  vendorName: string;
  totalRevenue: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  vendorId: string;
  vendorName: string;
  totalSales: number;
  revenue: number;
}

export interface DailySales {
  date: string;
  totalSales: number;
  orderCount: number;
}

export interface LowStockItem {
  productId: string;
  name: string;
  stock: number;
  category: string;
}

export interface AverageOrderValue {
  averageOrderValue: number;
  totalOrders: number;
  totalRevenue: number;
}