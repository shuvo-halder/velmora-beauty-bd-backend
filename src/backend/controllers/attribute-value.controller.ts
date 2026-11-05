import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";

export const createAttributeValue = asyncHandler(async (req: Request, res: Response) => {
  const { attributeId, value } = req.body;

  if (!attributeId || !value) {
    throw new AppError("Attribute ID and value are required", 400, "VALIDATION_ERROR");
  }

  const existingAttribute = await prisma.attribute.findUnique({ where: { id: attributeId } });
  if (!existingAttribute) {
    throw new AppError("Attribute not found", 404, "NOT_FOUND");
  }

  const attributeValue = await prisma.attributeValue.create({
    data: { attributeId, value },
  });

  res.status(201).json({ success: true, data: attributeValue });
});

export const updateAttributeValue = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { value } = req.body;

  if (!value) {
    throw new AppError("Value is required", 400, "VALIDATION_ERROR");
  }

  const existingValue = await prisma.attributeValue.findUnique({ where: { id } });
  if (!existingValue) {
    throw new AppError("Attribute value not found", 404, "NOT_FOUND");
  }

  const attributeValue = await prisma.attributeValue.update({
    where: { id },
    data: { value },
  });

  res.status(200).json({ success: true, data: attributeValue });
});

export const deleteAttributeValue = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const existingValue = await prisma.attributeValue.findUnique({ where: { id } });
  if (!existingValue) {
    throw new AppError("Attribute value not found", 404, "NOT_FOUND");
  }

  await prisma.attributeValue.delete({ where: { id } });

  res.status(200).json({ success: true, message: "Attribute value deleted successfully" });
});
