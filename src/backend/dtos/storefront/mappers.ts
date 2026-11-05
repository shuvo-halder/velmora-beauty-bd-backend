import { StorefrontProduct, StorefrontCategory, StorefrontBrand, StorefrontProductImage, StorefrontVariant, StorefrontProductFaq } from "./types";

export function mapCategoryToStorefrontDTO(category: any): StorefrontCategory & { children?: any[] } {
  const result: any = {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    icon: category.icon,
    parentId: category.parentId,
    seoTitle: category.seoTitle || category.name,
    seoDescription: category.seoDescription || category.description || null,
    ogImage: category.image || null,
  };
  if (category.children) {
    result.children = category.children.map(mapCategoryToStorefrontDTO);
  }
  return result;
}

export function mapBrandToStorefrontDTO(brand: any): StorefrontBrand & { website?: string | null } {
  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    logoUrl: brand.logoUrl,
    description: brand.description,
    seoTitle: brand.seoTitle || brand.name,
    seoDescription: brand.seoDescription || brand.description || null,
    ogImage: brand.logoUrl || null,
    website: brand.website || null,
  };
}

export function mapProductToStorefrontDTO(product: any): StorefrontProduct {
  const images = product.images?.map((img: any): StorefrontProductImage => ({
    id: img.id,
    url: img.imageUrl || img.url,
    imageUrl: img.imageUrl || img.url,
    publicId: img.publicId || null,
    altText: img.altText,
    isPrimary: img.isPrimary,
    sortOrder: img.sortOrder,
  })) || [];

  const isSingleVariant = product.variants?.length === 1;

  const variants = product.variants?.map((v: any): StorefrontVariant => {
    const options: Record<string, string> = {};
    if (v.attributes) {
      for (const attrVal of v.attributes) {
        if (attrVal.attributeValue && attrVal.attributeValue.attribute) {
          options[attrVal.attributeValue.attribute.name] = attrVal.attributeValue.value;
        }
      }
    }
    
    let image = null;
    if (v.images && v.images.length > 0) {
      image = v.images[0].imageUrl || v.images[0].url;
    }

    const calculatedStock = v.inventories && v.inventories.length > 0
      ? v.inventories.reduce((sum: number, inv: any) => sum + Math.max(0, (inv.quantityAvailable ?? inv.quantity ?? 0) - (inv.quantityReserved ?? 0)), 0)
      : (isSingleVariant && product.inventory
          ? Math.max(0, (product.inventory.quantityAvailable ?? product.inventory.quantity ?? 0) - (product.inventory.quantityReserved ?? 0))
          : (v.stock ?? 0));

    return {
      id: v.id,
      sku: v.sku,
      barcode: v.barcode,
      price: v.price ? Number(v.price) : null,
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
      stock: calculatedStock,
      inStock: calculatedStock > 0,
      options,
      image,
    };
  }) || [];

  const primaryImageObj = images.find((i: any) => i.isPrimary) || images[0] || null;
  const primaryImageUrl = primaryImageObj?.imageUrl || primaryImageObj?.url || product.ogImage || null;
  const gallery = images.filter((i: any) => !i.isPrimary);

  const rootStock = product.inventory
    ? Math.max(0, (product.inventory.quantityAvailable ?? product.inventory.quantity ?? 0) - (product.inventory.quantityReserved ?? 0))
    : (variants.length > 0 ? variants.reduce((sum, v) => sum + v.stock, 0) : 0);
  const rootInStock = product.inventory
    ? rootStock > 0
    : (variants.length > 0 ? variants.some(v => v.inStock) : false);

  let faqs: StorefrontProductFaq[] | undefined = undefined;
  if (product.productFaqs) {
    const validProductFaqs = [...product.productFaqs]
      .filter((pf: any) => pf.faq && pf.faq.isActive === true && pf.faq.deletedAt === null)
      .sort((a: any, b: any) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      });

    faqs = validProductFaqs.map((pf: any): StorefrontProductFaq => ({
      id: pf.faq.id,
      question: pf.faq.question,
      answer: pf.faq.answer,
      sortOrder: pf.sortOrder,
    }));
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription,
    price: product.price ? Number(product.price) : null,
    seoTitle: product.metaTitle || product.name,
    seoDescription: product.metaDescription || product.shortDescription || null,
    ogImage: product.ogImage || primaryImageUrl,
    gtin: product.gtin,
    mpn: product.mpn,
    condition: product.condition,
    category: product.category ? mapCategoryToStorefrontDTO(product.category) : undefined,
    brand: product.brand ? mapBrandToStorefrontDTO(product.brand) : null,
    images,
    variants,
    tags: product.tags?.map((pt: any) => pt.tag?.name).filter(Boolean) || [],
    thumbnail: primaryImageUrl,
    gallery,
    primaryImage: primaryImageObj || primaryImageUrl,
    stock: rootStock,
    inStock: rootInStock,
    ...(faqs !== undefined ? { faqs } : {}),
  };
}

