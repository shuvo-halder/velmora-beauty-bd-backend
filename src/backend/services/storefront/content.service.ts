

import { prisma } from "../../config/db";

export class StorefrontContentService {
  async getPages() {
    return prisma.page.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
      },
      include: {
        seoMetadata: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getPageBySlug(slug: string) {
    return prisma.page.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
        deletedAt: null,
      },
      include: {
        seoMetadata: true,
      },
    });
  }

  async getBlogPosts() {
    return prisma.blogPost.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
      },
      include: {
        category: true,
        tags: true,
        featuredImage: true,
        seoMetadata: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
    });
  }

  async getBlogPostBySlug(slug: string) {
    return prisma.blogPost.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
        deletedAt: null,
      },
      include: {
        category: true,
        tags: true,
        featuredImage: true,
        seoMetadata: true,
      },
    });
  }

  async getFaqs() {
    const faqs = await prisma.fAQ.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        isGlobal: true,
      },
      include: {
        category: true,
      },
      orderBy: {
        orderIndex: "asc",
      },
    });
    return faqs.map(({ isGlobal, ...faq }: any) => faq);
  }

  async getLandingPageBySlug(slug: string) {
    return prisma.landingPage.findFirst({
      where: {
        slug,
        status: "PUBLISHED",
        deletedAt: null,
      },
      include: {
        seoMetadata: true,
      },
    });
  }



  // --- Home Content (Phase 9.5) ---

  async getActiveBanners() {
    const now = new Date();
    return prisma.banner.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        OR: [
          { startDate: null },
          { startDate: { lte: now } }
        ],
        AND: [
          { OR: [{ endDate: null }, { endDate: { gte: now } }] }
        ]
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" }
      ]
    });
  }

  async getActivePopups(type?: string) {
    return prisma.popup.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(type ? { type } : {})
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async getActivePromotions() {
    const now = new Date();
    return prisma.promotion.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        OR: [
          { startDate: null },
          { startDate: { lte: now } }
        ],
        AND: [
          { OR: [{ endDate: null }, { endDate: { gte: now } }] }
        ]
      },
      orderBy: { priority: "desc" }
    });
  }

  async getPublicCoupons() {
    const now = new Date();
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      orderBy: { createdAt: "desc" }
    });

    return coupons.filter(c => c.usageLimit === null || c.usedCount < c.usageLimit);
  }

  async getActiveCampaigns() {
    const now = new Date();
    return prisma.marketingCampaign.findMany({
      where: {
        deletedAt: null,
        OR: [
          { status: "Sent" },
          { status: "Scheduled", scheduledAt: { lte: now } }
        ]
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async getPublicAnnouncements() {
    return prisma.setting.findMany({
      where: {
        isPublic: true,
        OR: [
          { group: "Announcement" },
          { key: { contains: "announcement" } },
          { key: { contains: "banner" } }
        ]
      },
      orderBy: { createdAt: "desc" }
    });
  }

}

export const storefrontContentService = new StorefrontContentService();
