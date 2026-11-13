import { prisma } from "../config/db";

export interface MediaUsageReference {
  type: string;
  entityId: string;
  entityName: string;
  field: string;
  reference: string;
  status: "ACTIVE" | "ARCHIVED";
}

export interface MediaUsageResult {
  used: boolean;
  referenceCount: number;
  references: MediaUsageReference[];
}

export interface MediaUsageIgnoreContext {
  entityType?: "product" | "category" | "brand" | "blog" | "banner" | string;
  entityId?: string;
  imageId?: string;
}

export class MediaUsageService {
  /**
   * Safely checks whether a media asset is referenced anywhere across the database,
   * including active and archived/soft-deleted records.
   * Supports an optional ignoreContext so an entity's own image deletion does not self-block.
   *
   * @param assetOrPublicId MediaAsset ID, publicId, or cloudinaryPublicId
   * @param asset Optional pre-fetched MediaAsset record
   * @param ignoreContext Optional context to ignore (e.g. { entityType: 'product', entityId: 'prod-123' })
   */
  public static async checkAssetUsage(
    assetOrPublicId: string,
    asset?: any,
    ignoreContext?: MediaUsageIgnoreContext
  ): Promise<MediaUsageResult> {
    const references: MediaUsageReference[] = [];

    // 1. Resolve MediaAsset record if not provided
    let mediaRecord = asset;
    if (!mediaRecord && assetOrPublicId) {
      mediaRecord = await prisma.mediaAsset.findFirst({
        where: {
          OR: [
            { id: assetOrPublicId },
            { publicId: assetOrPublicId },
            { cloudinaryPublicId: assetOrPublicId },
          ],
        },
      });
    }

    // Candidate identifiers to match
    const candidateIds: string[] = [];
    if (assetOrPublicId) candidateIds.push(assetOrPublicId);
    if (mediaRecord?.id && !candidateIds.includes(mediaRecord.id)) candidateIds.push(mediaRecord.id);

    const candidatePublicIds: string[] = [];
    if (mediaRecord?.publicId) candidatePublicIds.push(mediaRecord.publicId);
    if (mediaRecord?.cloudinaryPublicId && !candidatePublicIds.includes(mediaRecord.cloudinaryPublicId)) {
      candidatePublicIds.push(mediaRecord.cloudinaryPublicId);
    }
    if (assetOrPublicId && !candidatePublicIds.includes(assetOrPublicId)) {
      candidatePublicIds.push(assetOrPublicId);
    }

    const candidateUrls: string[] = [];
    if (mediaRecord?.url) candidateUrls.push(mediaRecord.url);
    if (mediaRecord?.secureUrl && !candidateUrls.includes(mediaRecord.secureUrl)) {
      candidateUrls.push(mediaRecord.secureUrl);
    }

    // 2. Check Product Images (Both active and archived/soft-deleted)
    const productImages = await prisma.productImage.findMany({
      where: {
        OR: [
          ...(candidatePublicIds.length > 0
            ? [
                { publicId: { in: candidatePublicIds } },
                { cloudinaryPublicId: { in: candidatePublicIds } },
              ]
            : []),
          ...(candidateUrls.length > 0
            ? [
                { url: { in: candidateUrls } },
                { imageUrl: { in: candidateUrls } },
              ]
            : []),
        ],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            deletedAt: true,
          },
        },
      },
    });

    for (const pImg of productImages) {
      if (
        ignoreContext?.entityType?.toLowerCase() === "product" &&
        (ignoreContext.entityId === pImg.productId || ignoreContext.imageId === pImg.id)
      ) {
        continue;
      }

      const isArchived = Boolean(pImg.deletedAt || pImg.product?.deletedAt);

      references.push({
        type: "Product",
        entityId: pImg.productId,
        entityName: pImg.product?.name || "Product",
        field: pImg.isPrimary ? "primaryImage" : "galleryImage",
        reference: pImg.id,
        status: isArchived ? "ARCHIVED" : "ACTIVE",
      });
    }

    // 3. Check Direct Product ogImage (Both active and archived)
    if (candidateUrls.length > 0) {
      const productsWithOg = await prisma.product.findMany({
        where: {
          ogImage: { in: candidateUrls },
        },
        select: {
          id: true,
          name: true,
          deletedAt: true,
        },
      });

      for (const prod of productsWithOg) {
        if (
          ignoreContext?.entityType?.toLowerCase() === "product" &&
          ignoreContext.entityId === prod.id
        ) {
          continue;
        }

        references.push({
          type: "Product",
          entityId: prod.id,
          entityName: prod.name,
          field: "ogImage",
          reference: prod.id,
          status: prod.deletedAt ? "ARCHIVED" : "ACTIVE",
        });
      }
    }

    // 4. Check Category Images
    if (candidatePublicIds.length > 0 || candidateUrls.length > 0) {
      const categoryImages = await prisma.categoryImage.findMany({
        where: {
          OR: [
            ...(candidatePublicIds.length > 0
              ? [{ cloudinaryPublicId: { in: candidatePublicIds } }]
              : []),
            ...(candidateUrls.length > 0
              ? [{ secureUrl: { in: candidateUrls } }]
              : []),
          ],
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              deletedAt: true,
            },
          },
        },
      });

      for (const cImg of categoryImages) {
        if (
          ignoreContext?.entityType?.toLowerCase() === "category" &&
          ignoreContext.entityId === cImg.categoryId
        ) {
          continue;
        }

        references.push({
          type: "Category",
          entityId: cImg.categoryId,
          entityName: cImg.category?.name || "Category",
          field: "image",
          reference: cImg.id,
          status: cImg.category?.deletedAt ? "ARCHIVED" : "ACTIVE",
        });
      }
    }

    // 5. Check Direct Category Fields (image, icon - including archived)
    if (candidateUrls.length > 0) {
      const categories = await prisma.category.findMany({
        where: {
          OR: [
            { image: { in: candidateUrls } },
            { icon: { in: candidateUrls } },
          ],
        },
        select: {
          id: true,
          name: true,
          deletedAt: true,
        },
      });

      for (const cat of categories) {
        if (
          ignoreContext?.entityType?.toLowerCase() === "category" &&
          ignoreContext.entityId === cat.id
        ) {
          continue;
        }

        references.push({
          type: "Category",
          entityId: cat.id,
          entityName: cat.name,
          field: "image",
          reference: cat.id,
          status: cat.deletedAt ? "ARCHIVED" : "ACTIVE",
        });
      }
    }

    // 6. Check Brand Images
    if (candidatePublicIds.length > 0 || candidateUrls.length > 0) {
      const brandImages = await prisma.brandImage.findMany({
        where: {
          OR: [
            ...(candidatePublicIds.length > 0
              ? [{ cloudinaryPublicId: { in: candidatePublicIds } }]
              : []),
            ...(candidateUrls.length > 0
              ? [{ secureUrl: { in: candidateUrls } }]
              : []),
          ],
        },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      for (const bImg of brandImages) {
        if (
          ignoreContext?.entityType?.toLowerCase() === "brand" &&
          ignoreContext.entityId === bImg.brandId
        ) {
          continue;
        }

        references.push({
          type: "Brand",
          entityId: bImg.brandId,
          entityName: bImg.brand?.name || "Brand",
          field: "logo",
          reference: bImg.id,
          status: "ACTIVE",
        });
      }
    }

    // 7. Check Blog Posts (featuredImageId)
    if (candidateIds.length > 0) {
      const blogPosts = await prisma.blogPost.findMany({
        where: {
          featuredImageId: { in: candidateIds },
        },
        select: {
          id: true,
          title: true,
          status: true,
        },
      });

      for (const post of blogPosts) {
        if (
          ignoreContext?.entityType?.toLowerCase() === "blog" &&
          ignoreContext.entityId === post.id
        ) {
          continue;
        }

        references.push({
          type: "BlogPost",
          entityId: post.id,
          entityName: post.title,
          field: "featuredImage",
          reference: post.id,
          status: post.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
        });
      }
    }

    // 8. Check Banners (desktopImage, mobileImage)
    if (candidateUrls.length > 0) {
      const banners = await prisma.banner.findMany({
        where: {
          OR: [
            { desktopImage: { in: candidateUrls } },
            { mobileImage: { in: candidateUrls } },
          ],
        },
        select: {
          id: true,
          title: true,
          isActive: true,
          deletedAt: true,
        },
      });

      for (const banner of banners) {
        if (
          ignoreContext?.entityType?.toLowerCase() === "banner" &&
          ignoreContext.entityId === banner.id
        ) {
          continue;
        }

        references.push({
          type: "Banner",
          entityId: banner.id,
          entityName: banner.title,
          field: "image",
          reference: banner.id,
          status: (banner.deletedAt || !banner.isActive) ? "ARCHIVED" : "ACTIVE",
        });
      }
    }

    return {
      used: references.length > 0,
      referenceCount: references.length,
      references,
    };
  }
}
