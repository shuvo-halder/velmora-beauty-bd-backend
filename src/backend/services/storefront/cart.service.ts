import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import { calculateCouponDiscount } from "../../utils/couponCalculator";

export interface CartIdentifier {
  customerId?: string;
  sessionId?: string;
}

export class StorefrontCartService {
  private static getCartWhereClause(identifier: CartIdentifier) {
    if (identifier.customerId) {
      return { customerId: identifier.customerId };
    }
    if (identifier.sessionId) {
      return { sessionId: identifier.sessionId };
    }
    throw new AppError("A customer ID or cart session ID is required", 400, "BAD_REQUEST");
  }

  static async getCart(identifier: CartIdentifier, dbClient: any = prisma) {
    const whereClause = this.getCartWhereClause(identifier);

    // If both customerId and sessionId are present, merge guest cart into customer cart
    if (identifier.customerId && identifier.sessionId) {
      await this.mergeGuestCart(identifier.sessionId, identifier.customerId, dbClient);
    }

    let cart = await dbClient.cart.findFirst({
      where: whereClause,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                categoryId: true,
                brandId: true,
                isActive: true,
                status: true,
                deletedAt: true,
                trackInventory: true,
                inventory: {
                  select: {
                    quantityAvailable: true,
                    quantityReserved: true,
                  },
                },
                images: {
                  where: { isPrimary: true },
                  take: 1,
                  select: { url: true, altText: true },
                },
              },
            },
            variant: {
              select: {
                id: true,
                sku: true,
                price: true,
                compareAtPrice: true,
                isActive: true,
                deletedAt: true,
                inventories: {
                  select: {
                    quantityAvailable: true,
                    quantityReserved: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!cart) {
      cart = await dbClient.cart.create({
        data: identifier.customerId
          ? { customerId: identifier.customerId }
          : { sessionId: identifier.sessionId! },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  price: true,
                  categoryId: true,
                  brandId: true,
                  isActive: true,
                  status: true,
                  deletedAt: true,
                  trackInventory: true,
                  inventory: {
                    select: {
                      quantityAvailable: true,
                      quantityReserved: true,
                    },
                  },
                  images: {
                    where: { isPrimary: true },
                    take: 1,
                    select: { url: true, altText: true },
                  },
                },
              },
              variant: {
                select: {
                  id: true,
                  sku: true,
                  price: true,
                  compareAtPrice: true,
                  isActive: true,
                  deletedAt: true,
                  inventories: {
                    select: {
                      quantityAvailable: true,
                      quantityReserved: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    }

    const validItems = cart.items.filter(
      (item) =>
        item.product &&
        item.product.isActive &&
        item.product.status === "Active" &&
        !item.product.deletedAt &&
        (!item.variantId || (item.variant && item.variant.isActive && !item.variant.deletedAt))
    );

    let subtotal = 0;
    const itemsWithPricing = validItems.map((item) => {
      const unitPrice = item.variant
        ? Number(item.variant.price)
        : Number(item.product.price || 0);
      const itemSubtotal = unitPrice * item.quantity;
      subtotal += itemSubtotal;

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productSlug: item.product.slug,
        productImage: item.product.images[0]?.url || null,
        variantId: item.variantId,
        variantSku: item.variant?.sku || null,
        quantity: item.quantity,
        unitPrice,
        subtotal: itemSubtotal,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    const itemCount = itemsWithPricing.reduce((sum, item) => sum + item.quantity, 0);

    let discount = 0;
    let appliedCoupon: any = null;

    if (cart.couponId) {
      const coupon = await dbClient.coupon.findFirst({
        where: { id: cart.couponId, deletedAt: null },
      });

      if (coupon) {
        let customerOrderCountWithCoupon = 0;
        if (coupon.usagePerCustomer !== null && identifier.customerId) {
          customerOrderCountWithCoupon = await dbClient.order.count({
            where: {
              couponId: coupon.id,
              customerId: identifier.customerId,
              status: { not: "Cancelled" },
            },
          });
        }

        const couponItems = validItems.map((item) => {
          const unitPrice = item.variant
            ? new Prisma.Decimal(item.variant.price)
            : new Prisma.Decimal(item.product.price || 0);
          return {
            productId: item.productId,
            categoryId: item.product.categoryId,
            brandId: item.product.brandId,
            quantity: item.quantity,
            unitPrice,
            subtotal: unitPrice.mul(item.quantity),
          };
        });

        const calcResult = calculateCouponDiscount({
          coupon,
          items: couponItems,
          customerId: identifier.customerId,
          customerOrderCountWithCoupon,
        });

        if (calcResult.isValid) {
          discount = Number(calcResult.discountAmount);
          appliedCoupon = {
            id: coupon.id,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: calcResult.discountValue,
            isFreeShipping: calcResult.isFreeShipping,
          };
        } else {
          await dbClient.cart.update({
            where: { id: cart.id },
            data: { couponId: null },
          });
        }
      }
    }

    return {
      id: cart.id,
      customerId: cart.customerId || null,
      sessionId: cart.sessionId || null,
      couponId: appliedCoupon ? appliedCoupon.id : null,
      coupon: appliedCoupon,
      itemCount,
      subtotal,
      discount,
      shippingFee: 0,
      estimatedTax: 0,
      total: Math.max(0, subtotal - discount),
      items: itemsWithPricing,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  static async addItem(
    identifier: CartIdentifier,
    dto: { productId: string; variantId?: string | null; quantity: number }
  ) {
    if (!dto.productId) {
      throw new AppError("Product ID is required", 400, "BAD_REQUEST");
    }

    if (!dto.quantity || dto.quantity < 1) {
      throw new AppError("Quantity must be at least 1", 400, "BAD_REQUEST");
    }

    const product = await prisma.product.findFirst({
      where: {
        id: dto.productId,
        isActive: true,
        status: "Active",
        deletedAt: null,
      },
      include: {
        inventory: true,
      },
    });

    if (!product) {
      throw new AppError("Product not found or unavailable", 404, "NOT_FOUND");
    }

    let variant: any = null;
    if (dto.variantId && dto.variantId.trim() !== "") {
      variant = await prisma.productVariant.findFirst({
        where: {
          id: dto.variantId,
          productId: dto.productId,
          isActive: true,
          deletedAt: null,
        },
        include: {
          inventories: true,
        },
      });

      if (!variant) {
        throw new AppError("Product variant not found or does not belong to this product", 404, "NOT_FOUND");
      }
    }

    // Stock validation
    if (product.trackInventory) {
      let availableStock = 0;

      if (variant) {
        let totalStock = (variant.inventories || []).reduce(
          (sum: number, inv: any) => sum + (inv.quantityAvailable - inv.quantityReserved),
          0
        );
        if (totalStock === 0 && (!variant.inventories || variant.inventories.length === 0) && product.inventory) {
          totalStock = product.inventory.quantityAvailable - product.inventory.quantityReserved;
        }
        availableStock = Math.max(0, totalStock);
      } else if (product.inventory) {
        availableStock = Math.max(
          0,
          product.inventory.quantityAvailable - product.inventory.quantityReserved
        );
      }

      const whereClause = this.getCartWhereClause(identifier);
      const existingCart = await prisma.cart.findFirst({
        where: whereClause,
        include: { items: true },
      });

      const existingCartItem = existingCart?.items.find(
        (i) => i.productId === dto.productId && i.variantId === (dto.variantId || null)
      );

      const requestedTotal = (existingCartItem ? existingCartItem.quantity : 0) + dto.quantity;

      if (requestedTotal > availableStock) {
        throw new AppError(
          `Insufficient stock available. In stock: ${availableStock}, Requested in cart: ${requestedTotal}`,
          409,
          "INSUFFICIENT_STOCK"
        );
      }
    }

    const targetVariantId = dto.variantId && dto.variantId.trim() !== "" ? dto.variantId : null;

    return await prisma.$transaction(async (tx) => {
      const whereClause = this.getCartWhereClause(identifier);
      let cart = await tx.cart.findFirst({
        where: whereClause,
      });

      if (!cart) {
        cart = await tx.cart.create({
          data: identifier.customerId
            ? { customerId: identifier.customerId }
            : { sessionId: identifier.sessionId! },
        });
      } else {
        // Lock the cart row to serialize concurrent add-to-cart requests
        await tx.cart.update({
          where: { id: cart.id },
          data: { updatedAt: new Date() }
        });
      }

      const existingItem = await tx.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: dto.productId,
          variantId: targetVariantId,
        },
      });

      if (existingItem) {
        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + dto.quantity,
          },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId: dto.productId,
            variantId: targetVariantId,
            quantity: dto.quantity,
          },
        });
      }

      return this.getCart(identifier, tx);
    });
  }

  static async updateItem(
    identifier: CartIdentifier,
    cartItemId: string,
    quantity: number
  ) {
    if (quantity < 1) {
      throw new AppError("Quantity must be at least 1", 400, "BAD_REQUEST");
    }

    const whereClause = this.getCartWhereClause(identifier);
    const cart = await prisma.cart.findFirst({
      where: whereClause,
    });

    if (!cart) {
      throw new AppError("Cart not found", 404, "NOT_FOUND");
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        cartId: cart.id,
      },
      include: {
        product: {
          include: { inventory: true },
        },
        variant: {
          include: { inventories: true },
        },
      },
    });

    if (!cartItem) {
      throw new AppError("Cart item not found", 404, "NOT_FOUND");
    }

    if (cartItem.product.trackInventory) {
      let availableStock = 0;
      if (cartItem.variant) {
        let totalStock = (cartItem.variant.inventories || []).reduce(
          (sum: number, inv: any) => sum + (inv.quantityAvailable - inv.quantityReserved),
          0
        );
        if (
          totalStock === 0 &&
          (!cartItem.variant.inventories || cartItem.variant.inventories.length === 0) &&
          cartItem.product.inventory
        ) {
          totalStock =
            cartItem.product.inventory.quantityAvailable -
            cartItem.product.inventory.quantityReserved;
        }
        availableStock = Math.max(0, totalStock);
      } else if (cartItem.product.inventory) {
        availableStock = Math.max(
          0,
          cartItem.product.inventory.quantityAvailable - cartItem.product.inventory.quantityReserved
        );
      }

      if (quantity > availableStock) {
        throw new AppError(
          `Insufficient stock available. In stock: ${availableStock}, Requested: ${quantity}`,
          409,
          "INSUFFICIENT_STOCK"
        );
      }
    }

    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });

    return this.getCart(identifier);
  }

