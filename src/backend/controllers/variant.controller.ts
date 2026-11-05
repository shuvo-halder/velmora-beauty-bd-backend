import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";

export const getProductVariants = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;

  const variants = await prisma.productVariant.findMany({
    where: { productId, deletedAt: null },
    include: {
      attributes: {
        include: {
          attributeValue: {
            include: {
              attribute: true
            }
          }
        }
      },
      images: true,
      inventories: true,
    },
  });

  res.status(200).json({ success: true, data: variants });
});

export const getVariantById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const variant = await prisma.productVariant.findFirst({
    where: { id, deletedAt: null },
    include: {
      attributes: {
        include: {
          attributeValue: {
            include: {
              attribute: true
            }
          }
        }
      },
      images: true,
      inventories: true,
    },
  });

  if (!variant) {
    throw new AppError("Variant not found", 404, "NOT_FOUND");
  }

  res.status(200).json({ success: true, data: variant });
});

export const createProductVariant = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { sku, price, compareAtPrice, costPrice, barcode, weight, isActive, attributes, quantity, image } = req.body;

  if (!sku || price === undefined) {
    throw new AppError("SKU and price are required", 400, "VALIDATION_ERROR");
  }

  // Check if product exists
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new AppError("Product not found", 404, "NOT_FOUND");
  }

  // Check if SKU exists
  const existingSku = await prisma.productVariant.findUnique({ where: { sku } });
  if (existingSku) {
    throw new AppError("SKU already exists", 400, "VALIDATION_ERROR");
  }

  const variant = await prisma.productVariant.create({
    data: {
      productId,
      sku,
      price,
      compareAtPrice,
      costPrice,
      barcode,
      weight,
      isActive: isActive !== undefined ? isActive : true,
      attributes: attributes && attributes.length > 0 ? {
        create: attributes.map((attrValueId: string) => ({
          attributeValueId: attrValueId
        }))
      } : undefined,
      inventories: quantity !== undefined ? {
        create: {
          quantityAvailable: quantity,
          quantity: quantity
        }
      } : undefined,
      images: image ? {
        create: {
          url: image,
          isPrimary: true,
          productId: productId
        }
      } : undefined
    },
    include: {
      attributes: {
        include: { attributeValue: { include: { attribute: true } } }
      },
      inventories: true,
      images: true
    }
  });

  res.status(201).json({ success: true, data: variant });
});

export const updateVariant = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { sku, price, compareAtPrice, costPrice, barcode, weight, isActive, attributes, quantity, image } = req.body;

  const existingVariant = await prisma.productVariant.findFirst({ where: { id, deletedAt: null } });
  if (!existingVariant) {
    throw new AppError("Variant not found", 404, "NOT_FOUND");
  }

  if (sku && sku !== existingVariant.sku) {
    const existingSku = await prisma.productVariant.findUnique({ where: { sku } });
    if (existingSku) {
      throw new AppError("SKU already exists", 400, "VALIDATION_ERROR");
    }
  }

  // Update variant attributes if provided
  if (attributes) {
    await prisma.variantAttributeValue.deleteMany({
      where: { variantId: id }
    });
  }

  const variant = await prisma.productVariant.update({
    where: { id },
    data: {
      sku,
      price,
      compareAtPrice,
      costPrice,
      barcode,
      weight,
      isActive,
      attributes: attributes ? {
        create: attributes.map((attrValueId: string) => ({
          attributeValueId: attrValueId
        }))
      } : undefined,
    },
    include: {
      attributes: {
        include: { attributeValue: { include: { attribute: true } } }
      },
      inventories: true,
      images: true
    }
  });

  // Handle inventory update
  if (quantity !== undefined) {
    const inventory = await prisma.inventory.findFirst({ where: { variantId: id } });
    if (inventory) {
      await prisma.inventory.update({
        where: { id: inventory.id },
        data: { quantityAvailable: quantity, quantity: quantity }
      });
    } else {
      await prisma.inventory.create({
        data: { variantId: id, quantityAvailable: quantity, quantity: quantity }
      });
    }
  }

  // Handle image update
  if (image) {
    const existingImage = await prisma.productImage.findFirst({ where: { productVariantId: id } });
    if (existingImage) {
      await prisma.productImage.update({
        where: { id: existingImage.id },
        data: { url: image }
      });
    } else {
      await prisma.productImage.create({
        data: { url: image, productVariantId: id, productId: variant.productId, isPrimary: true }
      });
    }
  }

  const updatedVariant = await prisma.productVariant.findFirst({
    where: { id },
    include: {
      attributes: {
        include: { attributeValue: { include: { attribute: true } } }
      },
      inventories: true,
      images: true
    }
  });

  res.status(200).json({ success: true, data: updatedVariant });
});

export const deleteVariant = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const existingVariant = await prisma.productVariant.findFirst({ where: { id, deletedAt: null } });
  if (!existingVariant) {
    throw new AppError("Variant not found", 404, "NOT_FOUND");
  }

  await prisma.productVariant.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  res.status(200).json({ success: true, message: "Variant deleted successfully" });
});
