import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";

export const getAllPopups = asyncHandler(async (req: Request, res: Response) => {
  const { type, status } = req.query;

  const whereCondition: any = { deletedAt: null };

  if (type) {
    whereCondition.type = String(type);
  }

  if (status === "active") {
    whereCondition.isActive = true;
  } else if (status === "inactive") {
    whereCondition.isActive = false;
  }

  const popups = await prisma.popup.findMany({
    where: whereCondition,
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({ success: true, data: popups });
});

export const getPopupById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const popup = await prisma.popup.findFirst({
    where: { id, deletedAt: null },
  });

  if (!popup) {
    throw new AppError("Popup not found", 404, "NOT_FOUND");
  }

  res.status(200).json({ success: true, data: popup });
});

export const createPopup = asyncHandler(async (req: Request, res: Response) => {
  const { title, type, headline, body, couponCode, imageUrl, delaySeconds, isActive } = req.body;

  if (!title) {
    throw new AppError("Title is required", 400, "BAD_REQUEST");
  }

  const popup = await prisma.popup.create({
    data: {
      title,
      type: type || "homepage",
      headline,
      body,
      couponCode,
      imageUrl,
      delaySeconds: delaySeconds ? Number(delaySeconds) : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    },
  });

  res.status(201).json({ success: true, data: popup });
});

export const updatePopup = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, type, headline, body, couponCode, imageUrl, delaySeconds, isActive } = req.body;

  const existing = await prisma.popup.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    throw new AppError("Popup not found", 404, "NOT_FOUND");
  }

  const updated = await prisma.popup.update({
    where: { id },
    data: {
      title: title || existing.title,
      type: type || existing.type,
      headline: headline !== undefined ? headline : existing.headline,
      body: body !== undefined ? body : existing.body,
      couponCode: couponCode !== undefined ? couponCode : existing.couponCode,
      imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
      delaySeconds: delaySeconds !== undefined ? Number(delaySeconds) : existing.delaySeconds,
      isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
    },
  });

  res.status(200).json({ success: true, data: updated });
});

export const deletePopup = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.popup.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    throw new AppError("Popup not found", 404, "NOT_FOUND");
  }

  await prisma.popup.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  res.status(200).json({ success: true, message: "Popup deleted successfully" });
});
