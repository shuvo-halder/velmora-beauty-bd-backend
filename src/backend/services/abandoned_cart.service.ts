import { prisma } from "../config/db";

export class AbandonedCartService {
  static async detectAbandonedCarts() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const abandonedCarts = await prisma.cart.findMany({
      where: {
        updatedAt: { lte: twentyFourHoursAgo },
        items: { some: {} },
        AbandonedCart: null
      },
      include: { customer: true }
    });

    if (abandonedCarts.length > 0) {
      await prisma.abandonedCart.createMany({
        data: abandonedCarts.map(cart => ({
          cartId: cart.id,
          customerId: cart.customerId,
          lastActivityAt: cart.updatedAt
        }))
      });
      // Here you would trigger an email or notification
    }
    
    return abandonedCarts.length;
  }
}
