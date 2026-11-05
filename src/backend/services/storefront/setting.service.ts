import { prisma } from "../../config/db";

let cachedPublicSettings: any = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds TTL

export class StorefrontSettingService {
  static clearCache() {
    cachedPublicSettings = null;
    lastCacheTime = 0;
  }

  static async getPublicSettings() {
    const now = Date.now();
    if (cachedPublicSettings && now - lastCacheTime < CACHE_TTL_MS) {
      return cachedPublicSettings;
    }

    const [branding, seo, analytics, store, shipping, tax] = await Promise.all([
      prisma.brandingSetting.findFirst().catch(e => { console.error("Branding DB drift", e); return null; }),
      prisma.sEOSetting.findFirst().catch(e => { console.error("SEO DB drift", e); return null; }),
      prisma.analyticsSetting.findFirst().catch(e => { console.error("Analytics DB drift", e); return null; }),
      prisma.storeSetting.findFirst().catch(e => { console.error("Store DB drift", e); return null; }),
      prisma.shippingSetting.findFirst().catch(e => { console.error("Shipping DB drift", e); return null; }),
      prisma.taxSetting.findFirst().catch(e => { console.error("Tax DB drift", e); return null; })
    ]);

    const result = {
      branding: {
        siteName: branding?.siteName || "Enterprise Store",
        siteTitle: branding?.siteTitle || branding?.siteName || "Enterprise E-Commerce Platform",
        siteTagline: branding?.siteTagline || "High Performance Modular E-Commerce",
        siteDescription: branding?.siteDescription || "Shop top quality modular equipment and accessories.",
        logoUrl: branding?.logoUrl || null,
        darkLogoUrl: branding?.darkLogoUrl || null,
        faviconUrl: branding?.faviconUrl || null,
        adminPanelName: branding?.adminPanelName || "Admin Portal",
        adminPanelLogo: branding?.adminPanelLogo || null,
        primaryColor: branding?.primaryColor || "#0f172a",
        footerText: branding?.footerText || "© 2026 Enterprise Store. All rights reserved.",
        defaultLanguage: branding?.defaultLanguage || "en",
        defaultCurrency: branding?.defaultCurrency || "BDT",
        defaultTimezone: branding?.defaultTimezone || "UTC"
      },
      seo: {
        metaTitle: seo?.metaTitle || branding?.siteTitle || "Enterprise E-Commerce",
        metaDescription: seo?.metaDescription || branding?.siteDescription || "Shop top quality modular equipment and accessories.",
        metaKeywords: seo?.metaKeywords || null,
        canonicalUrl: seo?.canonicalUrl || null,
        ogTitle: seo?.ogTitle || seo?.metaTitle || branding?.siteTitle || null,
        ogDescription: seo?.ogDescription || seo?.metaDescription || branding?.siteDescription || null,
        ogImage: seo?.ogImage || null,
        twitterTitle: seo?.twitterTitle || seo?.metaTitle || null,
        twitterDescription: seo?.twitterDescription || seo?.metaDescription || null,
        twitterImage: seo?.twitterImage || seo?.ogImage || null,
        robotsTxt: seo?.robotsTxt || "User-agent: *\nAllow: /",
        customHeadCode: seo?.customHeadCode || null
      },
      analytics: analytics ? {
        ga4MeasurementId: analytics.googleAnalyticsId,
        gtmContainerId: analytics.googleTagManagerId,
        facebookPixelId: analytics.facebookPixelId,
        tiktokPixelId: analytics.tiktokPixelId,
        googleAdsId: analytics.googleAdsId,
        googleAdsConversionId: analytics.googleAdsConversionId || analytics.googleAdsId || null,
        googleAdsConversionLabel: analytics.googleAdsConversionLabel || null,
        hotjarId: analytics.hotjarId,
        enableAnalytics: Boolean(analytics.enableAnalytics)
      } : {
        ga4MeasurementId: process.env.GA_MEASUREMENT_ID || null,
        gtmContainerId: null,
        facebookPixelId: null,
        tiktokPixelId: null,
        googleAdsId: null,
        googleAdsConversionId: null,
        googleAdsConversionLabel: null,
        hotjarId: null,
        enableAnalytics: false
      },
      store: {
        whatsappOrderNumber: store?.whatsappOrderNumber || null,
        callOrderNumber: store?.callOrderNumber || null,
        supportEmail: store?.supportEmail || null,
        supportPhone: store?.supportPhone || store?.callOrderNumber || null,
        address: store?.address || null,
        city: store?.city || null,
        country: store?.country || null,
        location: store?.location || null,
        facebookUrl: store?.facebookUrl || null,
        instagramUrl: store?.instagramUrl || null,
        youtubeUrl: store?.youtubeUrl || null,
        tiktokUrl: store?.tiktokUrl || null,
        linkedinUrl: store?.linkedinUrl || null,
      },
      shipping: shipping ? {
        insideDhakaCharge: Number(shipping.insideDhakaCharge ?? 60),
        outsideDhakaCharge: Number(shipping.outsideDhakaCharge ?? 120),
        freeShippingThreshold: shipping.freeShippingThreshold !== null && shipping.freeShippingThreshold !== undefined ? Number(shipping.freeShippingThreshold) : 2000,
        freeShippingEnabled: Boolean(shipping.freeShippingEnabled ?? shipping.enableFreeShipping ?? true),
        currency: "BDT"
      } : {
        insideDhakaCharge: 60,
        outsideDhakaCharge: 120,
        freeShippingThreshold: 2000,
        freeShippingEnabled: true,
        currency: "BDT"
      },
      tax: tax ? {
        defaultTaxRate: Number(tax.defaultTaxRate ?? 0),
        taxRate: Number(tax.defaultTaxRate ?? 0),
        pricesIncludeTax: Boolean(tax.pricesIncludeTax ?? false),
        taxEnabled: Boolean(tax.taxEnabled ?? tax.enableTax ?? true),
        enableTax: Boolean(tax.taxEnabled ?? tax.enableTax ?? true)
      } : {
        defaultTaxRate: 0,
        taxRate: 0,
        pricesIncludeTax: false,
        taxEnabled: true,
        enableTax: true
      }
    };

    cachedPublicSettings = result;
    lastCacheTime = now;
    return result;
  }

  static async getShippingSettings() {
    const publicSettings = await this.getPublicSettings();
    return publicSettings.shipping;
  }
}