export function mapOrderToStorefrontDTO(order: any) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalAmount: order.totalAmount ? Number(order.totalAmount) : null,
    subtotal: order.subtotal ? Number(order.subtotal) : null,
    taxAmount: order.taxAmount ? Number(order.taxAmount) : null,
    shippingFee: order.shippingFee ? Number(order.shippingFee) : null,
    discountAmount: order.discountAmount ? Number(order.discountAmount) : null,
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    coupon: order.coupon ? {
      code: order.coupon.code,
      discountType: order.coupon.discountType,
      discountValue: order.coupon.discountValue ? Number(order.coupon.discountValue) : null,
    } : null,
    items: order.items?.map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price ? Number(item.price) : null,
      productName: item.product?.name,
      productSlug: item.product?.slug,
      productImage: item.product?.images?.[0]?.url || null,
      variantSku: item.productVariant?.sku || null,
    })) || [],
    timeline: order.timeline?.map((event: any) => ({
      id: event.id,
      status: event.status,
      action: event.action,
      createdAt: event.createdAt,
    })) || [],
  };
}

export function mapShipmentToStorefrontDTO(shipment: any) {
  const rawProvider = (shipment.provider || "").toUpperCase().trim();
  const courierName = shipment.courier?.name;
  const trackingNumber = shipment.trackingNumber || shipment.consignmentId || null;

  let provider = "MANUAL";
  let providerName = courierName || "Manual / In-House Courier";
  let trackingUrl = shipment.trackingUrl || null;

  if (rawProvider === "PATHAO" || courierName?.toLowerCase().includes("pathao")) {
    provider = "PATHAO";
    providerName = "Pathao Courier";
    if (!trackingUrl && trackingNumber) {
      trackingUrl = `https://merchant.pathao.com/tracking?consignment_id=${trackingNumber}`;
    }
  } else if (rawProvider === "MANUAL") {
    provider = "MANUAL";
    providerName = courierName || "Manual / In-House Courier";
  } else if (courierName) {
    provider = rawProvider || "COURIER";
    providerName = courierName;
    if (!trackingUrl && shipment.courier?.trackingUrl && trackingNumber) {
      trackingUrl = `${shipment.courier.trackingUrl}${trackingNumber}`;
    }
  } else if (rawProvider) {
    provider = rawProvider;
    providerName = `${rawProvider.charAt(0).toUpperCase()}${rawProvider.slice(1).toLowerCase()} Courier`;
  }

  return {
    id: shipment.id,
    shipmentId: shipment.id,
    provider,
    providerName,
    carrier: providerName,
    courierName: providerName,
    status: shipment.status,
    shipmentStatus: shipment.status,
    trackingNumber,
    trackingUrl,
    shippedAt: shipment.shippedAt || null,
    estimatedDelivery: shipment.estimatedDelivery || null,
    estimatedDeliveryAt: shipment.estimatedDelivery || null,
    deliveredAt: shipment.deliveredAt || null,
    createdAt: shipment.createdAt,
    items: shipment.items?.map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      productName: item.orderItem?.product?.name,
    })) || [],
    trackingEvents: shipment.trackingEvents?.map((event: any) => ({
      id: event.id,
      status: event.status,
      location: event.location,
      description: event.description,
      timestamp: event.timestamp,
    })) || []
  };
}

export function mapReturnRequestToStorefrontDTO(returnReq: any) {
  return {
    id: returnReq.id,
    orderId: returnReq.orderId,
    reason: returnReq.reason,
    status: returnReq.status,
    createdAt: returnReq.createdAt,
    items: returnReq.items?.map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      reason: item.reason,
      condition: item.condition,
      productName: item.orderItem?.product?.name,
      productImage: item.orderItem?.product?.images?.[0]?.url || null,
    })) || []
  };
}

export function mapRefundToStorefrontDTO(refund: any) {
  return {
    id: refund.id,
    orderId: refund.orderId,
    amount: refund.amount ? Number(refund.amount) : null,
    currency: refund.currency,
    status: refund.status,
    reason: refund.reason,
    createdAt: refund.createdAt,
    provider: refund.payment?.provider,
  };
}

// --- Home Content Mappers ---

import {
  StorefrontBanner,
  StorefrontPopup,
  StorefrontPromotion,
  StorefrontCoupon,
  StorefrontCampaign,
  StorefrontAnnouncement
} from "./types";

export function mapBannerToStorefrontDTO(banner: any): StorefrontBanner {
  return {
    id: banner.id,
    title: banner.title,
    desktopImage: banner.desktopImage,
    mobileImage: banner.mobileImage,
    linkUrl: banner.linkUrl,
    ctaText: banner.ctaText,
    priority: banner.priority
  };
}

export function mapPopupToStorefrontDTO(popup: any): StorefrontPopup {
  return {
    id: popup.id,
    title: popup.title,
    type: popup.type,
    headline: popup.headline,
    body: popup.body,
    couponCode: popup.couponCode,
    imageUrl: popup.imageUrl,
    delaySeconds: popup.delaySeconds
  };
}

export function mapPromotionToStorefrontDTO(promotion: any): StorefrontPromotion {
  return {
    id: promotion.id,
    name: promotion.name,
    type: promotion.type,
    discountType: promotion.discountType,
    discountValue: promotion.discountValue ? Number(promotion.discountValue) : null,
    priority: promotion.priority,
    isStackable: promotion.isStackable
  };
}

export function mapCouponToStorefrontDTO(coupon: any): StorefrontCoupon {
  return {
    id: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue),
    validUntil: coupon.validUntil,
    minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : null
  };
}

export function mapCampaignToStorefrontDTO(campaign: any): StorefrontCampaign {
  return {
    id: campaign.id,
    name: campaign.name,
    type: campaign.type,
    subject: campaign.subject,
    content: campaign.content
  };
}

export function mapAnnouncementToStorefrontDTO(setting: any): StorefrontAnnouncement {
  return {
    id: setting.id,
    key: setting.key,
    value: setting.value,
    type: setting.type
  };
}
