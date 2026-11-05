import { prisma } from "../config/db";
import { DashboardQuery } from "../validators/dashboard.validator";

export interface DateRange {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  rangeLabel: string;
}

export class DashboardService {
  /**
   * Calculates the current and corresponding prior comparison date range
   */
  public static calculateDateRange(query: DashboardQuery): DateRange {
    const now = new Date();
    let from: Date;
    let to: Date = new Date(now);

    const range = query.range || "30d";

    if (query.from && query.to) {
      from = new Date(query.from);
      to = new Date(query.to);
      // Ensure 'to' covers the end of the day if time not specified
      if (!query.to.includes("T")) {
        to.setHours(23, 59, 59, 999);
      }
      if (!query.from.includes("T")) {
        from.setHours(0, 0, 0, 0);
      }
    } else {
      switch (range) {
        case "today": {
          from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          break;
        }
        case "yesterday": {
          from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
          to = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
          break;
        }
        case "7d": {
          from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          from.setHours(0, 0, 0, 0);
          break;
        }
        case "30d": {
          from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          from.setHours(0, 0, 0, 0);
          break;
        }
        case "this_month": {
          from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          break;
        }
        case "last_month": {
          from = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
          to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          break;
        }
        case "this_year": {
          from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
          break;
        }
        default: {
          from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          from.setHours(0, 0, 0, 0);
        }
      }
    }

    // Compute identical length prior period for comparison
    const durationMs = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - durationMs);

