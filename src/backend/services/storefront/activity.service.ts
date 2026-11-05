import { prisma } from "../../config/db";

export class StorefrontActivityService {
  static async getCustomerActivity(customerId: string, options: { page?: number, limit?: number, type?: string }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { customerId };
    if (options.type) {
      where.type = options.type;
    }

    const [activities, total] = await Promise.all([
      prisma.customerActivity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.customerActivity.count({ where })
    ]);

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
