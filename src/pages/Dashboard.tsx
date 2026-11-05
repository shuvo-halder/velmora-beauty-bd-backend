import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Users,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  Lock,
  ArrowRight,
  RefreshCw,
  Calendar,
  AlertTriangle,
  Package,
  RotateCcw,
  Undo2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  CreditCard,
  Layers,
  ChevronRight,
  ExternalLink,
  Percent,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import {
  getDashboardOverview,
  getDashboardRecentOrders,
  getDashboardRecentCustomers,
  getDashboardInventoryAlerts,
} from '../services/dashboard.service';
import { getAuditLogs, AuditLog } from '../services/auditLog.service';
import { DateRangePreset } from '../types/dashboard';

// Color Palette for Visual Consistency
const STATUS_COLORS: Record<string, string> = {
  Pending: '#f59e0b',
  pending: '#f59e0b',
  Processing: '#3b82f6',
  processing: '#3b82f6',
  Confirmed: '#06b6d4',
  confirmed: '#06b6d4',
  Shipped: '#8b5cf6',
  shipped: '#8b5cf6',
  Delivered: '#10b981',
  delivered: '#10b981',
  Completed: '#10b981',
  completed: '#10b981',
  Cancelled: '#ef4444',
  cancelled: '#ef4444',
  Returned: '#f97316',
  returned: '#f97316',
};

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  COD: '#64748b',
  BKASH: '#e11d48',
  NAGAD: '#ea580c',
  SSLCOMMERZ: '#2563eb',
  STRIPE: '#6366f1',
};

const CHART_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