    return {
      from,
      to,
      prevFrom,
      prevTo,
      rangeLabel: range,
    };
  }

  /**
   * Helper to calculate percentage growth / change
   */
  private static calculateGrowth(current: number, previous: number): { value: number; isPositive: boolean } {
    if (previous === 0) {
      return {
        value: current > 0 ? 100 : 0,
        isPositive: current >= 0,
      };
    }
    const diff = ((current - previous) / previous) * 100;
    return {
      value: Math.round(Math.abs(diff) * 10) / 10,
      isPositive: diff >= 0,
    };
  }

  /**
   * Aggregates all comprehensive metrics for the Admin Dashboard
   */
  public static async getOverview(query: DashboardQuery) {
    const { from, to, prevFrom, prevTo, rangeLabel } = this.calculateDateRange(query);

    // Cancelled / deleted order filter criteria
    const validOrderWhere = {
      deletedAt: null,
      status: { notIn: ["Cancelled", "cancelled", "CANCELLED"] },
    };

    // Parallel aggregate queries across PostgreSQL models
    const [
      // 1. All-time metrics
      allTimeRevenueAgg,
      allTimeOrdersCount,
      totalCustomersCount,
      totalProductsCount,
      activeProductsCount,

      // 2. Current period KPI aggregations
      currentRevenueAgg,
      previousRevenueAgg,
      currentOrdersCount,
      previousOrdersCount,
      currentValidOrdersCount,
      currentCustomersCount,
      previousCustomersCount,

      // 3. Operational Queue counts (Pending items)
      pendingOrdersCount,
      pendingReturnsCount,
      periodReturnsCount,
      pendingRefundsCount,
      periodRefundsCount,

      // 4. Grouped Distributions
      ordersByStatusRaw,
      paymentsByProviderRaw,
      paymentsByStatusRaw,
      shipmentsByStatusRaw,
      returnsByStatusRaw,
      refundsByStatusRaw,

      // 5. Inventory Stock Analysis
      inventories,

      // 6. Time series data (Orders in date range)
      timeSeriesOrders,
      timeSeriesCustomers,

      // 7. Top Selling Products (Aggregated Order Items)
      topOrderItemsAgg,

      // 8. Categories with Product & Sales mapping
      categories,
    ] = await Promise.all([
      // 1. All-time metrics
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: validOrderWhere,
      }),
      prisma.order.count({
        where: { deletedAt: null },
      }),
      prisma.customer.count({
        where: { deletedAt: null },
      }),
      prisma.product.count({
        where: { deletedAt: null },
      }),
      prisma.product.count({
        where: { deletedAt: null, isActive: true },
      }),

      // 2. Period Revenue & Orders
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          ...validOrderWhere,
          createdAt: { gte: from, lte: to },
        },
      }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          ...validOrderWhere,
          createdAt: { gte: prevFrom, lte: prevTo },
        },
      }),
      prisma.order.count({
        where: {
          deletedAt: null,
          createdAt: { gte: from, lte: to },
        },
      }),
      prisma.order.count({
        where: {
          deletedAt: null,
          createdAt: { gte: prevFrom, lte: prevTo },
        },
      }),
      prisma.order.count({
        where: {
          ...validOrderWhere,
          createdAt: { gte: from, lte: to },
        },
      }),
      prisma.customer.count({
        where: {
          deletedAt: null,
          createdAt: { gte: from, lte: to },
        },
      }),
      prisma.customer.count({
        where: {
          deletedAt: null,
          createdAt: { gte: prevFrom, lte: prevTo },
        },
      }),

      // 3. Operational Queues
      prisma.order.count({
        where: {
          deletedAt: null,
          status: { in: ["Pending", "pending", "PENDING"] },
        },
      }),
      prisma.returnRequest.count({
        where: { status: "REQUESTED" },
      }),
      prisma.returnRequest.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      prisma.refund.count({
        where: { status: { in: ["PENDING", "PROCESSING"] } },
      }),
      prisma.refund.count({
        where: { createdAt: { gte: from, lte: to } },
      }),

      // 4. Status Distributions
      prisma.order.groupBy({
        by: ["status"],
        _count: { id: true },
        _sum: { totalAmount: true },
        where: {
          deletedAt: null,
          createdAt: { gte: from, lte: to },
        },
      }),
      prisma.payment.groupBy({
        by: ["provider"],
        _count: { id: true },
        _sum: { amount: true },
        where: {
          createdAt: { gte: from, lte: to },
        },
      }),
      prisma.payment.groupBy({
        by: ["status"],
        _count: { id: true },
        _sum: { amount: true },
        where: {
          createdAt: { gte: from, lte: to },
        },
      }),
      prisma.shipment.groupBy({
        by: ["status"],
        _count: { id: true },
        where: {
          createdAt: { gte: from, lte: to },
        },
      }),
      prisma.returnRequest.groupBy({
        by: ["status"],
        _count: { id: true },
        where: {
          createdAt: { gte: from, lte: to },
        },
      }),
      prisma.refund.groupBy({
        by: ["status"],
        _count: { id: true },
        _sum: { amount: true },
        where: {
          createdAt: { gte: from, lte: to },
        },
      }),

      // 5. Inventory
      prisma.inventory.findMany({
        where: { deletedAt: null },
        select: {
          quantityAvailable: true,
          lowStockThreshold: true,
          productId: true,
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              isActive: true,
            },
          },
        },
      }),

      // 6. Time Series Orders & Customers
      prisma.order.findMany({
        where: {
          deletedAt: null,
          createdAt: { gte: from, lte: to },
        },
        select: {
          id: true,
          createdAt: true,
          totalAmount: true,
          status: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.customer.findMany({
        where: {
          deletedAt: null,
          createdAt: { gte: from, lte: to },
        },
        select: {
          id: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      // 7. Top Order Items Aggregation in Period
      prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: {
          quantity: true,
          total: true,
        },
        _count: {
          orderId: true,
        },
        where: {
          order: {
            deletedAt: null,
            status: { notIn: ["Cancelled", "cancelled", "CANCELLED"] },
            createdAt: { gte: from, lte: to },
          },
        },
        orderBy: {
          _sum: {
            quantity: "desc",
          },
        },
        take: 10,
      }),

      // 8. Categories with Order Items
      prisma.category.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          products: {
            where: { deletedAt: null },
            select: {
              id: true,
              orderItems: {
                where: {
                  order: {
                    deletedAt: null,
                    status: { notIn: ["Cancelled", "cancelled", "CANCELLED"] },
                    createdAt: { gte: from, lte: to },
                  },
                },
                select: {
                  quantity: true,
                  total: true,
                  price: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Format & Calculate Metrics
    const allTimeRevenue = Number(allTimeRevenueAgg._sum.totalAmount || 0);
    const currentRevenue = Number(currentRevenueAgg._sum.totalAmount || 0);
    const previousRevenue = Number(previousRevenueAgg._sum.totalAmount || 0);
    const revenueGrowth = this.calculateGrowth(currentRevenue, previousRevenue);

    const ordersGrowth = this.calculateGrowth(currentOrdersCount, previousOrdersCount);
    const customersGrowth = this.calculateGrowth(currentCustomersCount, previousCustomersCount);

    // Average Order Value (AOV = valid period revenue / valid period orders)
    const currentAOV = currentValidOrdersCount > 0 ? Math.round((currentRevenue / currentValidOrdersCount) * 100) / 100 : 0;
    const previousValidOrdersCount = await prisma.order.count({
      where: {
        ...validOrderWhere,
        createdAt: { gte: prevFrom, lte: prevTo },
      },
    });
    const previousAOV = previousValidOrdersCount > 0 ? Math.round((previousRevenue / previousValidOrdersCount) * 100) / 100 : 0;
    const aovGrowth = this.calculateGrowth(currentAOV, previousAOV);

    // Inventory Stock Breakdown
    let outOfStockCount = 0;
    let lowStockCount = 0;
    let inStockCount = 0;

    inventories.forEach((inv) => {
      const qty = inv.quantityAvailable;
      const threshold = inv.lowStockThreshold || 10;
      if (qty <= 0) {
        outOfStockCount++;
      } else if (qty <= threshold) {
        lowStockCount++;
      } else {
        inStockCount++;
      }
    });

    // Build Time Series Trends (Revenue, Orders, Completed, Cancelled)
    const timeSeriesMap = new Map<string, {
      date: string;
      label: string;
      revenue: number;
      orders: number;
      completedOrders: number;
      cancelledOrders: number;
      pendingOrders: number;
    }>();

    // Grouping strategy: hourly if <= 1 day, daily if <= 60 days, monthly if > 60 days
    const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    const isHourly = diffDays <= 1;
    const isMonthly = diffDays > 90;

    // Seed continuous buckets so graphs have no gaps
    const cursor = new Date(from);
    while (cursor <= to) {
      let key: string;
      let label: string;

      if (isHourly) {
        key = cursor.toISOString().substring(0, 13); // YYYY-MM-DDTHH
        label = cursor.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
        cursor.setHours(cursor.getHours() + 1);
      } else if (isMonthly) {
        key = cursor.toISOString().substring(0, 7); // YYYY-MM
        label = cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        cursor.setMonth(cursor.getMonth() + 1);
      } else {
        key = cursor.toISOString().substring(0, 10); // YYYY-MM-DD
        label = cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        cursor.setDate(cursor.getDate() + 1);
      }

      if (!timeSeriesMap.has(key)) {
        timeSeriesMap.set(key, {
          date: key,
          label,
          revenue: 0,
          orders: 0,
          completedOrders: 0,
          cancelledOrders: 0,
          pendingOrders: 0,
        });
      }
    }

    // Populate order buckets
    timeSeriesOrders.forEach((order) => {
      const dt = new Date(order.createdAt);
      let key: string;
      if (isHourly) {
        key = dt.toISOString().substring(0, 13);
      } else if (isMonthly) {
        key = dt.toISOString().substring(0, 7);
      } else {
        key = dt.toISOString().substring(0, 10);
      }

      const bucket = timeSeriesMap.get(key);
      if (bucket) {
        bucket.orders += 1;
        const statusLower = (order.status || "").toLowerCase();
        if (statusLower === "cancelled") {
          bucket.cancelledOrders += 1;
        } else {
          bucket.revenue += Number(order.totalAmount || 0);
          if (["completed", "delivered", "confirmed"].includes(statusLower)) {
            bucket.completedOrders += 1;
          } else if (["pending", "processing"].includes(statusLower)) {
            bucket.pendingOrders += 1;
          }
        }
      }
    });

    const revenueAndOrdersTrend = Array.from(timeSeriesMap.values()).map((item) => ({
      ...item,
      revenue: Math.round(item.revenue * 100) / 100,
    }));

    // Customer Growth Trend
    const customerGrowthMap = new Map<string, { date: string; label: string; newCustomers: number }>();
    Array.from(timeSeriesMap.values()).forEach((b) => {
      customerGrowthMap.set(b.date, { date: b.date, label: b.label, newCustomers: 0 });
    });

    timeSeriesCustomers.forEach((cust) => {
      const dt = new Date(cust.createdAt);
      let key: string;
      if (isHourly) {
        key = dt.toISOString().substring(0, 13);
      } else if (isMonthly) {
        key = dt.toISOString().substring(0, 7);
      } else {
        key = dt.toISOString().substring(0, 10);
      }
      const b = customerGrowthMap.get(key);
      if (b) {
        b.newCustomers += 1;
      }
    });

    const customerGrowthTrend = Array.from(customerGrowthMap.values());

    // Top Selling Products detail resolution
    const topProductIds = topOrderItemsAgg.map((item) => item.productId);
    const topProductsInfo = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        images: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { imageUrl: true, url: true },
        },
      },
    });

    const topProducts = topOrderItemsAgg.map((item) => {
      const product = topProductsInfo.find((p) => p.id === item.productId);
      const image = product?.images[0]?.url || product?.images[0]?.imageUrl || "";
      return {
        productId: item.productId,
        name: product?.name || "Unknown Product",
        sku: product?.sku || "N/A",
        price: Number(product?.price || 0),
        unitsSold: item._sum.quantity || 0,
        revenue: Number(item._sum.total || 0),
        orderCount: item._count.orderId || 0,
        image,
      };
    });

    // Category Sales Breakdown
    const categorySales = categories.map((cat) => {
      let salesAmount = 0;
      let itemsSold = 0;

      cat.products.forEach((prod) => {
        prod.orderItems.forEach((oi) => {
          itemsSold += oi.quantity;
          salesAmount += Number(oi.total || Number(oi.price) * oi.quantity);
        });
      });

      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        productCount: cat.products.length,
        itemsSold,
        salesAmount: Math.round(salesAmount * 100) / 100,
      };
    }).sort((a, b) => b.salesAmount - a.salesAmount);

    // Payment Health & Provider breakdown
    const paymentMethods = paymentsByProviderRaw.map((p) => ({
      provider: p.provider,
      count: p._count.id,
      amount: Number(p._sum.amount || 0),
    }));

    const paymentStatuses = paymentsByStatusRaw.map((p) => ({
      status: p.status,
      count: p._count.id,
      amount: Number(p._sum.amount || 0),
    }));

    const totalPaymentTx = paymentsByStatusRaw.reduce((acc, curr) => acc + curr._count.id, 0);
    const successfulPaymentTx = paymentsByStatusRaw
      .filter((p) => p.status === "PAID")
      .reduce((acc, curr) => acc + curr._count.id, 0);
    const failedPaymentTx = paymentsByStatusRaw
      .filter((p) => ["FAILED", "CANCELLED"].includes(p.status))
      .reduce((acc, curr) => acc + curr._count.id, 0);
    const pendingPaymentTx = paymentsByStatusRaw
      .filter((p) => ["PENDING", "PROCESSING"].includes(p.status))
      .reduce((acc, curr) => acc + curr._count.id, 0);

    const paymentSuccessRate = totalPaymentTx > 0 ? Math.round((successfulPaymentTx / totalPaymentTx) * 1000) / 10 : 100;

    // Shipment Distribution
    const shipmentStatuses = shipmentsByStatusRaw.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    // Order Status Distribution
    const orderStatuses = ordersByStatusRaw.map((o) => ({
      status: o.status || "Unknown",
      count: o._count.id,
      amount: Number(o._sum.totalAmount || 0),
    }));

    // Return & Refund Summaries
    const returnStatuses = returnsByStatusRaw.map((r) => ({
      status: r.status,
      count: r._count.id,
    }));

    const refundStatuses = refundsByStatusRaw.map((r) => ({
      status: r.status,
      count: r._count.id,
      amount: Number(r._sum.amount || 0),
    }));

    return {
      dateRange: {
        from: from.toISOString(),
        to: to.toISOString(),
        prevFrom: prevFrom.toISOString(),
        prevTo: prevTo.toISOString(),
        rangeLabel,
      },
      currency: "BDT",
      kpis: {
        revenue: {
          total: allTimeRevenue,
          currentPeriod: currentRevenue,
          previousPeriod: previousRevenue,
          growth: revenueGrowth,
        },
        orders: {
          total: allTimeOrdersCount,
          currentPeriod: currentOrdersCount,
          previousPeriod: previousOrdersCount,
          growth: ordersGrowth,
        },
        customers: {
          total: totalCustomersCount,
          currentPeriod: currentCustomersCount,
          previousPeriod: previousCustomersCount,
          growth: customersGrowth,
        },
        products: {
          total: totalProductsCount,
          active: activeProductsCount,
          outOfStock: outOfStockCount,
          lowStock: lowStockCount,
          inStock: inStockCount,
        },
        pendingOrders: {
          count: pendingOrdersCount,
        },
        pendingReturns: {
          count: pendingReturnsCount,
          periodCount: periodReturnsCount,
        },
        pendingRefunds: {
          count: pendingRefundsCount,
          periodCount: periodRefundsCount,
        },
        aov: {
          current: currentAOV,
          previous: previousAOV,
          growth: aovGrowth,
        },
      },
      charts: {
        revenueAndOrdersTrend,
        customerGrowthTrend,
        orderStatuses,
        categorySales,
        topProducts,
        paymentMethods,
        paymentStatuses,
        paymentHealth: {
          totalTransactions: totalPaymentTx,
          successful: successfulPaymentTx,
          failed: failedPaymentTx,
          pending: pendingPaymentTx,
          successRate: paymentSuccessRate,
        },
        shipmentStatuses,
        returnStatuses,
        refundStatuses,
      },
    };
  }

  /**
   * Returns recent orders with customer relations and item summaries
   */
  public static async getRecentOrders(limit: number = 10) {
    const orders = await prisma.order.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 50),
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        totalAmount: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customer ? `${o.customer.firstName} ${o.customer.lastName}`.trim() || o.customer.email : "Guest Customer",
      customerEmail: o.customer?.email || "N/A",
      customerId: o.customer?.id || null,
      totalAmount: Number(o.totalAmount),
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod || "COD",
      itemCount: o._count.items,
      createdAt: o.createdAt.toISOString(),
    }));
  }

  /**
   * Returns recently registered customers with their total order count and spend
   */
  public static async getRecentCustomers(limit: number = 10) {
    const customers = await prisma.customer.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 50),
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
        isActive: true,
        orders: {
          where: { deletedAt: null },
          select: {
            totalAmount: true,
            status: true,
          },
        },
      },
    });

    return customers.map((c) => {
      const validOrders = c.orders.filter((o) => !["Cancelled", "cancelled", "CANCELLED"].includes(o.status));
      const totalSpent = validOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

      return {
        id: c.id,
        name: `${c.firstName} ${c.lastName}`.trim() || "Customer",
        email: c.email,
        phone: c.phone || null,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
        orderCount: c.orders.length,
        totalSpent: Math.round(totalSpent * 100) / 100,
      };
    });
  }

  /**
   * Returns inventory stock alerts (out of stock and critical low stock)
   */
  public static async getInventoryAlerts(limit: number = 15) {
    const inventoryItems = await prisma.inventory.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            isActive: true,
            images: {
              where: { deletedAt: null },
              orderBy: { sortOrder: "asc" },
              take: 1,
              select: { imageUrl: true, url: true },
            },
          },
        },
        variant: {
          select: {
            id: true,
            sku: true,
            price: true,
          },
        },
      },
      orderBy: {
        quantityAvailable: "asc",
      },
      take: 100,
    });

    const alerts = inventoryItems
      .filter((item) => {
        const threshold = item.lowStockThreshold || 10;
        return item.quantityAvailable <= threshold;
      })
      .slice(0, limit)
      .map((item) => {
        const threshold = item.lowStockThreshold || 10;
        const qty = item.quantityAvailable;
        let severity: "OUT_OF_STOCK" | "CRITICAL" | "LOW_STOCK" = "LOW_STOCK";

        if (qty <= 0) {
          severity = "OUT_OF_STOCK";
        } else if (qty <= Math.max(3, Math.floor(threshold / 3))) {
          severity = "CRITICAL";
        }

        const image = item.product?.images[0]?.url || item.product?.images[0]?.imageUrl || "";

        return {
          id: item.id,
          productId: item.productId || item.product?.id,
          productName: item.product?.name || "Product",
          sku: item.variant?.sku || item.product?.sku || "N/A",
          variantId: item.variantId,
          quantityAvailable: qty,
          lowStockThreshold: threshold,
          severity,
          image,
        };
      });

    return alerts;
  }
}
