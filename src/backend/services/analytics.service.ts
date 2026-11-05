import { prisma } from "../config/db";

export class AdminAnalyticsService {
  static async getOverview() {
    const [totalCustomers, activeCustomers, totalOrders, revenueData, refunds, abandonedCarts, totalProducts] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.order.count({ where: { deletedAt: null } }),
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { not: 'Cancelled' }, deletedAt: null } }),
      prisma.refund.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED' } }),
      prisma.abandonedCart.count(),
      prisma.product.count({ where: { deletedAt: null } })
    ]);

    const revenue = Number(revenueData._sum.totalAmount || 0);

    return {
      totalCustomers,
      activeCustomers,
      newCustomers: 0,
      totalOrders,
      revenue,
      totalRevenue: revenue, // Map to frontend expectations
      totalProducts, // Map to frontend expectations
      refunds: Number(refunds._sum.amount || 0),
      abandonedCarts
    };
  }

  static async getCustomerAnalytics() {
    // Top customers by order count
    const topCustomers = await prisma.order.groupBy({
      by: ['customerId'],
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });

    const populatedTopCustomers = await Promise.all(topCustomers.map(async (tc) => {
      const c = await prisma.customer.findUnique({ where: { id: tc.customerId }, select: { id: true, firstName: true, lastName: true, email: true }});
      return { ...tc, customer: c };
    }));

    return {
      topCustomers: populatedTopCustomers
    };
  }

  static async getProductAnalytics() {
    const topPurchased = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10
    });

    const topProducts = await Promise.all(topPurchased.map(async (tp) => {
      const p = await prisma.product.findUnique({
        where: { id: tp.productId },
        select: { name: true }
      });
      return {
        name: p?.name || "Unknown Product",
        totalQuantitySold: tp._sum.quantity || 0
      };
    }));

    return {
      topProducts,
      topPurchased
    };
  }

  static async getRevenueAnalytics() {
    // Total revenue
    const revenueData = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: { not: 'Cancelled' }, deletedAt: null }
    });
    const totalRevenue = Number(revenueData._sum.totalAmount || 0);

    // monthly revenue & growth calculation
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [currentMonthData, previousMonthData] = await Promise.all([
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: { not: 'Cancelled' },
          deletedAt: null,
          createdAt: { gte: currentMonthStart, lt: currentMonthEnd }
        }
      }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: { not: 'Cancelled' },
          deletedAt: null,
          createdAt: { gte: previousMonthStart, lt: currentMonthStart }
        }
      })
    ]);

    const currentMonthRevenue = Number(currentMonthData._sum.totalAmount || 0);
    const previousMonthRevenue = Number(previousMonthData._sum.totalAmount || 0);

    let growthPercentage = 0;
    if (previousMonthRevenue > 0) {
      growthPercentage = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
    } else if (currentMonthRevenue > 0) {
      growthPercentage = 100;
    }

    // Trend: Last 6 Months
    const last6Months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString("default", { month: "short" });
      last6Months.push(monthName);
    }

    const trendMap = new Map<string, number>();
    last6Months.forEach(m => trendMap.set(m, 0));

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        deletedAt: null,
        status: { not: "Cancelled" },
        createdAt: { gte: sixMonthsAgo }
      },
      select: {
        totalAmount: true,
        createdAt: true
      }
    });

    orders.forEach(order => {
      const monthName = order.createdAt.toLocaleString("default", { month: "short" });
      if (trendMap.has(monthName)) {
        const current = trendMap.get(monthName) || 0;
        trendMap.set(monthName, current + Number(order.totalAmount));
      }
    });

    const trend = Array.from(trendMap.entries()).map(([date, revenue]) => ({
      date,
      revenue: Number(revenue.toFixed(2))
    }));

    return {
      totalRevenue,
      monthlyRevenue: currentMonthRevenue,
      growthPercentage: Number(growthPercentage.toFixed(2)),
      trend
    };
  }

  static async getOrdersAnalytics() {
    const [total, pending, processing, completed, cancelled] = await Promise.all([
      prisma.order.count({ where: { deletedAt: null } }),
      prisma.order.count({ where: { status: { equals: "Pending", mode: "insensitive" }, deletedAt: null } }),
      prisma.order.count({ where: { status: { equals: "Processing", mode: "insensitive" }, deletedAt: null } }),
      prisma.order.count({ where: { status: { equals: "Completed", mode: "insensitive" }, deletedAt: null } }),
      prisma.order.count({ where: { status: { equals: "Cancelled", mode: "insensitive" }, deletedAt: null } })
    ]);

    // Trend: Last 6 Months
    const now = new Date();
    const last6Months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString("default", { month: "short" });
      last6Months.push(monthName);
    }

    const trendMap = new Map<string, number>();
    last6Months.forEach(m => trendMap.set(m, 0));

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: sixMonthsAgo }
      },
      select: {
        createdAt: true
      }
    });

    orders.forEach(order => {
      const monthName = order.createdAt.toLocaleString("default", { month: "short" });
      if (trendMap.has(monthName)) {
        const current = trendMap.get(monthName) || 0;
        trendMap.set(monthName, current + 1);
      }
    });

    const trend = Array.from(trendMap.entries()).map(([date, count]) => ({
      date,
      orders: count
    }));

    return {
      total,
      pending,
      processing,
      completed,
      cancelled,
      trend
    };
  }

  static async getCategoryAnalytics() {
    const totalCategories = await prisma.category.count({ where: { deletedAt: null } });

    // Fetch category sales and product counts
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        products: {
          where: { deletedAt: null },
          select: {
            id: true,
            orderItems: {
              where: {
                order: {
                  status: { not: "Cancelled" },
                  deletedAt: null
                }
              },
              select: {
                price: true,
                quantity: true
              }
            }
          }
        }
      }
    });

    const categoryData = categories.map(cat => {
      let sales = 0;
      cat.products.forEach(p => {
        p.orderItems.forEach(item => {
          sales += Number(item.price) * item.quantity;
        });
      });
      return {
        name: cat.name,
        sales: Number(sales.toFixed(2)),
        productCount: cat.products.length
      };
    });

    // Sort by sales descending
    categoryData.sort((a, b) => b.sales - a.sales);

    return {
      totalCategories,
      categoryData
    };
  }

  static async getBrandAnalytics() {
    const totalBrands = await prisma.brand.count({ where: { deletedAt: null } });

    // Fetch brand sales and product counts
    const brands = await prisma.brand.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        products: {
          where: { deletedAt: null },
          select: {
            id: true,
            orderItems: {
              where: {
                order: {
                  status: { not: "Cancelled" },
                  deletedAt: null
                }
              },
              select: {
                price: true,
                quantity: true
              }
            }
          }
        }
      }
    });

    const brandData = brands.map(brand => {
      let sales = 0;
      brand.products.forEach(p => {
        p.orderItems.forEach(item => {
          sales += Number(item.price) * item.quantity;
        });
      });
      return {
        name: brand.name,
        sales: Number(sales.toFixed(2)),
        productCount: brand.products.length
      };
    });

    // Sort by sales descending
    brandData.sort((a, b) => b.sales - a.sales);

    return {
      totalBrands,
      brandData
    };
  }

  static async getGa4Analytics() {
    const isConfigured = !!(process.env.GOOGLE_CREDENTIALS_JSON && process.env.GA_PROPERTY_ID);

    if (!isConfigured) {
      return {
        connected: false,
        message: "GA4 not configured",
        activeUsers: 0,
        sessions: 0,
        pageViews: 0,
        conversionRate: 0.0,
        revenue: 0.0
      };
    }

    try {
      const { BetaAnalyticsDataClient } = await import("@google-analytics/data");
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON || "{}");
      const client = new BetaAnalyticsDataClient({ credentials });

      const [response] = await client.runReport({
        property: `properties/${process.env.GA_PROPERTY_ID}`,
        dateRanges: [
          {
            startDate: "30daysAgo",
            endDate: "today",
          },
        ],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "conversions" },
          { name: "totalRevenue" }
        ],
      });

      let activeUsers = 0;
      let sessions = 0;
      let pageViews = 0;
      let conversionRate = 0;
      let revenue = 0;

      if (response && response.rows && response.rows.length > 0) {
        const row = response.rows[0];
        if (row.metricValues) {
          activeUsers = Number(row.metricValues[0]?.value || 0);
          sessions = Number(row.metricValues[1]?.value || 0);
          pageViews = Number(row.metricValues[2]?.value || 0);
          const conversions = Number(row.metricValues[3]?.value || 0);
          revenue = Number(row.metricValues[4]?.value || 0);
          if (sessions > 0) {
            conversionRate = (conversions / sessions) * 100;
          }
        }
      }

      return {
        connected: true,
        activeUsers,
        sessions,
        pageViews,
        conversionRate: Number(conversionRate.toFixed(2)),
        revenue
      };
    } catch (error: any) {
      console.error("Error fetching GA4 reports:", error);
      return {
        connected: false,
        message: "GA4 configuration error: " + error.message,
        activeUsers: 0,
        sessions: 0,
        pageViews: 0,
        conversionRate: 0.0,
        revenue: 0.0
      };
    }
  }
}
