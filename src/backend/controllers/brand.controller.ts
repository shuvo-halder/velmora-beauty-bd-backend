import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { sanitizeRichText } from "../utils/richTextSanitizer";

const generateSlug = (name: string) => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
};

export const getAllBrands = asyncHandler(async (req: Request, res: Response) => {
  const brands = await prisma.brand.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  });
  res.status(200).json({ success: true, data: brands });
});

export const getBrandById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const brand = await prisma.brand.findFirst({
    where: { id, deletedAt: null },
  });

  if (!brand) {
    throw new AppError("Brand not found", 404, "NOT_FOUND");
  }

  res.status(200).json({ success: true, data: brand });
});

export const createBrand = asyncHandler(async (req: Request, res: Response) => {
  const { name, logoUrl, website, description, isActive } = req.body;

  if (!name) {
    throw new AppError("Name is required", 400, "VALIDATION_ERROR");
  }

  const slug = generateSlug(name) + "-" + Math.random().toString(36).substring(2, 6);

  const brand = await prisma.brand.create({
    data: {
      name,
      slug,
      logoUrl,
      website,
      description: description ? sanitizeRichText(description) : description,
      isActive: isActive !== undefined ? isActive : true,
    },
  });

  res.status(201).json({ success: true, data: brand });
});

export const updateBrand = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, logoUrl, website, description, isActive } = req.body;

  const existingBrand = await prisma.brand.findFirst({ where: { id, deletedAt: null } });

  if (!existingBrand) {
    throw new AppError("Brand not found", 404, "NOT_FOUND");
  }

  const brand = await prisma.brand.update({
    where: { id },
    data: {
      name,
      ...(name && name !== existingBrand.name && { slug: generateSlug(name) + "-" + Math.random().toString(36).substring(2, 6) }),
      logoUrl,
      website,
      description: description !== undefined ? (description ? sanitizeRichText(description) : description) : undefined,
      isActive: isActive !== undefined ? isActive : existingBrand.isActive,
    },
  });

  res.status(200).json({ success: true, data: brand });
});

export const deleteBrand = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const existingBrand = await prisma.brand.findFirst({ where: { id, deletedAt: null } });

  if (!existingBrand) {
    throw new AppError("Brand not found", 404, "NOT_FOUND");
  }

  // Check for associated products
  const productsCount = await prisma.product.count({
    where: { brandId: id, deletedAt: null }
  });

  if (productsCount > 0) {
    throw new AppError("Cannot delete brand containing active products", 400, "VALIDATION_ERROR");
  }

  await prisma.brand.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  res.status(200).json({ success: true, message: "Brand deleted successfully" });
});
