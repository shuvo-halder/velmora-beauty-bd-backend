import { Prisma } from "@prisma/client";
import { StorefrontProduct, PaginatedResponse } from "../../dtos/storefront/types";
import { mapProductToStorefrontDTO } from "../../dtos/storefront/mappers";

import { prisma } from "../../config/db";

interface GetProductsOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
}

export class StorefrontProductService {
  private async _attachReviewStats(products: StorefrontProduct[]): Promise<StorefrontProduct[]> {
    if (products.length === 0) return products;
    
    const productIds = products.map(p => p.id);
    const reviewAggregates = await prisma.review.groupBy({
      by: ['productId', 'rating'],
      where: { productId: { in: productIds }, status: "APPROVED" },
      _count: {
        id: true,
      }
    });

    const reviewsStatsByProduct: Record<string, { totalRating: number, count: number }> = {};
    for (const pid of productIds) {
      reviewsStatsByProduct[pid] = { totalRating: 0, count: 0 };
    }

    reviewAggregates.forEach(agg => {
      const pid = agg.productId;
      if (reviewsStatsByProduct[pid]) {
        reviewsStatsByProduct[pid].count += agg._count.id;
        reviewsStatsByProduct[pid].totalRating += (agg.rating * agg._count.id);
      }
    });

    return products.map(product => {
      const stats = reviewsStatsByProduct[product.id];
      const rating = stats.count > 0 ? Number((stats.totalRating / stats.count).toFixed(1)) : 0;
      return {
        ...product,
        rating,
        reviewCount: stats.count
      };
    });
  }

  async getProducts(options: GetProductsOptions): Promise<PaginatedResponse<StorefrontProduct>> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: true,
      status: "Active",
    };

    if (options.search) {
      where.OR = [
        { name: { contains: options.search } },
        { slug: { contains: options.search } },
        { description: { contains: options.search } },
      ];
    }

    if (options.category) {
      where.category = {
        slug: options.category,
      };
    }

    if (options.brand) {
      where.brand = {
        slug: options.brand,
      };
    }

    // Price filtering
    // Since variants have price, and backwards compatibility uses product.price
    // We check both if they are requested
    if (options.minPrice !== undefined || options.maxPrice !== undefined) {
      const priceFilter: Prisma.DecimalFilter = {};
      if (options.minPrice !== undefined) priceFilter.gte = options.minPrice;
      if (options.maxPrice !== undefined) priceFilter.lte = options.maxPrice;

      where.OR = [
        ...(where.OR as Prisma.ProductWhereInput[] || []),
        { price: priceFilter },
        {
          variants: {
            some: {
              price: priceFilter,
              isActive: true,
              deletedAt: null
            }
          }
        }
      ];
    }

    // Sorting
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
    switch (options.sort) {
      case "featured":
      case "bestsellers":
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "price_asc":
        orderBy = { price: "asc" }; // Note: sorting by variants price can be complex in Prisma, fallback to Product.price
        break;
      case "price_desc":
        orderBy = { price: "desc" };
        break;
      case "name_asc":
        orderBy = { name: "asc" };
        break;
      case "name_desc":
        orderBy = { name: "desc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: true,
          brand: true,
          images: {
            orderBy: { sortOrder: 'asc' }
          },
          tags: {
            include: { tag: true }
          },
          inventory: true,
          variants: {
            where: { deletedAt: null, isActive: true },
            include: {
              images: true,
              inventories: true,
              attributes: {
                include: {
                  attributeValue: {
                    include: {
                      attribute: true
                    }
                  }
                }
              }
            }
          }
        }
      })
    ]);

    const mappedProducts = products.map(mapProductToStorefrontDTO);
    const mappedWithStats = await this._attachReviewStats(mappedProducts);

    return {
      data: mappedWithStats,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + limit < total,
        hasPreviousPage: page > 1,
      }
    };
  }

  async getProductBySlug(slug: string): Promise<StorefrontProduct | null> {
    const product = await prisma.product.findFirst({
      where: {
        slug,
        deletedAt: null,
        isActive: true,
        status: "Active",
      },
      include: {
        category: true,
        brand: true,
        images: {
          orderBy: { sortOrder: 'asc' }
        },
        tags: {
          include: { tag: true }
        },
        inventory: true,
        variants: {
          where: { deletedAt: null, isActive: true },
          include: {
            images: true,
            inventories: true,
            attributes: {
              include: {
                attributeValue: {
                  include: {
                    attribute: true
                  }
                }
              }
            }
          }
        },
        productFaqs: {
          where: {
            faq: {
              isActive: true,
              deletedAt: null,
            },
          },
          orderBy: [
            { sortOrder: 'asc' },
            { createdAt: 'asc' },
          ],
          include: {
            faq: true,
          },
        },
      }
    });

    if (!product) {
      return null;
    }

    const mappedProduct = mapProductToStorefrontDTO(product);
    const [mappedWithStats] = await this._attachReviewStats([mappedProduct]);
    return mappedWithStats;
  }
}

export const storefrontProductService = new StorefrontProductService();
