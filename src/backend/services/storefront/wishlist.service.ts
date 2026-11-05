import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";

export class StorefrontWishlistService {
  static async getWishlist(customerId: string) {
    let wishlist = await prisma.wishlist.findUnique({
      where: { customerId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                status: true,
                isActive: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                  select: { url: true, altText: true },
                },
                variants: {
                  where: { isActive: true, deletedAt: null },
                  select: {
                    id: true,
                    sku: true,
                    price: true,
                    compareAtPrice: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: { customerId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  price: true,
                  status: true,
                  isActive: true,
                  images: {
                    where: { isPrimary: true },
                    take: 1,
                    select: { url: true, altText: true },
                  },
                  variants: {
                    where: { isActive: true, deletedAt: null },
                    select: {
                      id: true,
                      sku: true,
                      price: true,
                      compareAtPrice: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }

    const items = wishlist.items.filter(
      (item) => item.product && item.product.isActive && item.product.status === "Active"
    );

    return {
      id: wishlist.id,
      customerId: wishlist.customerId,
      itemCount: items.length,
      items,
      createdAt: wishlist.createdAt,
      updatedAt: wishlist.updatedAt,
    };
  }

  static async addToWishlist(customerId: string, productId: string) {
    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true, deletedAt: null },
    });

    if (!product) {
      throw new AppError("Product not found or unavailable", 404, "NOT_FOUND");
    }

    let wishlist = await prisma.wishlist.findUnique({
      where: { customerId },
    });

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: { customerId },
      });
    }

    const existingItem = await prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    if (existingItem) {
      return this.getWishlist(customerId);
    }

    await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId,
      },
    });

    return this.getWishlist(customerId);
  }

  static async removeFromWishlist(customerId: string, productId: string) {
    const wishlist = await prisma.wishlist.findUnique({
      where: { customerId },
    });

    if (!wishlist) {
      return this.getWishlist(customerId);
    }

    await prisma.wishlistItem.deleteMany({
      where: {
        wishlistId: wishlist.id,
        productId,
      },
    });

    return this.getWishlist(customerId);
  }
}
