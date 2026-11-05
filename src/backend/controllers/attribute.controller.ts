import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";

export const getAllAttributes = asyncHandler(async (req: Request, res: Response) => {
  const attributes = await prisma.attribute.findMany({
    include: { values: true },
    orderBy: { name: 'asc' },
  });
  res.status(200).json({ success: true, data: attributes });
});

export const getAttributeById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const attribute = await prisma.attribute.findUnique({
    where: { id },
    include: { values: true },
  });

  if (!attribute) {
    throw new AppError("Attribute not found", 404, "NOT_FOUND");
  }

  res.status(200).json({ success: true, data: attribute });
});

export const createAttribute = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name) {
    throw new AppError("Name is required", 400, "VALIDATION_ERROR");
  }

  const attribute = await prisma.attribute.create({
    data: { name },
  });

  res.status(201).json({ success: true, data: attribute });
});

export const updateAttribute = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    throw new AppError("Name is required", 400, "VALIDATION_ERROR");
  }

  const existingAttribute = await prisma.attribute.findUnique({ where: { id } });
  if (!existingAttribute) {
    throw new AppError("Attribute not found", 404, "NOT_FOUND");
  }

  const attribute = await prisma.attribute.update({
    where: { id },
    data: { name },
  });

  res.status(200).json({ success: true, data: attribute });
});

export const deleteAttribute = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const existingAttribute = await prisma.attribute.findUnique({ where: { id } });
  if (!existingAttribute) {
    throw new AppError("Attribute not found", 404, "NOT_FOUND");
  }

  await prisma.attribute.delete({ where: { id } });

  res.status(200).json({ success: true, message: "Attribute deleted successfully" });
});
