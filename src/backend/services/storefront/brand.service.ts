
import { mapBrandToStorefrontDTO } from "../../dtos/storefront/mappers";

import { prisma } from "../../config/db";

interface GetBrandsOptions {
  page?: number;
  limit?: number;
}

export class StorefrontBrandService {
  async getBrands(options: GetBrandsOptions) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where = {
      isActive: true,
      deletedAt: null,
    };

    const [total, brands] = await Promise.all([
      prisma.brand.count({ where }),
      prisma.brand.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
    ]);

    const mappedBrands = brands.map(mapBrandToStorefrontDTO);

    return {
      data: mappedBrands,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBrandBySlug(slug: string) {
    const brand = await prisma.brand.findFirst({
      where: {
        slug,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!brand) return null;

    return mapBrandToStorefrontDTO(brand);
  }
}

export const storefrontBrandService = new StorefrontBrandService();
