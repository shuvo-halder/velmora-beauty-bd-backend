import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { MediaService } from "./media.service";

export class ProductMediaService {
  /**
   * Helper to format product media properties (thumbnail, gallery, primaryImage)
   */
  static formatProductMedia(product: any) {
    const images = (product.images || []).map((img: any) => ({
      id: img.id,
      productId: img.productId,
      imageUrl: img.imageUrl || img.url,
      url: img.url || img.imageUrl,
      publicId: img.publicId || null,
      altText: img.altText || null,
      sortOrder: img.sortOrder || 0,
      isPrimary: Boolean(img.isPrimary),
      createdAt: img.createdAt,
      updatedAt: img.updatedAt,
    })).sort((a: any, b: any) => a.sortOrder - b.sortOrder);

    const primaryImageObj = images.find((i: any) => i.isPrimary) || images[0] || null;
    const primaryImageUrl = primaryImageObj?.imageUrl || primaryImageObj?.url || product.ogImage || null;
    const gallery = images.filter((i: any) => !i.isPrimary);
    const galleryImages = gallery.map((i: any) => i.imageUrl || i.url);

    return {
      ...product,
      images,
      primaryImage: primaryImageObj || primaryImageUrl,
      thumbnail: primaryImageUrl,
      gallery,
      galleryImages,
    };
  }

  /**
   * Migrate existing product image URL fields into ProductImage records
   */
  static async migrateExistingProductMedia() {
    try {
      const productsWithoutImages = await prisma.product.findMany({
        where: { deletedAt: null },
        include: { images: true },
      });

      const toCreate = [];
      const toUpdate = [];

      for (const product of productsWithoutImages) {
        if (product.images.length === 0 && product.ogImage) {
          toCreate.push({
            productId: product.id,
            imageUrl: product.ogImage,
            url: product.ogImage,
            isPrimary: true,
            sortOrder: 0,
          });
        } else {
          for (const img of product.images) {
            if (!img.imageUrl || img.imageUrl === "") {
              toUpdate.push({
                id: img.id,
                imageUrl: img.url || "",
              });
            }
          }
        }
      }

      if (toCreate.length > 0) {
        await prisma.productImage.createMany({ data: toCreate });
      }

      if (toUpdate.length > 0) {
        await Promise.all(
          toUpdate.map(update => 
            prisma.productImage.update({
              where: { id: update.id },
              data: { imageUrl: update.imageUrl },
            })
          )
        );
      }
    } catch (err) {
      console.error("Migration of existing product media encountered error:", err);
    }
  }

  /**
   * Upload image to a product
   */
  static async uploadImage(
    productId: string,
    file?: Express.Multer.File,
    body?: { imageUrl?: string; altText?: string; isPrimary?: boolean | string }
  ) {
    const product = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      include: { images: true },
    });

    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    const isFirstImage = product.images.length === 0;
    const isPrimary = isFirstImage || String(body?.isPrimary) === "true";
    const nextSortOrder = product.images.length;

    if (file) {
      // Unify upload with MediaService
      const uploadResult = await MediaService.uploadSingle(file, {
        folder: `products/${productId}`,
        entityType: 'product',
        entityId: productId,
        isPrimary,
        sortOrder: nextSortOrder,
        altText: body?.altText,
      });
      
      if (isPrimary) {
        await prisma.productImage.updateMany({
          where: { productId, id: { not: uploadResult.id } },
          data: { isPrimary: false },
        });
      }

      const newImage = await prisma.productImage.findFirst({
        where: { publicId: uploadResult.publicId }
      });
      return newImage;
    } else if (body?.imageUrl) {
      if (isPrimary) {
        await prisma.productImage.updateMany({
          where: { productId },
          data: { isPrimary: false },
        });
      }

      const newImage = await prisma.productImage.create({
        data: {
          productId,
          imageUrl: body.imageUrl,
          url: body.imageUrl,
          altText: body?.altText || null,
          sortOrder: nextSortOrder,
          isPrimary,
        },
      });
      return newImage;
    } else {
      throw new AppError("No image file or imageUrl provided.", 400, "MISSING_IMAGE");
    }
  }

  /**
   * Delete an image from product
   */
  static async deleteImage(productId: string, imageId: string) {
    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId, deletedAt: null },
    });

    if (!image) {
      throw new AppError("Product image not found", 404, "IMAGE_NOT_FOUND");
    }

    if (image.publicId) {
      await MediaService.deleteAsset(image.publicId);
    } else {
      // If it doesn't have a publicId, delete just the ProductImage
      await prisma.productImage.delete({
        where: { id: imageId },
      });
    }

    // If deleted image was primary, set the first remaining image as primary
    if (image.isPrimary) {
      const remainingImage = await prisma.productImage.findFirst({
        where: { productId, deletedAt: null },
        orderBy: { sortOrder: "asc" },
      });

      if (remainingImage) {
        await prisma.productImage.update({
          where: { id: remainingImage.id },
          data: { isPrimary: true },
        });
      }
    }

    return true;
  }

  /**
   * Reorder product images
   */
  static async reorderImages(productId: string, imageIds: string[]) {
    const product = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });

    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    await prisma.$transaction(
      imageIds.map((id, index) =>
        prisma.productImage.updateMany({
          where: { id, productId },
          data: { sortOrder: index },
        })
      )
    );

    const updatedImages = await prisma.productImage.findMany({
      where: { productId, deletedAt: null },
      orderBy: { sortOrder: "asc" },
    });

    return updatedImages;
  }

  /**
   * Set primary product image
   */
  static async setPrimaryImage(productId: string, imageId: string) {
    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId, deletedAt: null },
    });

    if (!image) {
      throw new AppError("Product image not found", 404, "IMAGE_NOT_FOUND");
    }

    await prisma.$transaction([
      prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      }),
      prisma.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
    ]);

    const updatedImages = await prisma.productImage.findMany({
      where: { productId, deletedAt: null },
      orderBy: { sortOrder: "asc" },
    });

    return updatedImages;
  }
}
