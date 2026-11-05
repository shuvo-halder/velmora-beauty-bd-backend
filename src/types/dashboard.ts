export type DateRangePreset = 
  | "today" 
  | "yesterday" 
  | "7d" 
  | "30d" 
  | "this_month" 
  | "last_month" 
  | "this_year" 
  | "custom";

export interface DashboardQueryParams {
  range?: DateRangePreset;
  from?: string;
  to?: string;
  limit?: number;
}

export interface KPIMetric {
  total?: number;
  currentPeriod?: number;
  previousPeriod?: number;
  current?: number;
  previous?: number;
  count?: number;
  periodCount?: number;
  growth?: {
    value: number;
    isPositive: boolean;
  };
}

export interface DashboardKPIs {
  revenue: {
    total: number;
    currentPeriod: number;
    previousPeriod: number;
    growth: { value: number; isPositive: boolean };
  };
  orders: {
    total: number;
    currentPeriod: number;
    previousPeriod: number;
    growth: { value: number; isPositive: boolean };
  };
  customers: {
    total: number;
    currentPeriod: number;
    previousPeriod: number;
    growth: { value: number; isPositive: boolean };
  };
  products: {
    total: number;
    active: number;
    outOfStock: number;
    lowStock: number;
    inStock: number;
  };
  pendingOrders: {
    count: number;
  };
  pendingReturns: {
    count: number;
    periodCount: number;
  };
  pendingRefunds: {
    count: number;
    periodCount: number;
  };
  aov: {
    current: number;
    previous: number;
    growth: { value: number; isPositive: boolean };
  };
}

export interface RevenueOrderTrendPoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
}

export interface CustomerGrowthTrendPoint {
  date: string;
  label: string;
  newCustomers: number;
}

export interface StatusDistributionPoint {
  status: string;
  count: number;
  amount?: number;
}

export interface CategorySalesPoint {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  itemsSold: number;
  salesAmount: number;
}

export interface TopProductPoint {
  productId: string;
  name: string;
  sku: string;
  price: number;
  unitsSold: number;
  revenue: number;
  orderCount: number;
  image?: string;
}

export interface PaymentMethodPoint {
  provider: string;
  count: number;
  amount: number;
}

export interface PaymentHealthData {
  totalTransactions: number;
  successful: number;
  failed: number;
  pending: number;
  successRate: number;
}

export interface DashboardCharts {
  revenueAndOrdersTrend: RevenueOrderTrendPoint[];
  customerGrowthTrend: CustomerGrowthTrendPoint[];
  orderStatuses: StatusDistributionPoint[];
  categorySales: CategorySalesPoint[];
  topProducts: TopProductPoint[];
  paymentMethods: PaymentMethodPoint[];
  paymentStatuses: StatusDistributionPoint[];
  paymentHealth: PaymentHealthData;
  shipmentStatuses: StatusDistributionPoint[];
  returnStatuses: StatusDistributionPoint[];
  refundStatuses: StatusDistributionPoint[];
}

export interface DashboardOverviewResponse {
  dateRange: {
    from: string;
    to: string;
    prevFrom: string;
    prevTo: string;
    rangeLabel: string;
  };
  currency: string;
  kpis: DashboardKPIs;
  charts: DashboardCharts;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerId: string | null;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  itemCount: number;
  createdAt: string;
}

export interface RecentCustomer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

export interface InventoryAlertItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  variantId?: string | null;
  quantityAvailable: number;
  lowStockThreshold: number;
  severity: "OUT_OF_STOCK" | "CRITICAL" | "LOW_STOCK";
  image?: string;
}
