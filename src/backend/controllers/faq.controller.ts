import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { prisma } from "../config/db";
import { sanitizeRichText } from "../utils/richTextSanitizer";

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.fAQ.findMany({
      where: { deletedAt: null },
      include: { category: true },
      orderBy: { orderIndex: 'asc' }
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const item = await prisma.fAQ.findFirst({
      where: { id, deletedAt: null },
      include: { category: true }
    });
    if (!item) throw new AppError('fAQ not found', 404, "NOT_FOUND");
    res.json(item);
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = { ...req.body };
    if (data.answer) data.answer = sanitizeRichText(data.answer);

    const newItem = await prisma.fAQ.create({
      data,
      include: { category: true }
    });
    res.status(201).json(newItem);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.answer) data.answer = sanitizeRichText(data.answer);

    const updated = await prisma.fAQ.update({
      where: { id },
      data,
      include: { category: true }
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.fAQ.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// FAQ Category API Handlers
export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.fAQCategory.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    if (!name) throw new AppError('Category name is required', 400, "BAD_REQUEST");
    
    const existing = await prisma.fAQCategory.findUnique({ where: { name } });
    if (existing) throw new AppError('Category with this name already exists', 400, "BAD_REQUEST");

    const item = await prisma.fAQCategory.create({
      data: { name, description }
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const category = await prisma.fAQCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new AppError('Category not found', 404, "NOT_FOUND");
    }

    // Check if any FAQs (active, inactive, or archived) are linked to this category
    const linkedCount = await prisma.fAQ.count({
      where: { categoryId: id }
    });
    if (linkedCount > 0) {
      throw new AppError('Cannot delete category because it contains FAQs', 400, "BAD_REQUEST");
    }

    await prisma.fAQCategory.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
