import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { DollarSign, ShoppingCart, Users, Package, Activity, Eye, Percent, MousePointer2 } from 'lucide-react';
import { 
  getOverviewMetrics, 
  getRevenueMetrics, 
  getOrdersMetrics, 
  getProductsMetrics,
  getCategoryMetrics,
  getGa4Metrics,
  getBrandMetrics
} from '../services/analytics.service';

export function Analytics() {
  const { data: overview, isLoading: overviewLoading, isError: overviewError } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: getOverviewMetrics
  });

  const { data: revenue, isLoading: revenueLoading, isError: revenueError } = useQuery({
    queryKey: ['analytics-revenue'],
    queryFn: getRevenueMetrics
  });

  const { data: orders, isLoading: ordersLoading, isError: ordersError } = useQuery({
    queryKey: ['analytics-orders'],
    queryFn: getOrdersMetrics
  });

  const { data: products, isLoading: productsLoading, isError: productsError } = useQuery({
    queryKey: ['analytics-products'],
    queryFn: getProductsMetrics
  });

  const { data: categories, isLoading: categoriesLoading, isError: categoriesError } = useQuery({
    queryKey: ['analytics-categories'],
    queryFn: getCategoryMetrics
  });

  const { data: brands, isLoading: brandsLoading, isError: brandsError } = useQuery({
    queryKey: ['analytics-brands'],
    queryFn: getBrandMetrics
  });

  const { data: ga4, isLoading: ga4Loading, isError: ga4Error } = useQuery({
    queryKey: ['analytics-ga4'],
    queryFn: getGa4Metrics,
    staleTime: 5 * 60 * 1000 // GA4 data might take longer, cache it for 5 min
  });

  const isLoading = overviewLoading || revenueLoading || ordersLoading || productsLoading || categoriesLoading || ga4Loading || brandsLoading;
  const isError = overviewError || revenueError || ordersError || productsError || categoriesError;

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
      Loading analytics data...
    </div>;
  }

  if (isError) {
    return <div className="p-8 text-center text-destructive bg-destructive/10 rounded-lg border border-destructive/20 mt-8">
      <h3 className="text-xl font-bold mb-2">Error Loading Analytics</h3>
      <p>Failed to load dashboard metrics. Please try again later.</p>
    </div>;
  }

  // Format data for charts
  const revenueTrend = revenue?.trend || [];
  const ordersTrend = orders?.trend || [];
  const topProducts = products?.topProducts || [];
  const categorySales = categories?.categoryData || [];
  const brandSales = brands || [];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Store Overview</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">৳{overview?.totalRevenue?.toFixed(2) || '0.00'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.totalOrders || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.totalCustomers || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.totalProducts || 0}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Google Analytics 4 (Last 30 Days)
        </h3>
        {ga4Error ? (
          <div className="p-4 text-sm text-amber-600 bg-amber-50 rounded-md border border-amber-200">
            Failed to load GA4 data. Please check your GOOGLE_CREDENTIALS_JSON and GA_PROPERTY_ID configuration.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card className="bg-slate-50 dark:bg-slate-900 border-blue-100 dark:border-blue-900">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ga4?.activeUsers?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-50 dark:bg-slate-900 border-blue-100 dark:border-blue-900">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sessions</CardTitle>
                <MousePointer2 className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ga4?.sessions?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-50 dark:bg-slate-900 border-blue-100 dark:border-blue-900">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Page Views</CardTitle>
                <Eye className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ga4?.pageViews?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-50 dark:bg-slate-900 border-blue-100 dark:border-blue-900">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <Percent className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ga4?.conversionRate?.toFixed(2) || '0.00'}%</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-50 dark:bg-slate-900 border-blue-100 dark:border-blue-900">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">GA4 Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">৳{ga4?.revenue?.toFixed(2) || '0.00'}</div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Revenue Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" fontSize={12} tickMargin={10} />
                  <YAxis fontSize={12} tickFormatter={(value) => `৳${value}`} />
                  <RechartsTooltip formatter={(value: number) => [`৳${value.toFixed(2)}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Orders Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ordersTrend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" fontSize={12} tickMargin={10} />
                  <YAxis fontSize={12} />
                  <RechartsTooltip formatter={(value: number) => [value, 'Orders']} />
                  <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Top Products (By Quantity Sold)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={true} vertical={false} />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="name" type="category" fontSize={12} width={120} />
                  <RechartsTooltip />
                  <Bar dataKey="totalQuantitySold" fill="#f59e0b" name="Quantity Sold" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Category Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categorySales}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickMargin={10} />
                  <YAxis fontSize={12} tickFormatter={(value) => `৳${value}`} />
                  <RechartsTooltip formatter={(value: number) => [`৳${value.toFixed(2)}`, 'Sales']} />
                  <Bar dataKey="sales" fill="#8b5cf6" name="Sales" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Brand Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={brandSales}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickMargin={10} />
                  <YAxis fontSize={12} tickFormatter={(value) => `${value}`} />
                  <RechartsTooltip formatter={(value: number) => [`${value.toFixed(2)}`, 'Sales']} />
                  <Bar dataKey="sales" fill="#ec4899" name="Sales" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