const formatBDT = (amount: number = 0) => {
  return `৳${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRangePreset>('30d');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  const [trendMetric, setTrendMetric] = useState<'both' | 'revenue' | 'orders'>('both');

  // Main Dashboard Overview Query
  const {
    data: overview,
    isLoading: isOverviewLoading,
    isError: isOverviewError,
    error: overviewError,
    refetch: refetchOverview,
    isFetching: isOverviewFetching,
  } = useQuery({
    queryKey: ['dashboard-overview', dateRange, customFrom, customTo],
    queryFn: () =>
      getDashboardOverview({
        range: dateRange,
        from: dateRange === 'custom' ? customFrom : undefined,
        to: dateRange === 'custom' ? customTo : undefined,
      }),
    staleTime: 30 * 1000,
  });

  // Recent Orders Query
  const { data: recentOrders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ['dashboard-recent-orders'],
    queryFn: () => getDashboardRecentOrders(8),
    staleTime: 30 * 1000,
  });

  // Recent Customers Query
  const { data: recentCustomers = [], isLoading: isCustomersLoading } = useQuery({
    queryKey: ['dashboard-recent-customers'],
    queryFn: () => getDashboardRecentCustomers(6),
    staleTime: 30 * 1000,
  });

  // Inventory Alerts Query
  const { data: inventoryAlerts = [], isLoading: isAlertsLoading } = useQuery({
    queryKey: ['dashboard-inventory-alerts'],
    queryFn: () => getDashboardInventoryAlerts(6),
    staleTime: 30 * 1000,
  });

  // Audit Logs Query
  const { data: auditData, isLoading: isAuditLoading } = useQuery({
    queryKey: ['dashboard-audit-logs'],
    queryFn: () => getAuditLogs({ limit: 6 }),
    staleTime: 30 * 1000,
  });

  const handlePresetChange = (preset: DateRangePreset) => {
    setDateRange(preset);
    if (preset === 'custom') {
      setIsCustomDateOpen(true);
    } else {
      setIsCustomDateOpen(false);
    }
  };

  const handleApplyCustomDates = (e: React.FormEvent) => {
    e.preventDefault();
    if (customFrom && customTo) {
      setDateRange('custom');
      refetchOverview();
    }
  };

  const handleRefreshAll = () => {
    refetchOverview();
  };

  const kpis = overview?.kpis;
  const charts = overview?.charts;
  const dateRangeInfo = overview?.dateRange;

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/50 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Store Performance &amp; Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time multi-dimensional overview of revenue, operations, catalog, and customers.
          </p>
        </div>

        {/* Date Range Controls & Refresh Action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-sm">
            <button
              type="button"
              onClick={() => handlePresetChange('today')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                dateRange === 'today'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('yesterday')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                dateRange === 'yesterday'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('7d')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                dateRange === '7d'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('30d')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                dateRange === '30d'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('this_month')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                dateRange === 'this_month'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('last_month')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors hidden lg:inline-block ${
                dateRange === 'last_month'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('this_year')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors hidden sm:inline-block ${
                dateRange === 'this_year'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              This Year
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('custom')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                dateRange === 'custom'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Custom
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isOverviewFetching}
            className="h-9 px-3 gap-1.5 shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isOverviewFetching ? 'animate-spin text-primary' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Custom Date Range Pop-in Form */}
      {isCustomDateOpen && (
        <form
          onSubmit={handleApplyCustomDates}
          className="flex flex-wrap items-center gap-3 p-3 bg-muted/40 border border-border rounded-lg text-sm"
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-xs">From:</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              required
              className="px-2.5 py-1 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-xs">To:</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              required
              className="px-2.5 py-1 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button type="submit" size="sm" className="h-7 text-xs px-3">
            Apply Custom Filter
          </Button>
          {dateRangeInfo && (
            <span className="text-xs text-muted-foreground ml-auto">
              Comparing against previous period of equal length
            </span>
          )}
        </form>
      )}

      {/* Error Banner */}
      {isOverviewError && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Failed to fetch dashboard metrics</p>
              <p className="text-xs text-destructive/80 mt-0.5">
                {(overviewError as any)?.response?.data?.message || (overviewError as any)?.message || 'Internal connection error.'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchOverview()}>
            Retry
          </Button>
        </div>
      )}

      {/* 1. Primary Financial & Operational KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Total & Period Revenue */}
        <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Period Revenue
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isOverviewLoading ? (
              <div className="space-y-2">
                <div className="h-7 w-28 bg-muted animate-pulse rounded" />
                <div className="h-4 w-36 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {formatBDT(kpis?.revenue.currentPeriod)}
                </div>
                <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-border/40 text-xs">
                  <span
                    className={`inline-flex items-center gap-0.5 font-semibold ${
                      kpis?.revenue.growth.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {kpis?.revenue.growth.isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {kpis?.revenue.growth.value}% vs prior
                  </span>
                  <span className="text-muted-foreground truncate" title={`All-time: ${formatBDT(kpis?.revenue.total)}`}>
                    All-Time: {formatBDT(kpis?.revenue.total)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* KPI 2: Total Orders */}
        <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Orders
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isOverviewLoading ? (
              <div className="space-y-2">
                <div className="h-7 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {kpis?.orders.currentPeriod?.toLocaleString() || 0}
                </div>
                <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-border/40 text-xs">
                  <span
                    className={`inline-flex items-center gap-0.5 font-semibold ${
                      kpis?.orders.growth.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {kpis?.orders.growth.isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {kpis?.orders.growth.value}% vs prior
                  </span>
                  <span className="text-muted-foreground">
                    All-Time: {kpis?.orders.total?.toLocaleString() || 0}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* KPI 3: Customers & Growth */}
        <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              New Customers
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isOverviewLoading ? (
              <div className="space-y-2">
                <div className="h-7 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  +{kpis?.customers.currentPeriod?.toLocaleString() || 0}
                </div>
                <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-border/40 text-xs">
                  <span
                    className={`inline-flex items-center gap-0.5 font-semibold ${
                      kpis?.customers.growth.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {kpis?.customers.growth.isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {kpis?.customers.growth.value}% vs prior
                  </span>
                  <span className="text-muted-foreground">
                    Total: {kpis?.customers.total?.toLocaleString() || 0}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* KPI 4: Average Order Value (AOV) */}
        <Card className="relative overflow-hidden border-border/80 shadow-xs hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Average Order Value
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Percent className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isOverviewLoading ? (
              <div className="space-y-2">
                <div className="h-7 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {formatBDT(kpis?.aov.current)}
                </div>
                <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-border/40 text-xs">
                  <span
                    className={`inline-flex items-center gap-0.5 font-semibold ${
                      kpis?.aov.growth.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {kpis?.aov.growth.isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {kpis?.aov.growth.value}% vs prior
                  </span>
                  <span className="text-muted-foreground">
                    Prior: {formatBDT(kpis?.aov.previous)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 2. Operational Action Queues (Pending Orders, Returns, Refunds, Stock Health) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pending Orders Queue */}
        <Link to="/orders" className="block group">
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Pending Orders</p>
                <p className="text-lg font-bold text-foreground">
                  {kpis?.pendingOrders.count ?? 0}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Pending Returns Queue */}
        <Link to="/admin/returns" className="block group">
          <div className="p-3.5 rounded-xl border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Pending Returns</p>
                <p className="text-lg font-bold text-foreground">
                  {kpis?.pendingReturns.count ?? 0}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Pending Refunds Queue */}
        <Link to="/admin/refunds" className="block group">
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                <Undo2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Pending Refunds</p>
                <p className="text-lg font-bold text-foreground">
                  {kpis?.pendingRefunds.count ?? 0}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        {/* Inventory Stock Status */}
        <Link to="/inventory" className="block group">
          <div className="p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-all flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Catalog &amp; Stock</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold text-foreground">
                    {kpis?.products.active ?? 0} Active
                  </span>
                  {(kpis?.products.outOfStock ?? 0) > 0 && (
                    <Badge variant="destructive" className="px-1.5 py-0 text-[10px] h-4">
                      {kpis?.products.outOfStock} OOS
                    </Badge>
                  )}
                  {(kpis?.products.lowStock ?? 0) > 0 && (
                    <Badge variant="warning" className="px-1.5 py-0 text-[10px] h-4">
                      {kpis?.products.lowStock} Low
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>

      {/* 3. Main Revenue & Order Volume Trends Section */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Sales &amp; Orders Trajectory
            </CardTitle>
            <CardDescription className="text-xs">
              Chronological aggregation of order values and checkout volumes for the selected time window.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setTrendMetric('both')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                trendMetric === 'both' ? 'bg-background shadow-xs font-semibold text-foreground' : 'text-muted-foreground'
              }`}
            >
              Combined
            </button>
            <button
              type="button"
              onClick={() => setTrendMetric('revenue')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                trendMetric === 'revenue' ? 'bg-background shadow-xs font-semibold text-foreground' : 'text-muted-foreground'
              }`}
            >
              Revenue (৳)
            </button>
            <button
              type="button"
              onClick={() => setTrendMetric('orders')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                trendMetric === 'orders' ? 'bg-background shadow-xs font-semibold text-foreground' : 'text-muted-foreground'
              }`}
            >
              Orders (#)
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[320px] w-full">
            {isOverviewLoading ? (
              <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mr-2" />
                Aggregating time-series data...
              </div>
            ) : !charts?.revenueAndOrdersTrend || charts.revenueAndOrdersTrend.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                No orders recorded in this date range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={charts.revenueAndOrdersTrend}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  {(trendMetric === 'both' || trendMetric === 'revenue') && (
                    <YAxis
                      yAxisId="revenueAxis"
                      orientation="left"
                      stroke="#10b981"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `৳${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                  )}
                  {(trendMetric === 'both' || trendMetric === 'orders') && (
                    <YAxis
                      yAxisId="ordersAxis"
                      orientation={trendMetric === 'both' ? 'right' : 'left'}
                      stroke="#3b82f6"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                  )}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value: any, name: any) => {
                      if (name === 'Revenue (৳)') return [formatBDT(Number(value)), name];
                      return [value, name];
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  {(trendMetric === 'both' || trendMetric === 'revenue') && (
                    <Area
                      yAxisId="revenueAxis"
                      type="monotone"
                      name="Revenue (৳)"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  )}
                  {(trendMetric === 'both' || trendMetric === 'orders') && (
                    <Area
                      yAxisId="ordersAxis"
                      type="monotone"
                      name="Orders Count"
                      dataKey="orders"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorOrders)"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Dual Grid: Order Status Distribution & Payment Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Status Distribution Donut */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Order Status Breakdown</span>
              <Badge variant="outline" className="text-xs font-normal">
                {charts?.orderStatuses.reduce((acc, c) => acc + c.count, 0) || 0} Total
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Proportion of order lifecycle stages across the period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              {isOverviewLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Loading status distribution...
                </div>
              ) : !charts?.orderStatuses || charts.orderStatuses.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No orders recorded for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.orderStatuses}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {charts.orderStatuses.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={STATUS_COLORS[entry.status] || CHART_PALETTE[index % CHART_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(val: any, name: any, item: any) => [
                        `${val} orders (${formatBDT(item.payload.amount)})`,
                        name,
                      ]}
                    />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods & Payment Health */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Payment Gateway Breakdown
              </span>
              <Badge
                variant={
                  (charts?.paymentHealth.successRate ?? 100) >= 90
                    ? 'success'
                    : (charts?.paymentHealth.successRate ?? 100) >= 70
                    ? 'warning'
                    : 'destructive'
                }
                className="text-xs"
              >
                {charts?.paymentHealth.successRate ?? 100}% Success Rate
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Transaction volumes and payment provider distribution.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border/60 text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Tx</p>
                <p className="text-base font-bold text-foreground">
                  {charts?.paymentHealth.totalTransactions ?? 0}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-semibold">Paid</p>
                <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                  {charts?.paymentHealth.successful ?? 0}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                <p className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-semibold">Pending</p>
                <p className="text-base font-bold text-amber-700 dark:text-amber-400">
                  {charts?.paymentHealth.pending ?? 0}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center">
                <p className="text-[10px] text-rose-700 dark:text-rose-400 uppercase font-semibold">Failed</p>
                <p className="text-base font-bold text-rose-700 dark:text-rose-400">
                  {charts?.paymentHealth.failed ?? 0}
                </p>
              </div>
            </div>

            <div className="h-[180px] w-full">
              {isOverviewLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Loading payment analytics...
                </div>
              ) : !charts?.paymentMethods || charts.paymentMethods.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No payment transactions recorded in this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.paymentMethods}
                      dataKey="amount"
                      nameKey="provider"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {charts.paymentMethods.map((entry, index) => (
                        <Cell
                          key={`pm-${index}`}
                          fill={PAYMENT_METHOD_COLORS[entry.provider] || CHART_PALETTE[index % CHART_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(val: any, name: any, item: any) => [
                        `${formatBDT(Number(val))} (${item.payload.count} tx)`,
                        name,
                      ]}
                    />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Dual Grid: Category Sales & Top Selling Products */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales by Category Bar Chart */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Sales by Category
              </span>
              <Link to="/categories" className="text-xs text-primary hover:underline font-medium">
                View All Categories
              </Link>
            </CardTitle>
            <CardDescription className="text-xs">
              Gross revenue generated grouped by product catalog hierarchy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              {isOverviewLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Aggregating category metrics...
                </div>
              ) : !charts?.categorySales || charts.categorySales.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No category sales recorded.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={charts.categorySales.slice(0, 7)}
                    margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `৳${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: any, name: any, item: any) => [
                        `${formatBDT(Number(value))} (${item.payload.itemsSold} items sold)`,
                        'Sales Amount',
                      ]}
                    />
                    <Bar dataKey="salesAmount" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      {charts.categorySales.slice(0, 7).map((_, index) => (
                        <Cell key={`bar-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Selling Products List */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Top Performing Products
              </span>
              <Link to="/products" className="text-xs text-primary hover:underline font-medium">
                Manage Catalog
              </Link>
            </CardTitle>
            <CardDescription className="text-xs">
              Ranked by quantity dispatched and revenue impact.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isOverviewLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            ) : !charts?.topProducts || charts.topProducts.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No product sales recorded in this period.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {charts.topProducts.slice(0, 5).map((prod, idx) => (
                  <div key={prod.productId} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center font-bold text-xs shrink-0 text-muted-foreground">
                        #{idx + 1}
                      </div>
                      {prod.image ? (
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="h-9 w-9 rounded-md object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                          <Package className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link
                          to={`/products/${prod.productId}`}
                          className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block"
                        >
                          {prod.name}
                        </Link>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          SKU: {prod.sku} • {prod.unitsSold} units sold
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">{formatBDT(prod.revenue)}</p>
                      <p className="text-[11px] text-muted-foreground">{prod.orderCount} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 6. Dual Grid: Customer Growth & Fulfillment/Shipments */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Customer Growth Trend */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Customer Registrations Trend
              </span>
              <Badge variant="outline" className="text-xs font-normal">
                {charts?.customerGrowthTrend.reduce((acc, c) => acc + c.newCustomers, 0) || 0} New
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Daily customer acquisition pace over the selected date range.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full">
              {isOverviewLoading ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Loading customer registration trends...
                </div>
              ) : !charts?.customerGrowthTrend || charts.customerGrowthTrend.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No registration events recorded.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={charts.customerGrowthTrend}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                    <XAxis
                      dataKey="label"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(val: any) => [`${val} new customers`, 'Registrations']}
                    />
                    <Line
                      type="monotone"
                      dataKey="newCustomers"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#6366f1' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fulfillment & Shipments Status */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                Shipment &amp; Logistics Overview
              </span>
              <Link to="/admin/shipments" className="text-xs text-primary hover:underline font-medium">
                View All Shipments
              </Link>
            </CardTitle>
            <CardDescription className="text-xs">
              Fulfillment statuses for outbound orders in the current period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isOverviewLoading ? (
              <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                Loading shipment statuses...
              </div>
            ) : !charts?.shipmentStatuses || charts.shipmentStatuses.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-xs text-muted-foreground gap-1.5">
                <Truck className="h-8 w-8 text-muted-foreground/40" />
                <p>No shipments logged for this period.</p>
              </div>
            ) : (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={charts.shipmentStatuses}
                    margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.6} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <YAxis
                      dataKey="status"
                      type="category"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(val: any) => [`${val} shipments`, 'Count']}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                      {charts.shipmentStatuses.map((_, index) => (
                        <Cell key={`ship-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 7. Recent Orders Table (Dynamic Database Data) */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Recent Customer Orders
            </CardTitle>
            <CardDescription className="text-xs">
              Latest transactions placed on the storefront platform.
            </CardDescription>
          </div>
          <Link to="/orders">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 gap-1 text-xs">
              View All Orders
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isOrdersLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
              Loading recent orders...
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No orders found in the database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40 border-y border-border/60">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Order #</th>
                    <th className="px-3 py-2.5 font-semibold">Customer</th>
                    <th className="px-3 py-2.5 font-semibold">Total Amount</th>
                    <th className="px-3 py-2.5 font-semibold">Payment Status</th>
                    <th className="px-3 py-2.5 font-semibold">Order Status</th>
                    <th className="px-3 py-2.5 font-semibold">Date</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium">
                  {recentOrders.map((order) => {
                    const statusKey = order.status || 'Pending';
                    return (
                      <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-3 font-mono font-bold text-foreground">
                          <Link to={`/orders/${order.id}`} className="hover:text-primary transition-colors">
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-foreground">{order.customerName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{order.customerEmail}</p>
                        </td>
                        <td className="px-3 py-3 font-bold text-foreground">
                          {formatBDT(order.totalAmount)}
                        </td>
                        <td className="px-3 py-3">
                          <Badge
                            variant={
                              order.paymentStatus === 'Paid' || order.paymentStatus === 'PAID'
                                ? 'success'
                                : order.paymentStatus === 'Failed' || order.paymentStatus === 'FAILED'
                                ? 'destructive'
                                : 'warning'
                            }
                            className="px-2 py-0 text-[10px]"
                          >
                            {order.paymentStatus}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{
                              backgroundColor: `${STATUS_COLORS[statusKey] || '#64748b'}20`,
                              color: STATUS_COLORS[statusKey] || '#64748b',
                            }}
                          >
                            {statusKey}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(order.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Link to={`/orders/${order.id}`}>
                            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 8. Dual Grid: Recent Customers & Inventory Low Stock Alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Customers */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Recently Registered Customers
              </CardTitle>
              <CardDescription className="text-xs">
                New accounts created on the platform.
              </CardDescription>
            </div>
            <Link to="/customers">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 gap-1 text-xs">
                All Customers
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isCustomersLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading customers...</div>
            ) : recentCustomers.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">No customer records found.</div>
            ) : (
              <div className="divide-y divide-border/60">
                {recentCustomers.map((cust) => (
                  <div key={cust.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {cust.name ? cust.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/customers/${cust.id}`}
                          className="text-sm font-semibold text-foreground hover:text-primary transition-colors block truncate"
                        >
                          {cust.name}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate">{cust.email}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-foreground">
                        {cust.orderCount} {cust.orderCount === 1 ? 'order' : 'orders'}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {formatBDT(cust.totalSpent)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock & Inventory Critical Alerts */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Inventory Stock Alerts
              </CardTitle>
              <CardDescription className="text-xs">
                Items requiring reorder or at critical warehouse capacity.
              </CardDescription>
            </div>
            <Link to="/inventory">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 gap-1 text-xs">
                Manage Stock
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isAlertsLoading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Scanning inventory levels...</div>
            ) : inventoryAlerts.length === 0 ? (
              <div className="py-8 text-center text-xs text-emerald-600 dark:text-emerald-400 flex flex-col items-center gap-1.5">
                <CheckCircle2 className="h-6 w-6" />
                <p className="font-semibold">All inventory levels are healthy.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {inventoryAlerts.map((alert) => (
                  <div key={alert.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {alert.image ? (
                        <img
                          src={alert.image}
                          alt={alert.productName}
                          className="h-8 w-8 rounded-md object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link
                          to={`/products/${alert.productId}`}
                          className="text-sm font-semibold text-foreground hover:text-primary transition-colors block truncate"
                        >
                          {alert.productName}
                        </Link>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          SKU: {alert.sku} • Threshold: {alert.lowStockThreshold}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-bold text-foreground">
                        {alert.quantityAvailable} in stock
                      </span>
                      <Badge
                        variant={alert.severity === 'OUT_OF_STOCK' ? 'destructive' : 'warning'}
                        className="text-[10px] px-2 py-0"
                      >
                        {alert.severity === 'OUT_OF_STOCK'
                          ? 'Out of Stock'
                          : alert.severity === 'CRITICAL'
                          ? 'Critical'
                          : 'Low Stock'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 9. Real-Time Admin Security & Audit Event Ledger */}
      <Card className="w-full border-border/80 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              Administrative Audit &amp; Security Ledger
            </CardTitle>
            <CardDescription className="text-xs">
              Live audit trail of administrative modifications, role operations, and system events.
            </CardDescription>
          </div>
          <Link to="/admin/audit-logs">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs">
              View All Audit Logs
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isAuditLoading ? (
            <div className="py-6 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
              Streaming security logs...
            </div>
          ) : !auditData?.logs || auditData.logs.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-xs">
              No recent administrative logs logged.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {auditData.logs.map((event: AuditLog) => {
                const isFailed =
                  event.action.includes('FAILED') ||
                  event.action.includes('ALERT') ||
                  event.action.includes('LOCKED') ||
                  event.action.includes('REVOKED') ||
                  event.action.includes('DENIED');
                const isSuccess =
                  event.action.includes('SUCCESS') ||
                  event.action.includes('CREATED') ||
                  event.action.includes('ENABLED');

                return (
                  <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`p-1.5 rounded-full mt-0.5 shrink-0 ${
                          isFailed
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : isSuccess
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {isFailed ? (
                          <ShieldAlert className="h-3.5 w-3.5" />
                        ) : isSuccess ? (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        ) : (
                          <Lock className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">{event.action}</span>
                          <span className="text-[11px] font-mono text-muted-foreground">({event.entityType})</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          Actor:{' '}
                          <strong className="text-foreground font-medium">
                            {event.user ? `${event.user.firstName} ${event.user.lastName || ''}`.trim() : 'System'}
                          </strong>{' '}
                          {event.user?.email && `(${event.user.email})`}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center text-[11px] text-muted-foreground shrink-0">
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] sm:mb-0.5">
                        {event.ipAddress || 'Localhost'}
                      </span>
                      <span>{new Date(event.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
