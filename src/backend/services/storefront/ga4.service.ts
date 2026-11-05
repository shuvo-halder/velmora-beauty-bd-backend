import { StorefrontProduct, StorefrontCategory, StorefrontBrand } from "../../dtos/storefront/types";

export interface Ga4Item {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  price?: number;
  currency?: string;
  item_variant?: string;
}

export interface Ga4Payload {
  event: string;
  ecommerce: {
    currency?: string;
    value?: number;
    item_list_name?: string;
    items: Ga4Item[];
  };
}

export const ga4Service = {
  mapProductToGa4Item(product: StorefrontProduct): Ga4Item {
    const firstVariant = product.variants?.[0];
    const itemVariant = firstVariant 
      ? Object.entries(firstVariant.options).map(([k, v]) => `${k}: ${v}`).join(", ") || firstVariant.sku || undefined
      : undefined;

    return {
      item_id: product.id,
      item_name: product.name,
      item_brand: product.brand?.name || undefined,
      item_category: product.category?.name || undefined,
      price: product.price !== null ? product.price : undefined,
      currency: "BDT",
      item_variant: itemVariant,
    };
  },

  getProductDetailPayload(product: StorefrontProduct): Ga4Payload {
    return {
      event: "view_item",
      ecommerce: {
        currency: "BDT",
        value: product.price !== null ? product.price : 0,
        items: [this.mapProductToGa4Item(product)]
      }
    };
  },

  getProductListPayload(products: StorefrontProduct[], listName: string = "Product List"): Ga4Payload {
    return {
      event: "view_item_list",
      ecommerce: {
        item_list_name: listName,
        items: products.map(p => this.mapProductToGa4Item(p))
      }
    };
  },

  flattenCategories(categories: StorefrontCategory[]): StorefrontCategory[] {
    const result: StorefrontCategory[] = [];
    const traverse = (cats: any[]) => {
      for (const cat of cats) {
        result.push(cat);
        if (cat.children && cat.children.length > 0) {
          traverse(cat.children);
        }
      }
    };
    traverse(categories);
    return result;
  },

  getCategoryListPayload(categories: StorefrontCategory[]): Ga4Payload {
    const flat = this.flattenCategories(categories);
    return {
      event: "view_item_list",
      ecommerce: {
        item_list_name: "Category List",
        items: flat.map(cat => ({
          item_id: cat.id,
          item_name: cat.name,
          item_category: cat.name,
          currency: "BDT"
        }))
      }
    };
  },

  getBrandListPayload(brands: StorefrontBrand[]): Ga4Payload {
    return {
      event: "view_item_list",
      ecommerce: {
        item_list_name: "Brand List",
        items: brands.map(b => ({
          item_id: b.id,
          item_name: b.name,
          item_brand: b.name,
          currency: "BDT"
        }))
      }
    };
  }
};
