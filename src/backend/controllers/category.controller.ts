import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { sanitizeRichText } from "../utils/richTextSanitizer";

const generateSlug = (name: string) => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
};

// Tree Builder Helper
const buildTree = (categories: any[], parentId: string | null = null): any[] => {
  return categories
    .filter((cat) => cat.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((cat) => ({
      ...cat,
      children: buildTree(categories, cat.id),
    }));
};

export const getAllCategories = asyncHandler(async (req: Request, res: Response) => {
  const { asTree } = req.query;

  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: { sortOrder: 'asc' },
  });

  if (asTree === 'true') {
    const tree = buildTree(categories);
    res.status(200).json({ success: true, data: tree });
  } else {
    res.status(200).json({ success: true, data: categories });
  }
});

export const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const category = await prisma.category.findFirst({
    where: { id, deletedAt: null },
    include: {
      parent: true,
      children: true,
    }
  });

  if (!category) {
    throw new AppError("Category not found", 404, "NOT_FOUND");
  }

  res.status(200).json({ success: true, data: category });
});

export const getCategoryBreadcrumb = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  let currentId: string | null = id;
  const breadcrumb = [];
  const maxDepth = 10;
  let depth = 0;

  while (currentId && depth < maxDepth) {
    const cat = await prisma.category.findFirst({
      where: { id: currentId, deletedAt: null },
      select: { id: true, name: true, slug: true, parentId: true }
    });

    if (!cat) break;
    breadcrumb.unshift({ id: cat.id, name: cat.name, slug: cat.slug });
    currentId = cat.parentId;
    depth++;
  }

  res.status(200).json({ success: true, data: breadcrumb });
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, image, icon, parentId, sortOrder, isActive, seoTitle, seoDescription } = req.body;

  if (!name) {
    throw new AppError("Name is required", 400, "VALIDATION_ERROR");
  }

  const slug = generateSlug(name) + "-" + Math.random().toString(36).substring(2, 6);

  const createData: any = {
    name,
    slug,
    description: description ? sanitizeRichText(description) : description,
    image,
    icon,
    sortOrder: sortOrder ? parseInt(sortOrder) : 0,
    isActive: isActive !== undefined ? isActive : true,
    metaTitle: seoTitle,
    metaDescription: seoDescription,
  };

  if (parentId) {
    createData.parent = {
      connect: { id: parentId }
    };
  }

  const category = await prisma.category.create({
    data: createData,
  });

  res.status(201).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, image, icon, parentId, sortOrder, isActive, seoTitle, seoDescription } = req.body;

  const existingCategory = await prisma.category.findFirst({ where: { id, deletedAt: null } });

  if (!existingCategory) {
    throw new AppError("Category not found", 404, "NOT_FOUND");
  }

  // Prevent setting itself as parent
  if (parentId === id) {
    throw new AppError("Category cannot be its own parent", 400, "VALIDATION_ERROR");
  }

  const updateData: any = {
    name,
    ...(name && { slug: generateSlug(name) + "-" + Math.random().toString(36).substring(2, 6) }),
    description: description !== undefined ? (description ? sanitizeRichText(description) : description) : undefined,
    image,
    icon,
    sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : existingCategory.sortOrder,
    isActive: isActive !== undefined ? isActive : existingCategory.isActive,
    metaTitle: seoTitle,
    metaDescription: seoDescription,
  };

  if (parentId) {
    updateData.parent = {
      connect: { id: parentId }
    };
  } else if (parentId === null || parentId === "") {
    updateData.parent = {
      disconnect: true
    };
  }

  const category = await prisma.category.update({
    where: { id },
    data: updateData,
  });

  res.status(200).json({ success: true, data: category });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const existingCategory = await prisma.category.findFirst({ 
    where: { id, deletedAt: null },
    include: { children: true }
  });

  if (!existingCategory) {
    throw new AppError("Category not found", 404, "NOT_FOUND");
  }

  if (existingCategory.children && existingCategory.children.length > 0) {
    throw new AppError("Cannot delete category with child categories", 400, "VALIDATION_ERROR");
  }

  // Check for associated products
  const productsCount = await prisma.product.count({
    where: { categoryId: id, deletedAt: null }
  });

  if (productsCount > 0) {
    throw new AppError("Cannot delete category containing active products", 400, "VALIDATION_ERROR");
  }

  await prisma.category.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  res.status(200).json({ success: true, message: "Category deleted successfully" });
});
