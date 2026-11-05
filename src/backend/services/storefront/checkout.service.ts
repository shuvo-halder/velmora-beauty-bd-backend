import { Prisma } from '@prisma/client';
import { prisma } from "../../config/db";
import { emailService } from "../../services/email.service";
import { AppError } from "../../utils/AppError";
import { normalizePhone } from "../../utils/phone";
import { CartIdentifier, StorefrontCartService } from "./cart.service";
import { calculateCouponDiscount } from "../../utils/couponCalculator";
import { calculateShippingFee } from "../../utils/shippingCalculator";
import { calculateTax } from "../../utils/taxCalculator";

import { mapOrderToStorefrontDTO } from "../../dtos/storefront/mappers";

export class StorefrontCheckoutService {
  /**
   * Helper to format CustomerAddress model into a readable text block
   */
  private static formatAddress(address: any): string {
    if (!address) return "";
    const name = address.fullName || `${address.firstName || ""} ${address.lastName || ""}`.trim() || "N/A";
    const line1 = address.address1 || address.addressLine1 || address.address || "";
    const line2 = address.address2 || address.addressLine2 ? `, ${address.address2 || address.addressLine2}` : "";
    const city = address.city || "";
    const state = address.state || "";
    const postalCode = address.postalCode || address.zipCode || "";
    const country = address.country || "";
    const rawPhone = address.phone || address.mobile || "";
    const phone = normalizePhone(rawPhone) || rawPhone || "N/A";

    return `${name}\n${line1}${line2}\n${city}${state ? ", " + state : ""} ${postalCode}\n${country}\nPhone: ${phone}`;
  }

