
import { mapCategoryToStorefrontDTO } from "../../dtos/storefront/mappers";

import { prisma } from "../../config/db";

export class StorefrontCategoryService {
  async getCategories(tree: boolean = true) {
    const where = {
      isActive: true,
      deletedAt: null,
    };

    const allCategories = await prisma.category.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });

    if (!tree) {
      return allCategories.map(mapCategoryToStorefrontDTO);
    }

    const categoryMap = new Map();
    const rootCategories: any[] = [];

    for (const category of allCategories) {
      categoryMap.set(category.id, { ...category, children: [] });
    }

    for (const category of allCategories) {
      const mappedCat = categoryMap.get(category.id);
      if (category.parentId && categoryMap.has(category.parentId)) {
        categoryMap.get(category.parentId).children.push(mappedCat);
      } else {
        rootCategories.push(mappedCat);
      }
    }

    return rootCategories.map(mapCategoryToStorefrontDTO);
  }

  async getCategoryBySlug(slug: string) {
    const category = await prisma.category.findFirst({
      where: {
        slug,
        isActive: true,
        deletedAt: null,
      }
    });

    if (!category) return null;

    let currentCategory = category;
    const breadcrumbs = [{ name: category.name, slug: category.slug }];
    
    while (currentCategory.parentId) {
      const parent = await prisma.category.findFirst({
        where: {
          id: currentCategory.parentId,
          isActive: true,
          deletedAt: null,
        }
      });
      if (parent) {
        breadcrumbs.unshift({ name: parent.name, slug: parent.slug });
        currentCategory = parent;
      } else {
        break;
      }
    }

    return {
      ...mapCategoryToStorefrontDTO(category),
      breadcrumbs
    };
  }
}
export const storefrontCategoryService = new StorefrontCategoryService();
