import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { cloudinary, isCloudinaryConfigured } from "../config/cloudinary";

export class AdminReviewService {
  static async getStats() {
    const [total, pending, approved, rejected, hidden, verified] = await Promise.all([
      prisma.review.count(),
      prisma.review.count({ where: { status: 'PENDING' } }),
      prisma.review.count({ where: { status: 'APPROVED' } }),
      prisma.review.count({ where: { status: 'REJECTED' } }),
      prisma.review.count({ where: { status: 'HIDDEN' } }),
      prisma.review.count({ where: { isVerifiedPurchase: true } }),
    ]);
    
    const ratingStats = await prisma.review.aggregate({
      _avg: { rating: true }, where: { status: "APPROVED" }
    });
    return { 
      total, pending, approved, rejected, hidden, verified, 
      averageRating: ratingStats._avg.rating ? ratingStats._avg.rating.toFixed(1) : 0 
    };
  
  }

  static async listReviews(query: any) {
    let { page = 1, limit = 20, status, productId, rating, keyword, isVerifiedPurchase, startDate, endDate } = query;
    page = Number(page); limit = Number(limit);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (productId) where.productId = productId;
    if (rating) where.rating = Number(rating);
    if (isVerifiedPurchase !== undefined && isVerifiedPurchase !== "") {
      where.isVerifiedPurchase = isVerifiedPurchase === "true" || isVerifiedPurchase === true;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    if (keyword) {
      where.OR = [
        { customerName: { contains: String(keyword), mode: "insensitive" } },
        { customerEmail: { contains: String(keyword), mode: "insensitive" } },
        { headline: { contains: String(keyword), mode: "insensitive" } },
        { comment: { contains: String(keyword), mode: "insensitive" } }
      ];
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          product: { select: { name: true, slug: true } },
          images: true
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit)
      }),
      prisma.review.count({ where })
    ]);

    return {
      reviews,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  }

  static async getReview(id: string) {
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        product: { select: { name: true, slug: true } },
        images: true,
        orderItem: {
          include: {
            order: true
          }
        }
      }
    });
    if (!review) throw new AppError("Review not found", 404, "NOT_FOUND");
    return review;
  }

  static async updateStatus(id: string, status: "APPROVED" | "REJECTED" | "HIDDEN") {
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) throw new AppError("Review not found", 404, "NOT_FOUND");
    
    // Status transition rules (P1 rules)
    // A status update must never accidentally expose a non-approved review through the public API.
    // PENDING -> APPROVED
    // PENDING -> REJECTED
    // APPROVED -> HIDDEN
    // APPROVED -> REJECTED
    // REJECTED -> APPROVED 
    // HIDDEN -> APPROVED
    
    // Enforcing basic transition rules
    const validTransitions = {
      "PENDING": ["APPROVED", "REJECTED"],
      "APPROVED": ["HIDDEN", "REJECTED"],
      "REJECTED": ["APPROVED"],
      "HIDDEN": ["APPROVED"]
    };

    if (!validTransitions[existing.status].includes(status)) {
       throw new AppError(`Cannot transition from ${existing.status} to ${status}`, 400, "INVALID_TRANSITION");
    }

    const reviewUpdate = await prisma.review.updateMany({
      where: { id, status: existing.status },
      data: { status }
    });
    
    if (reviewUpdate.count === 0) {
      throw new AppError("Review status was modified concurrently", 409, "CONCURRENCY_ERROR");
    }
    
    return await prisma.review.findUnique({ where: { id } });
  }

  static async updateAdminResponse(id: string, adminResponse: string | null) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new AppError("Review not found", 404, "NOT_FOUND");

    return await prisma.review.update({
      where: { id },
      data: { adminResponse }
    });
  }

  static async deleteReview(id: string) {
    // 1. Fetch Review + ReviewImages
    const review = await prisma.review.findUnique({
      where: { id },
      include: { images: true }
    });

    if (!review) {
      throw new AppError("Review not found", 404, "NOT_FOUND");
    }

    // 2. Archive DB Record
    try {
      await prisma.review.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
    } catch (e: any) {
      if (e.code === 'P2025') {
        // Already deleted concurrently
        return { success: true };
      }
      throw e;
    }

    // Images are not destroyed from Cloudinary because the review is only soft-deleted
    // and remains visible in the customer's personal history.
    return { success: true };
  }
}
