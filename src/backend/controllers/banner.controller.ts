import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";

export const getAllBanners = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query;

  const whereCondition: any = { deletedAt: null };

  if (status === "active") {
    whereCondition.isActive = true;
  } else if (status === "inactive") {
    whereCondition.isActive = false;
  }

  const banners = await prisma.banner.findMany({
    where: whereCondition,
    orderBy: [
      { priority: "desc" },
      { createdAt: "desc" },
    ],
  });

  res.status(200).json({ success: true, data: banners });
});

export const getBannerById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const banner = await prisma.banner.findFirst({
    where: { id, deletedAt: null },
  });

  if (!banner) {
    throw new AppError("Banner not found", 404, "NOT_FOUND");
  }

  res.status(200).json({ success: true, data: banner });
});

export const createBanner = asyncHandler(async (req: Request, res: Response) => {
  const { title, desktopImage, mobileImage, linkUrl, ctaText, startDate, endDate, priority, isActive } = req.body;

  if (!title || !desktopImage) {
    throw new AppError("Title and desktop image URL are required", 400, "BAD_REQUEST");
  }

  const banner = await prisma.banner.create({
    data: {
      title,
      desktopImage,
      mobileImage,
      linkUrl,
      ctaText,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      priority: priority ? Number(priority) : 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    },
  });

  res.status(201).json({ success: true, data: banner });
});

export const updateBanner = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, desktopImage, mobileImage, linkUrl, ctaText, startDate, endDate, priority, isActive } = req.body;

  const existing = await prisma.banner.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    throw new AppError("Banner not found", 404, "NOT_FOUND");
  }

  const updated = await prisma.banner.update({
    where: { id },
    data: {
      title: title || existing.title,
      desktopImage: desktopImage || existing.desktopImage,
      mobileImage: mobileImage !== undefined ? mobileImage : existing.mobileImage,
      linkUrl: linkUrl !== undefined ? linkUrl : existing.linkUrl,
      ctaText: ctaText !== undefined ? ctaText : existing.ctaText,
      startDate: startDate ? new Date(startDate) : existing.startDate,
      endDate: endDate ? new Date(endDate) : existing.endDate,
      priority: priority !== undefined ? Number(priority) : existing.priority,
      isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
    },
  });

  res.status(200).json({ success: true, data: updated });
});

export const deleteBanner = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.banner.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    throw new AppError("Banner not found", 404, "NOT_FOUND");
  }

  await prisma.banner.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  res.status(200).json({ success: true, message: "Banner deleted successfully" });
});
