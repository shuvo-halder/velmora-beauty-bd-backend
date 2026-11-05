import { Prisma } from "@prisma/client";
import { StorefrontProduct, PaginatedResponse } from "../../dtos/storefront/types";
import { mapProductToStorefrontDTO } from "../../dtos/storefront/mappers";

import { prisma } from "../../config/db";

export interface SearchProductsOptions {
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  page: number;
  limit: number;
  sort: string;
}

export const storefrontSearchService = {
  async searchProducts(options: SearchProductsOptions): Promise<PaginatedResponse<StorefrontProduct>> {
    const { q, category, brand, minPrice, maxPrice, inStock, page, limit, sort } = options;

    const andConditions: Prisma.ProductWhereInput[] = [
      { isActive: true },
      { status: "Active" },
      { deletedAt: null }
    ];

    if (q) {
      andConditions.push({
        OR: [
          { name: { contains: q } },
          { slug: { contains: q } },
          { shortDescription: { contains: q } },
          { description: { contains: q } },
        ]
      });
    }

    if (category) {
      andConditions.push({ category: { slug: category, isActive: true, deletedAt: null } });
    }

    if (brand) {
      andConditions.push({ brand: { slug: brand, isActive: true, deletedAt: null } });
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: any = {};
      if (minPrice !== undefined) priceFilter.gte = minPrice;
      if (maxPrice !== undefined) priceFilter.lte = maxPrice;
      andConditions.push({ price: priceFilter });
    }

    if (inStock) {
      andConditions.push({
        OR: [
          { inventory: { quantityAvailable: { gt: 0 } } },
          { inventory: { quantity: { gt: 0 } } },
          { variants: { some: { inventories: { some: { quantityAvailable: { gt: 0 } } } } } },
          { variants: { some: { inventories: { some: { quantity: { gt: 0 } } } } } }
        ]
      });
    }

    const where: Prisma.ProductWhereInput = { AND: andConditions };

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
    switch (sort) {
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "price_asc":
        orderBy = { price: "asc" };
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
      case "relevance":
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    const skip = (page - 1) * limit;

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: true,
          brand: true,
          images: {
            orderBy: { sortOrder: 'asc' }
          },
          variants: {
            include: {
              attributes: {
                include: {
                  attributeValue: {
                    include: {
                      attribute: true
                    }
                  }
                }
              },
              images: true,
              inventories: true
            }
          },
          inventory: true
        }
      })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: products.map(mapProductToStorefrontDTO),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      }
    };
  }

  , async getFacets(options: Omit<SearchProductsOptions, 'page' | 'limit' | 'sort'>) {
    const { q, category, brand, minPrice, maxPrice, inStock } = options;

    const andConditions: Prisma.ProductWhereInput[] = [
      { isActive: true },
      { status: "Active" },
      { deletedAt: null }
    ];

    if (q) {
      andConditions.push({
        OR: [
          { name: { contains: q } },
          { slug: { contains: q } },
          { shortDescription: { contains: q } },
          { description: { contains: q } },
        ]
      });
    }

    if (category) {
      andConditions.push({ category: { slug: category, isActive: true, deletedAt: null } });
    }

    if (brand) {
      andConditions.push({ brand: { slug: brand, isActive: true, deletedAt: null } });
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: any = {};
      if (minPrice !== undefined) priceFilter.gte = minPrice;
      if (maxPrice !== undefined) priceFilter.lte = maxPrice;
      andConditions.push({ price: priceFilter });
    }

    if (inStock) {
      andConditions.push({
        OR: [
          { inventory: { quantityAvailable: { gt: 0 } } },
          { inventory: { quantity: { gt: 0 } } },
          { variants: { some: { inventories: { some: { quantityAvailable: { gt: 0 } } } } } },
          { variants: { some: { inventories: { some: { quantity: { gt: 0 } } } } } }
        ]
      });
    }

    const where: Prisma.ProductWhereInput = { AND: andConditions };

    const inStockWhere: Prisma.ProductWhereInput = {
      ...where,
      OR: [
        { inventory: { quantityAvailable: { gt: 0 } } },
        { inventory: { quantity: { gt: 0 } } },
        { variants: { some: { inventories: { some: { quantityAvailable: { gt: 0 } } } } } },
        { variants: { some: { inventories: { some: { quantity: { gt: 0 } } } } } }
      ]
    };

    const startTime = Date.now();

    const [
      categoryGroups,
      brandGroups,
      priceAgg,
      inStockCount,
      totalCount
    ] = await Promise.all([
      prisma.product.groupBy({
        by: ['categoryId'],
        where,
        _count: { id: true }
      }),
      prisma.product.groupBy({
        by: ['brandId'],
        where: { ...where, brandId: { not: null } },
        _count: { id: true }
      }),
      prisma.product.aggregate({
        where,
        _min: { price: true },
        _max: { price: true }
      }),
      prisma.product.count({ where: inStockWhere }),
      prisma.product.count({ where })
    ]);

    const outOfStockCount = totalCount - inStockCount;

    const categoryIds = categoryGroups.map(g => g.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } }
    });

    const brandIds = brandGroups.map(g => g.brandId as string).filter(Boolean);
    const brands = await prisma.brand.findMany({
      where: { id: { in: brandIds } }
    });

    const categoryFacets = categoryGroups.map(g => {
      const cat = categories.find(c => c.id === g.categoryId);
      if (!cat) return null;
      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        count: g._count.id
      };
    }).filter(Boolean);

    const brandFacets = brandGroups.map(g => {
      const b = brands.find(b => b.id === g.brandId);
      if (!b) return null;
      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        count: g._count.id
      };
    }).filter(Boolean);

    const duration = Date.now() - startTime;

    return {
      duration,
      categories: categoryFacets,
      brands: brandFacets,
      priceRange: {
        min: priceAgg._min.price ? Number(priceAgg._min.price) : 0,
        max: priceAgg._max.price ? Number(priceAgg._max.price) : 0
      },
      availability: {
        inStock: inStockCount,
        outOfStock: outOfStockCount
      }
    };
  }
};