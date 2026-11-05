import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { prisma } from "../config/db";
import { sanitizeRichText } from "../utils/richTextSanitizer";

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.page.findMany({ where: { deletedAt: null } });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const item = await prisma.page.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new AppError('page not found', 404, "NOT_FOUND");
    res.json(item);
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = { ...req.body };
    if (data.content) data.content = sanitizeRichText(data.content);

    const newItem = await prisma.page.create({ data });
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

    const updated = await prisma.page.update({ where: { id }, data });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.page.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
