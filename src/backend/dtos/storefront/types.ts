export interface StorefrontBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  
  // SEO & Social (Computed/Fallback)
  seoTitle: string;
  seoDescription: string | null;
  ogImage: string | null;
}

export interface StorefrontCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  icon: string | null;
  parentId: string | null;
  
  // SEO & Social (Computed/Fallback)
  seoTitle: string;
  seoDescription: string | null;
  ogImage: string | null;
}

export interface StorefrontProductImage {
  id: string;
  url: string;
  imageUrl?: string;
  publicId?: string | null;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface StorefrontVariant {
  id: string;
  sku: string | null;
  barcode: string | null;
  price: number | null;
  compareAtPrice: number | null;
  stock: number;
  inStock: boolean;
  
  // Note: costPrice and admin-only fields are intentionally omitted
  
  options: Record<string, string>;
  image: string | null;
}

export interface StorefrontProductFaq {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
}

export interface StorefrontProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  
  // Legacy / fallback price (if single variant)
  price: number | null;
  
  // SEO & Social (Computed/Fallback)
  seoTitle: string;
  seoDescription: string | null;
  ogImage: string | null;
  
  // Google Merchant Center / Metadata
  gtin: string | null;
  mpn: string | null;
  condition: string | null;

  // Relations
  category?: StorefrontCategory;
  brand?: StorefrontBrand | null;
  images?: StorefrontProductImage[];
  variants?: StorefrontVariant[];
  tags?: string[];
  thumbnail?: string | null;
  gallery?: StorefrontProductImage[];
  primaryImage?: StorefrontProductImage | string | null;
  
  // Stock & Inventory
  stock?: number;
  inStock?: boolean;
  
  rating?: number;
  reviewCount?: number;

  faqs?: StorefrontProductFaq[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// --- Home Content DTOs ---

export interface StorefrontBanner {
  id: string;
  title: string;
  desktopImage: string;
  mobileImage: string | null;
  linkUrl: string | null;
  ctaText: string | null;
  priority: number;
}

export interface StorefrontPopup {
  id: string;
  title: string;
  type: string;
  headline: string | null;
  body: string | null;
  couponCode: string | null;
  imageUrl: string | null;
  delaySeconds: number;
}

export interface StorefrontPromotion {
  id: string;
  name: string;
  type: string;
  discountType: string | null;
  discountValue: number | null;
  priority: number;
  isStackable: boolean;
}

export interface StorefrontCoupon {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  validUntil: Date;
  minOrderAmount: number | null;
}

export interface StorefrontCampaign {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  content: string;
}

export interface StorefrontAnnouncement {
  id: string;
  key: string;
  value: string;
  type: string;
}