  static async removeItem(identifier: CartIdentifier, cartItemId: string) {
    const whereClause = this.getCartWhereClause(identifier);
    const cart = await prisma.cart.findFirst({
      where: whereClause,
    });

    if (!cart) {
      return this.getCart(identifier);
    }

    await prisma.cartItem.deleteMany({
      where: {
        id: cartItemId,
        cartId: cart.id,
      },
    });

    return this.getCart(identifier);
  }

  static async clearCart(identifier: CartIdentifier) {
    const whereClause = this.getCartWhereClause(identifier);
    const cart = await prisma.cart.findFirst({
      where: whereClause,
    });

    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    return this.getCart(identifier);
  }

  static async mergeGuestCart(guestSessionId: string, customerId: string, dbClient: any = prisma) {
    const guestCart = await dbClient.cart.findFirst({
      where: { sessionId: guestSessionId },
      include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) {
      if (guestCart) {
        await dbClient.cart.delete({ where: { id: guestCart.id } });
      }
      return;
    }

    const performMerge = async (tx: any) => {
      let customerCart = await tx.cart.findFirst({
        where: { customerId },
        include: { items: true },
      });

      if (!customerCart) {
        customerCart = await tx.cart.create({
          data: { customerId },
          include: { items: true },
        });
      }

      for (const guestItem of guestCart.items) {
        const existingItem = customerCart.items.find(
          (i) => i.productId === guestItem.productId && i.variantId === guestItem.variantId
        );

        if (existingItem) {
          await tx.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: existingItem.quantity + guestItem.quantity },
          });
        } else {
          await tx.cartItem.create({
            data: {
              cartId: customerCart.id,
              productId: guestItem.productId,
              variantId: guestItem.variantId,
              quantity: guestItem.quantity,
            },
          });
        }
      }

      // Delete guest cart after merge
      await tx.cart.delete({
        where: { id: guestCart.id },
      });
    };

    if (dbClient.$transaction) {
      await dbClient.$transaction(performMerge);
    } else {
      await performMerge(dbClient);
    }
  }
}
