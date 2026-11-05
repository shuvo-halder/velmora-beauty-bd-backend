
import { SeoResponse } from "../../dtos/storefront/seo.dto";

import { prisma } from "../../config/db";

function getBaseUrl(host: string): string {
  const envUrl = process.env.STOREFRONT_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }
  return `https://${host}`;
}

export const seoService = {
  async getProductSeo(slug: string, host: string): Promise<SeoResponse | null> {
    const product = await prisma.product.findFirst({
      where: {
        slug,
        deletedAt: null,
        isActive: true,
        status: "Active"
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        shortDescription: true,
        metaTitle: true,
        metaDescription: true,
        ogImage: true,
        sku: true,
        price: true,
        brand: {
          select: {
            name: true
          }
        },
        images: {
          select: {
            url: true,
            isPrimary: true,
            sortOrder: true
          },
          orderBy: {
            sortOrder: "asc"
          }
        },
        inventory: {
          select: {
            quantityAvailable: true,
            quantity: true
          }
        },
        variants: {
          where: {
            deletedAt: null,
            isActive: true
          },
          select: {
            inventories: {
              select: {
                quantityAvailable: true,
                quantity: true
              }
            }
          }
        }
      }
    });

    if (!product) {
      return null;
    }

    // Fallbacks
    const title = product.metaTitle || product.name;
    const description = product.metaDescription || product.shortDescription || product.description || "";
    
    const primaryImg = product.images.find(img => img.isPrimary)?.url || product.images[0]?.url || null;
    const ogImage = product.ogImage || primaryImg || null;

    const baseUrl = getBaseUrl(host);
    const canonicalUrl = `${baseUrl}/products/${product.slug}`;

    // Availability mapping
    let inStock = false;
    if (product.inventory && (product.inventory.quantityAvailable > 0 || product.inventory.quantity > 0)) {
      inStock = true;
    } else if (product.variants && product.variants.some(v => v.inventories && v.inventories.some(i => i.quantityAvailable > 0 || i.quantity > 0))) {
      inStock = true;
    }

    const availabilityString = inStock ? "InStock" : "OutOfStock";

    // JSON-LD Product Schema
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": description,
      "image": ogImage || undefined,
      "sku": product.sku || undefined,
      "brand": product.brand ? {
        "@type": "Brand",
        "name": product.brand.name
      } : undefined,
      "offers": {
        "@type": "Offer",
        "price": product.price ? Number(product.price).toFixed(2) : "0.00",
        "priceCurrency": "BDT",
        "availability": `https://schema.org/${availabilityString}`,
        "url": canonicalUrl
      }
    };

    return {
      seo: {
        title,
        description,
        canonicalUrl
      },
      openGraph: {
        ogTitle: title,
        ogDescription: description,
        ogImage,
        ogUrl: canonicalUrl,
        ogType: "product"
      },
      twitter: {
        twitterTitle: title,
        twitterDescription: description,
        twitterImage: ogImage,
        twitterCard: "summary_large_image"
      },
      structuredData
    };
  },

  async getCategorySeo(slug: string, host: string): Promise<SeoResponse | null> {
    const category = await prisma.category.findFirst({
      where: {
        slug,
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        metaTitle: true,
        metaDescription: true
      }
    });

    if (!category) {
      return null;
    }

    // Fallbacks
    const title = category.metaTitle || category.name;
    const description = category.metaDescription || category.description || "";
    const ogImage = category.image || null;

    const baseUrl = getBaseUrl(host);
    const canonicalUrl = `${baseUrl}/categories/${category.slug}`;

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": category.name,
      "description": description,
      "url": canonicalUrl
    };

    return {
      seo: {
        title,
        description,
        canonicalUrl
      },
      openGraph: {
        ogTitle: title,
        ogDescription: description,
        ogImage,
        ogUrl: canonicalUrl,
        ogType: "website"
      },
      twitter: {
        twitterTitle: title,
        twitterDescription: description,
        twitterImage: ogImage,
        twitterCard: "summary_large_image"
      },
      structuredData
    };
  },

  async getBrandSeo(slug: string, host: string): Promise<SeoResponse | null> {
    const brand = await prisma.brand.findFirst({
      where: {
        slug,
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true
      }
    });

    if (!brand) {
      return null;
    }

    // Fallbacks
    const title = brand.name;
    const description = brand.description || "";
    const ogImage = brand.logoUrl || null;

    const baseUrl = getBaseUrl(host);
    const canonicalUrl = `${baseUrl}/brands/${brand.slug}`;

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Brand",
      "name": brand.name,
      "description": description,
      "logo": ogImage || undefined,
      "url": canonicalUrl
    };

    return {
      seo: {
        title,
        description,
        canonicalUrl
      },
      openGraph: {
        ogTitle: title,
        ogDescription: description,
        ogImage,
        ogUrl: canonicalUrl,
        ogType: "website"
      },
      twitter: {
        twitterTitle: title,
        twitterDescription: description,
        twitterImage: ogImage,
        twitterCard: "summary_large_image"
      },
      structuredData
    };
  },

  async getSearchSeo(query: string, host: string): Promise<SeoResponse> {
    const title = `Search results for "${query}"`;
    const description = `Find the best products matching "${query}" on our store.`;
    const baseUrl = getBaseUrl(host);
    const canonicalUrl = `${baseUrl}/search?q=${encodeURIComponent(query)}`;

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SearchResultsPage",
      "name": title,
      "description": description,
      "url": canonicalUrl
    };

    return {
      seo: {
        title,
        description,
        canonicalUrl
      },
      openGraph: {
        ogTitle: title,
        ogDescription: description,
        ogImage: null,
        ogUrl: canonicalUrl,
        ogType: "website"
      },
      twitter: {
        twitterTitle: title,
        twitterDescription: description,
        twitterImage: null,
        twitterCard: "summary"
      },
      structuredData
    };
  }
};
