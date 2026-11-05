import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { prisma } from "../config/db";
import { sanitizeRichText } from "../utils/richTextSanitizer";

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.blogPost.findMany({ where: { deletedAt: null } });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const item = await prisma.blogPost.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new AppError('blogPost not found', 404, "NOT_FOUND");
    res.json(item);
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = { ...req.body };
    if (data.content) data.content = sanitizeRichText(data.content);
    if (data.excerpt) data.excerpt = sanitizeRichText(data.excerpt);

    const newItem = await prisma.blogPost.create({ data });
    res.status(201).json(newItem);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (data.content) data.content = sanitizeRichText(data.content);
    if (data.excerpt) data.excerpt = sanitizeRichText(data.excerpt);

    const updated = await prisma.blogPost.update({ where: { id }, data });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.blogPost.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