  /**
   * Retrieves or initializes the checkout session details and calculates all fees.
   * Never trusts the frontend, calculates everything dynamically.
   */
  static async getCheckoutSession(identifier: CartIdentifier, guestShippingAddress?: any) {
    const cart = await prisma.cart.findFirst({
      where: identifier.customerId ? { customerId: identifier.customerId } : { sessionId: identifier.sessionId },
      include: {
        items: {
          include: {
            product: {
              include: {
                inventory: true,
                category: true,
              },
            },
            variant: {
              include: {
                inventories: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new AppError("Your cart is empty", 400, "EMPTY_CART");
    }

    // 1. Validate each item is active, variants are valid, and inventory is sufficient
    const validatedItems = [];
    let subtotal = new Prisma.Decimal(0);

    for (const item of cart.items) {
      const { product, variant, quantity } = item;

      // Product validation
      if (!product || !product.isActive || product.status !== "Active" || product.deletedAt) {
        throw new AppError(`Product "${product?.name || "Unknown"}" is no longer active or available`, 404, "PRODUCT_UNAVAILABLE");
      }

      // Variant validation if applicable
      if (item.variantId) {
        if (!variant || !variant.isActive || variant.deletedAt) {
          throw new AppError(`Selected variant for "${product.name}" is no longer active or available`, 404, "VARIANT_UNAVAILABLE");
        }
      }

      // Inventory check
      if (product.trackInventory) {
        let availableStock = 0;
        if (variant) {
          let totalStock = variant.inventories.reduce(
            (sum: number, inv: any) => sum + (inv.quantityAvailable - inv.quantityReserved),
            0
          );
          if (totalStock === 0 && variant.inventories.length === 0 && product.inventory) {
            totalStock = product.inventory.quantityAvailable - product.inventory.quantityReserved;
          }
          availableStock = Math.max(0, totalStock);
        } else if (product.inventory) {
          availableStock = Math.max(
            0,
            product.inventory.quantityAvailable - product.inventory.quantityReserved
          );
        }

        if (quantity > availableStock) {
          throw new AppError(
            `Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${quantity}`,
            400,
            "INSUFFICIENT_STOCK"
          );
        }
      }

      // Pricing calculation
      const unitPrice = variant ? new Prisma.Decimal(variant.price) : new Prisma.Decimal(product.price || 0);
      const itemSubtotal = unitPrice.mul(quantity);
      subtotal = subtotal.add(itemSubtotal);

      validatedItems.push({
        id: item.id,
        productId: item.productId,
        categoryId: product.categoryId,
        brandId: product.brandId,
        productName: product.name,
        productSlug: product.slug,
        variantId: item.variantId,
        variantSku: variant?.sku || null,
        quantity,
        unitPrice,
        subtotal: itemSubtotal,
      });
    }

    // 2. Validate and calculate Coupon Discount using central coupon calculation engine
    let discount = new Prisma.Decimal(0);
    let appliedCoupon = null;

    if (cart.couponId) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          id: cart.couponId,
          deletedAt: null,
        },
      });

      if (coupon) {
        let customerOrderCountWithCoupon = 0;
        if (coupon.usagePerCustomer !== null) {
          const targetEmail = (guestShippingAddress?.email || (cart as any).shippingAddress?.email || "").trim();
          if (identifier.customerId || targetEmail) {
            customerOrderCountWithCoupon = await prisma.order.count({
              where: {
                couponId: coupon.id,
                status: { not: "Cancelled" },
                OR: [
                  ...(identifier.customerId ? [{ customerId: identifier.customerId }] : []),
                  ...(targetEmail ? [{ customerEmail: { equals: targetEmail, mode: "insensitive" as const } }] : []),
                ],
              },
            });
          }
        }

        const calcResult = calculateCouponDiscount({
          coupon,
          items: validatedItems,
          customerId: identifier.customerId,
          customerOrderCountWithCoupon,
        });

        if (calcResult.isValid) {
          discount = calcResult.discountAmount;
          appliedCoupon = {
            id: coupon.id,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: calcResult.discountValue,
            isFreeShipping: calcResult.isFreeShipping,
          };
        } else {
          // Remove invalid/expired coupon automatically from cart session
          await prisma.cart.update({
            where: identifier.customerId ? { customerId: identifier.customerId } : { sessionId: identifier.sessionId },
            data: { couponId: null },
          });
        }
      }
    }

    // 3. Address validations
    let shippingAddress = guestShippingAddress || null;
    let billingAddress = null;

    if (!shippingAddress && cart.shippingAddressId) {
      shippingAddress = await prisma.customerAddress.findFirst({
        where: identifier.customerId ? { id: cart.shippingAddressId, customerId: identifier.customerId } : { id: cart.shippingAddressId },
      });
    }

    if (cart.billingAddressId) {
      billingAddress = await prisma.customerAddress.findFirst({
        where: identifier.customerId ? { id: cart.billingAddressId, customerId: identifier.customerId } : { id: cart.billingAddressId },
      });
    }

    // 4. Calculate Shipping Fees using central server-authoritative Shipping Calculator
    const shippingSetting = await prisma.shippingSetting.findFirst();
    const shippingCalcResult = calculateShippingFee({
      subtotal,
      shippingAddress,
      appliedCoupon,
      shippingSetting,
    });
    const shipping = shippingCalcResult.shippingFee;

    // 5. Calculate Tax using central server-authoritative Tax Calculator loading TaxSetting from DB
    const taxSetting = await prisma.taxSetting.findFirst();
    const netSubtotal = Prisma.Decimal.max(0, subtotal.sub(discount));
    const taxCalcResult = calculateTax({
      netSubtotal,
      taxSetting,
    });
    const tax = taxCalcResult.taxAmount;

    // 6. Calculate Grand Total
    // If prices include tax, tax is embedded in netSubtotal, so grandTotal = netSubtotal + shipping.
    // If prices exclude tax, tax is added on top, so grandTotal = netSubtotal + shipping + tax.
    const grandTotal = taxCalcResult.pricesIncludeTax
      ? netSubtotal.add(shipping).toDecimalPlaces(2)
      : netSubtotal.add(shipping).add(tax).toDecimalPlaces(2);

    return {
      cartId: cart.id,
      customerId: identifier.customerId,
      items: validatedItems,
      subtotal,
      discount,
      shipping,
      tax,
      grandTotal,
      coupon: appliedCoupon,
      shippingAddress,
      billingAddress,
      paymentMethod: cart.paymentMethod,
      shippingMethod: shippingCalcResult.isFreeShipping ? "free" : "standard",
      deliveryZone: shippingCalcResult.deliveryZone,
      isAddressComplete: shippingCalcResult.isAddressComplete,
      pricesIncludeTax: taxCalcResult.pricesIncludeTax,
      taxRate: taxCalcResult.taxRate,
    };
  }

  /**
   * Applies a coupon code to the user checkout session
   */
  static async applyCoupon(identifier: CartIdentifier, couponCode: string) {
    if (!couponCode || !couponCode.trim()) {
      throw new AppError("Coupon code is required", 400, "BAD_REQUEST");
    }

    const coupon = await prisma.coupon.findFirst({
      where: {
        code: { equals: couponCode.trim(), mode: "insensitive" },
        deletedAt: null,
      },
    });

    if (!coupon) {
      throw new AppError("Coupon is invalid, inactive, or expired", 404, "INVALID_COUPON");
    }

    const cart = await prisma.cart.findFirst({
      where: identifier.customerId ? { customerId: identifier.customerId } : { sessionId: identifier.sessionId },
      include: {
        items: {
          include: {
            product: { select: { id: true, categoryId: true, brandId: true, price: true, isActive: true, status: true, deletedAt: true } },
            variant: { select: { id: true, price: true, isActive: true, deletedAt: true } },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new AppError("Cart is empty", 400, "EMPTY_CART");
    }

    const validCartItems = cart.items.filter(
      (item) =>
        item.product &&
        item.product.isActive &&
        item.product.status === "Active" &&
        !item.product.deletedAt &&
        (!item.variantId || (item.variant && item.variant.isActive && !item.variant.deletedAt))
    );

    if (validCartItems.length === 0) {
      throw new AppError("Cart has no available items", 400, "EMPTY_CART");
    }

    const couponItems = validCartItems.map((item) => {
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

    let customerOrderCountWithCoupon = 0;
    if (coupon.usagePerCustomer !== null) {
      const targetEmail = ((cart as any).shippingAddress?.email || "").trim();
      if (identifier.customerId || targetEmail) {
        customerOrderCountWithCoupon = await prisma.order.count({
          where: {
            couponId: coupon.id,
            status: { not: "Cancelled" },
            OR: [
              ...(identifier.customerId ? [{ customerId: identifier.customerId }] : []),
              ...(targetEmail ? [{ customerEmail: { equals: targetEmail, mode: "insensitive" as const } }] : []),
            ],
          },
        });
      }
    }

    const calcResult = calculateCouponDiscount({
      coupon,
      items: couponItems,
      customerId: identifier.customerId,
      customerOrderCountWithCoupon,
    });

    if (!calcResult.isValid) {
      throw new AppError(calcResult.errorMessage || "Cannot apply coupon", 400, calcResult.errorCode || "INVALID_COUPON");
    }

    // Update cart with applied coupon
    await prisma.cart.update({
      where: identifier.customerId ? { customerId: identifier.customerId } : { sessionId: identifier.sessionId },
      data: { couponId: coupon.id },
    });

    return this.getCheckoutSession(identifier);
  }

  /**
   * Removes any applied coupon from the user checkout session
   */
  static async removeCoupon(identifier: CartIdentifier) {
    const whereClause = identifier.customerId
      ? { customerId: identifier.customerId }
      : { sessionId: identifier.sessionId };

    const cart = await prisma.cart.findFirst({
      where: whereClause,
    });

    if (cart && cart.couponId) {
      await prisma.cart.update({
        where: whereClause,
        data: { couponId: null },
      });
    }

    return this.getCheckoutSession(identifier);
  }

  /**
   * Saves shipping and billing address selections to user's cart session
   */
  static async updateAddresses(
    identifier: CartIdentifier,
    shippingAddressId: string,
    billingAddressId?: string
  ) {
    const shippingAddress = await prisma.customerAddress.findFirst({
      where: { id: shippingAddressId, customerId: identifier.customerId! },
    });

    if (!shippingAddress) {
      throw new AppError("Shipping address not found or unauthorized", 404, "ADDRESS_NOT_FOUND");
    }

    let resolvedBillingAddressId = shippingAddressId;

    if (billingAddressId) {
      const billingAddress = await prisma.customerAddress.findFirst({
        where: { id: billingAddressId, customerId: identifier.customerId! },
      });

      if (!billingAddress) {
        throw new AppError("Billing address not found or unauthorized", 404, "ADDRESS_NOT_FOUND");
      }
      resolvedBillingAddressId = billingAddressId;
    }

    await prisma.cart.update({
      where: identifier.customerId ? { customerId: identifier.customerId } : { sessionId: identifier.sessionId },
      data: {
        shippingAddressId,
        billingAddressId: resolvedBillingAddressId,
      },
    });

    return this.getCheckoutSession(identifier);
  }

  /**
   * Places the order, updates inventories, clears the cart inside a Prisma transaction.
   * All financial calculations (subtotal, discount, shipping, tax, grandTotal) are computed
   * strictly from authoritative database state inside the transaction block.
   */
  static async completeCheckout(
    identifier: CartIdentifier,
    paymentMethod: string,
    clientId?: string,
    sessionId?: string,
    shippingAddressObj?: any,
    billingAddressObj?: any
  ) {
    // Capture clientId and sessionId from checkout payload for analytics scope
    if (clientId || sessionId) {
      console.log(`[Analytics] Checkout session captured for customer ${identifier.customerId || identifier.sessionId}: clientId=${clientId}, sessionId=${sessionId}`);
    }

    const supportedProviders = ["COD", "STRIPE", "BKASH", "NAGAD", "SSLCOMMERZ"];
    const normalizedPaymentMethod = (paymentMethod || "").toUpperCase();
    if (!supportedProviders.includes(normalizedPaymentMethod)) {
      throw new AppError(`Invalid payment method: ${paymentMethod}`, 400, "INVALID_PAYMENT_METHOD");
    }

    // Perform complete checkout execution within a strict database transaction
    const lowStockAlerts: any[] = [];
    const order = await prisma.$transaction(async (tx) => {
      // 1. Fetch current cart and items from database inside transaction
      const cart = await tx.cart.findFirst({
        where: identifier.customerId ? { customerId: identifier.customerId } : { sessionId: identifier.sessionId },
        include: {
          items: true,
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new AppError("Cart is empty or already processed", 400, "EMPTY_CART");
      }

      // 2. Resolve final shipping and billing addresses
      let finalShippingAddress = shippingAddressObj || null;
      if (!finalShippingAddress && cart.shippingAddressId) {
        finalShippingAddress = await tx.customerAddress.findFirst({
          where: identifier.customerId ? { id: cart.shippingAddressId, customerId: identifier.customerId } : { id: cart.shippingAddressId },
        });
      }

      let finalBillingAddress = null;
      if (billingAddressObj && billingAddressObj.sameAsShipping === true) {
        finalBillingAddress = finalShippingAddress;
      } else if (billingAddressObj) {
        finalBillingAddress = billingAddressObj;
      } else if (cart.billingAddressId) {
        finalBillingAddress = await tx.customerAddress.findFirst({
          where: identifier.customerId ? { id: cart.billingAddressId, customerId: identifier.customerId } : { id: cart.billingAddressId },
        });
      }
      if (!finalBillingAddress) {
        finalBillingAddress = finalShippingAddress;
      }

      if (!finalShippingAddress) {
        throw new AppError("Shipping address is required to complete checkout", 400, "MISSING_SHIPPING_ADDRESS");
      }

      // 3. Re-read fresh Product / Variant pricing and Inventory state inside transaction
      const validatedItems = [];
      let subtotal = new Prisma.Decimal(0);
      const itemWarehouseMap = new Map<string, string | null>();

      for (const item of cart.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { inventory: true, category: true },
        });

        if (!product || !product.isActive || product.status !== "Active" || product.deletedAt) {
          throw new AppError(`Product "${product?.name || "Unknown"}" has become unavailable`, 404, "PRODUCT_UNAVAILABLE");
        }

        let variant: any = null;
        if (item.variantId) {
          variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            include: { inventories: true },
          });

          if (!variant || !variant.isActive || variant.deletedAt) {
            throw new AppError(`Selected variant for "${product.name}" has become unavailable`, 404, "VARIANT_UNAVAILABLE");
          }
        }

        // Fresh price read from DB inside transaction
        const unitPrice = variant
          ? new Prisma.Decimal(variant.price)
          : new Prisma.Decimal(product.price || 0);

        const itemSubtotal = unitPrice.mul(item.quantity);
        subtotal = subtotal.add(itemSubtotal);

        // Re-check inventory levels & deduct stock
        if (product.trackInventory) {
          if (variant) {
            let availableStock = variant.inventories.reduce(
              (sum: number, inv: any) => sum + (inv.quantityAvailable - inv.quantityReserved),
              0
            );

            const useFallback = availableStock === 0 && variant.inventories.length === 0 && product.inventory;
            if (useFallback) {
              availableStock = product.inventory.quantityAvailable - product.inventory.quantityReserved;
            }

            if (item.quantity > availableStock) {
              throw new AppError(`Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${item.quantity}`, 409, "INSUFFICIENT_STOCK");
            }

            if (useFallback) {
              const previousAvailable = product.inventory.quantityAvailable;
              const threshold = product.inventory.lowStockThreshold;
              const updated = await tx.inventory.updateMany({
                where: {
                  id: product.inventory.id,
                  quantityAvailable: { gte: item.quantity + product.inventory.quantityReserved }
                },
                data: {
                  quantityAvailable: { decrement: item.quantity },
                },
              });
              if (updated.count === 0) {
                throw new AppError(`Insufficient stock for "${product.name}" during checkout.`, 409, "INSUFFICIENT_STOCK");
              }
              if (previousAvailable >= threshold && (previousAvailable - item.quantity) < threshold) {
                lowStockAlerts.push({ product, variant, currentStock: previousAvailable - item.quantity, threshold });
              }
              itemWarehouseMap.set(item.id, product.inventory.warehouseId || null);
            } else {
              const targetInventory = variant.inventories.find(
                (inv: any) => (inv.quantityAvailable - inv.quantityReserved) >= item.quantity
              ) || variant.inventories[0];

              if (targetInventory) {
                const previousAvailable = targetInventory.quantityAvailable;
                const threshold = targetInventory.lowStockThreshold;
                const updated = await tx.inventory.updateMany({
                  where: {
                    id: targetInventory.id,
                    quantityAvailable: { gte: item.quantity + targetInventory.quantityReserved }
                  },
                  data: {
                    quantityAvailable: { decrement: item.quantity },
                  },
                });
                if (updated.count === 0) {
                  throw new AppError(`Insufficient stock for "${product.name}" during checkout.`, 409, "INSUFFICIENT_STOCK");
                }
                if (previousAvailable >= threshold && (previousAvailable - item.quantity) < threshold) {
                  lowStockAlerts.push({ product, variant, currentStock: previousAvailable - item.quantity, threshold });
                }
                itemWarehouseMap.set(item.id, targetInventory.warehouseId || null);
              }
            }
          } else {
            if (!product.inventory) {
              throw new AppError(`Inventory tracking is enabled but no inventory record found for "${product.name}"`, 409, "INSUFFICIENT_STOCK");
            }

            const availableStock = product.inventory.quantityAvailable - product.inventory.quantityReserved;

            if (item.quantity > availableStock) {
              throw new AppError(`Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${item.quantity}`, 409, "INSUFFICIENT_STOCK");
            }

            const previousAvailable = product.inventory.quantityAvailable;
            const threshold = product.inventory.lowStockThreshold;
            const updated = await tx.inventory.updateMany({
              where: {
                id: product.inventory.id,
                quantityAvailable: { gte: item.quantity + product.inventory.quantityReserved }
              },
              data: {
                quantityAvailable: { decrement: item.quantity },
              },
            });
            if (updated.count === 0) {
              throw new AppError(`Insufficient stock for "${product.name}" during checkout.`, 409, "INSUFFICIENT_STOCK");
            }
            if (previousAvailable >= threshold && (previousAvailable - item.quantity) < threshold) {
              lowStockAlerts.push({ product, variant: null, currentStock: previousAvailable - item.quantity, threshold });
            }
            itemWarehouseMap.set(item.id, product.inventory.warehouseId || null);
          }
        }

        validatedItems.push({
          id: item.id,
          productId: item.productId,
          categoryId: product.categoryId,
          brandId: product.brandId,
          productName: product.name,
          productSlug: product.slug,
          variantId: item.variantId,
          variantSku: variant?.sku || null,
          quantity: item.quantity,
          unitPrice,
          subtotal: itemSubtotal,
        });
      }

      // 4. Re-read Coupon & Usage Limits inside transaction
      let discount = new Prisma.Decimal(0);
      let coupon: any = null;

      if (cart.couponId) {
        // Lock row to prevent coupon usage race condition
        await tx.$executeRaw`SELECT id FROM "Coupon" WHERE id = ${cart.couponId} FOR UPDATE`;

        coupon = await tx.coupon.findFirst({
          where: { id: cart.couponId, deletedAt: null },
        });

        if (!coupon || !coupon.isActive) {
          throw new AppError("Coupon is no longer available or active", 400, "COUPON_UNAVAILABLE");
        }

        const now = new Date();
        const validFrom = new Date(coupon.validFrom);
        const validUntil = new Date(coupon.validUntil);
        if (now < validFrom || now > validUntil) {
          throw new AppError("Coupon code is expired or not yet valid", 400, "EXPIRED_COUPON");
        }

        if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
          throw new AppError("Coupon usage limit exceeded", 400, "COUPON_LIMIT_REACHED");
        }

        let targetEmail = ((finalShippingAddress && finalShippingAddress.email) || (finalBillingAddress && finalBillingAddress.email) || "").trim();
        if (!targetEmail && identifier.customerId) {
          const custRecord = await tx.customer.findUnique({
            where: { id: identifier.customerId },
            select: { email: true },
          });
          if (custRecord?.email) {
            targetEmail = custRecord.email.trim();
          }
        }

        if (coupon.usagePerCustomer !== null) {
          if (identifier.customerId || targetEmail) {
            const customerOrderCountWithCoupon = await tx.order.count({
              where: {
                couponId: coupon.id,
                status: { not: "Cancelled" },
                OR: [
                  ...(identifier.customerId ? [{ customerId: identifier.customerId }] : []),
                  ...(targetEmail ? [{ customerEmail: { equals: targetEmail, mode: "insensitive" as const } }] : []),
                ],
              },
            });

            if (customerOrderCountWithCoupon >= coupon.usagePerCustomer) {
              throw new AppError("You have reached the maximum usage limit for this coupon", 400, "CUSTOMER_LIMIT_REACHED");
            }
          }
        }

        const calcResult = calculateCouponDiscount({
          coupon,
          items: validatedItems,
          customerId: identifier.customerId,
          customerOrderCountWithCoupon: 0,
        });

        if (!calcResult.isValid) {
          throw new AppError(calcResult.errorMessage || "Coupon is invalid for this order", 400, calcResult.errorCode || "INVALID_COUPON");
        }

        discount = calcResult.discountAmount;

        // Increment usedCount safely inside transaction
        if (coupon.usageLimit !== null) {
          const updated = await tx.coupon.updateMany({
            where: { id: coupon.id, usedCount: { lt: coupon.usageLimit } },
            data: { usedCount: { increment: 1 } },
          });
          if (updated.count === 0) {
            throw new AppError("Coupon usage limit exceeded during checkout", 400, "COUPON_LIMIT_REACHED");
          }
        } else {
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        }
      }

      // 5. Re-read Shipping & Tax Settings inside transaction
      const netSubtotal = Prisma.Decimal.max(0, subtotal.sub(discount));

      const shippingSetting = await tx.shippingSetting.findFirst();
      const shippingCalcResult = calculateShippingFee({
        subtotal,
        shippingAddress: finalShippingAddress,
        appliedCoupon: coupon ? { discountType: coupon.discountType, isFreeShipping: coupon.discountType === "free_shipping" } : null,
        shippingSetting,
      });
      const shippingFee = shippingCalcResult.shippingFee;

      const taxSetting = await tx.taxSetting.findFirst();
      const taxCalcResult = calculateTax({
        netSubtotal,
        taxSetting,
      });
      const taxAmount = taxCalcResult.taxAmount;

      const grandTotal = taxCalcResult.pricesIncludeTax
        ? netSubtotal.add(shippingFee).toDecimalPlaces(2)
        : netSubtotal.add(shippingFee).add(taxAmount).toDecimalPlaces(2);

      // 6. Generate secure Order Number
      const randomPart = Math.floor(100000 + Math.random() * 900000);
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${randomPart}`;

      let resolvedCustomerEmail = ((finalShippingAddress && finalShippingAddress.email) || (finalBillingAddress && finalBillingAddress.email) || "").trim() || null;
      if (!resolvedCustomerEmail && identifier.customerId) {
        const custRecord = await tx.customer.findUnique({
          where: { id: identifier.customerId },
          select: { email: true },
        });
        if (custRecord?.email) {
          resolvedCustomerEmail = custRecord.email.trim();
        }
      }

      // 7. Create Order using exact authoritative calculated values
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: identifier.customerId || null,
          status: "Pending",
          paymentStatus: "Unpaid",
          totalAmount: grandTotal,
          customerEmail: resolvedCustomerEmail,
          subtotal: subtotal.toDecimalPlaces(2),
          taxAmount: taxAmount.toDecimalPlaces(2),
          shippingFee: shippingFee.toDecimalPlaces(2),
          discountAmount: discount.toDecimalPlaces(2),
          shippingAddress: this.formatAddress(finalShippingAddress),
          billingAddress: this.formatAddress(finalBillingAddress),
          paymentMethod: normalizedPaymentMethod,
          couponId: coupon?.id || null,
        },
      });

      // 8. Create Order Items
      const orderItemPayloads = validatedItems.map((item) => ({
        orderId: newOrder.id,
        productId: item.productId,
        productVariantId: item.variantId || null,
        warehouseId: itemWarehouseMap.get(item.id) || null,
        quantity: item.quantity,
        price: item.unitPrice,
        productName: item.productName,
        productSku: item.productSlug,
        variantSku: item.variantSku,
        subtotal: item.subtotal,
        total: item.subtotal,
      }));

      await tx.orderItem.createMany({
        data: orderItemPayloads,
      });

      // 9. Log Order Timeline Event
      await tx.orderTimeline.create({
        data: {
          orderId: newOrder.id,
          status: "Pending",
          action: "Order successfully placed and checked out.",
        },
      });

      // 10. Create Payment record with EXACT same grandTotal amount
      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          customerId: identifier.customerId || null,
          provider: normalizedPaymentMethod as any,
          amount: grandTotal,
          currency: "BDT",
          status: "PENDING",
        }
      });

      // 11. Clear Cart items and Cart session state
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: {
          couponId: null,
          shippingAddressId: null,
          billingAddressId: null,
          paymentMethod: null,
        },
      });

      return newOrder;
    });

    try {
      if (identifier.customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: identifier.customerId },
          select: { email: true, firstName: true, lastName: true }
        });
        if (customer && customer.email) {
          const fullOrder = await prisma.order.findUnique({
            where: { id: order.id },
            include: { items: true }
          });
          if (fullOrder) {
            emailService.sendOrderConfirmationEmail(customer, fullOrder).catch((err) => {
              console.error(`[Email Service] Failed to send order confirmation to ${customer.email}`);
            });
            emailService.sendAdminOrderNotificationEmail(fullOrder).catch(() => {});
          }
        }
      } else if (order.customerEmail) {
         try {
            const fullOrder = await prisma.order.findUnique({
              where: { id: order.id },
              include: { items: true }
            });
            if (fullOrder) {
              const guestCustomer = { email: order.customerEmail, firstName: "Guest" };
              emailService.sendOrderConfirmationEmail(guestCustomer, fullOrder).catch((err) => {
                console.error(`[Email Service] Failed to send order confirmation to guest email ${guestCustomer.email}`);
              });
              emailService.sendAdminOrderNotificationEmail(fullOrder).catch(() => {});
            }
         } catch(e) { }
      }
          for (const alert of lowStockAlerts) {
        emailService.sendAdminLowStockEmail(alert.product, alert.variant, alert.currentStock, alert.threshold).catch(() => {});
      }
    } catch (err) {
      console.error(`[Email Service] Error in confirmation email block:`, err);
    }

    return mapOrderToStorefrontDTO(order);
  }
}
