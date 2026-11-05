import { GA4Item } from "../../lib/ga4-ecommerce";

export class GA4MappingService {
  /**
   * Maps a database Product to a GA4 Item
   * @param product The database product object (with relations)
   * @param quantity Optional quantity for the event (e.g. add_to_cart)
   * @param currency Currency code (default: BDT)
   */
  static mapProductToGA4Item(product: any, quantity: number = 1, currency: string = "BDT"): GA4Item {
    return {
      item_id: product.sku || product.id,
      item_name: product.name,
      item_brand: product.brand?.name,
      item_category: product.category?.name,
      item_category2: product.category?.parent?.name, // If available
      price: product.price ? Number(product.price) : undefined,
      quantity,
      currency
    };
  }

  /**
   * Maps a database Product Variant to a GA4 Item
   * @param variant The database variant object (with product and relations)
   * @param quantity Optional quantity for the event
   * @param currency Currency code (default: BDT)
   */
  static mapVariantToGA4Item(variant: any, quantity: number = 1, currency: string = "BDT"): GA4Item {
    const product = variant.product || {};
    
    // Construct variant string from attributes if available
    let variantName = variant.sku;
    if (variant.attributes && Array.isArray(variant.attributes)) {
      variantName = variant.attributes
        .map((a: any) => a.attributeValue?.value)
        .filter(Boolean)
        .join(" - ");
    }

    return {
      item_id: variant.sku || variant.id,
      item_name: product.name || "Unknown Product",
      item_brand: product.brand?.name,
      item_category: product.category?.name,
      item_category2: product.category?.parent?.name,
      item_variant: variantName || variant.sku,
      price: variant.price ? Number(variant.price) : (product.price ? Number(product.price) : undefined),
      quantity,
      currency
    };
  }

  /**
   * Generates a view_item event payload for a product
   */
  static generateViewItemEvent(product: any, currency: string = "BDT") {
    const item = this.mapProductToGA4Item(product, 1, currency);
    return {
      currency,
      value: item.price,
      items: [item]
    };
  }
}
