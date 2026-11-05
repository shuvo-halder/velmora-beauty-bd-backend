import { z } from "zod";

export const updateGeneralSettingsSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().optional(),
});

export const updateBrandingSettingsSchema = z.object({
  siteName: z.string().optional(),
  siteTitle: z.string().optional(),
  siteTagline: z.string().optional(),
  siteDescription: z.string().optional(),
  logoUrl: z.string().optional(),
  darkLogoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  adminPanelName: z.string().optional(),
  adminPanelLogo: z.string().optional(),
  invoiceLogo: z.string().optional(),
  primaryColor: z.string().optional(),
  footerText: z.string().optional(),
  defaultLanguage: z.string().optional(),
  defaultCurrency: z.string().optional(),
  defaultTimezone: z.string().optional(),
});

export const updateSEOSettingsSchema = z.object({
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  canonicalUrl: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  twitterTitle: z.string().optional(),
  twitterDescription: z.string().optional(),
  twitterImage: z.string().optional(),
  robotsTxt: z.string().optional(),
  customHeadCode: z.string().optional(),
});

export const updateSMTPSettingsSchema = z.object({
  host: z.string().optional(),
  port: z.number().int().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
  secure: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export const updateAnalyticsSettingsSchema = z.object({
  googleAnalyticsId: z.string().nullable().optional(),
  ga4MeasurementId: z.string().nullable().optional(),
  googleTagManagerId: z.string().nullable().optional(),
  gtmContainerId: z.string().nullable().optional(),
  facebookPixelId: z.string().nullable().optional(),
  metaPixelId: z.string().nullable().optional(),
  tiktokPixelId: z.string().nullable().optional(),
  googleAdsId: z.string().nullable().optional(),
  googleAdsConversionId: z.string().nullable().optional(),
  googleAdsConversionLabel: z.string().nullable().optional(),
  ga4ApiSecret: z.string().nullable().optional(),
  hotjarId: z.string().nullable().optional(),
  enableAnalytics: z.boolean().nullable().optional(),
});

export const updateSecuritySettingsSchema = z.object({
  enable2FA: z.boolean().optional(),
  passwordMinLength: z.number().int().min(1).optional(),
  sessionTimeoutMinutes: z.number().int().min(1).optional(),
  maxLoginAttempts: z.number().int().min(1).optional(),
  enableMaintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().optional(),
});

export const updateShippingSettingsSchema = z.object({
  insideDhakaCharge: z.number().min(0).optional(),
  outsideDhakaCharge: z.number().min(0).optional(),
  defaultShippingCost: z.number().min(0).optional(),
  freeShippingThreshold: z.number().min(0).nullable().optional(),
  freeShippingEnabled: z.boolean().optional(),
  enableFreeShipping: z.boolean().optional(),
});

export const updateTaxSettingsSchema = z.object({
  taxEnabled: z.boolean().optional(),
  enableTax: z.boolean().optional(),
  defaultTaxRate: z.number().min(0).optional(),
  pricesIncludeTax: z.boolean().optional(),
});

export const updateStoreSettingsSchema = z.object({
  whatsappOrderNumber: z.string().optional().nullable(),
  callOrderNumber: z.string().optional().nullable(),
  supportEmail: z.string().email("Invalid email format").optional().nullable().or(z.literal("")),
  supportPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  location: z.string().url("Must be a valid Google Maps URL").optional().nullable().or(z.literal("")),
  facebookUrl: z.string().url("Invalid Facebook URL").optional().nullable().or(z.literal("")),
  instagramUrl: z.string().url("Invalid Instagram URL").optional().nullable().or(z.literal("")),
  youtubeUrl: z.string().url("Invalid YouTube URL").optional().nullable().or(z.literal("")),
  tiktokUrl: z.string().url("Invalid TikTok URL").optional().nullable().or(z.literal("")),
  linkedinUrl: z.string().url("Invalid LinkedIn URL").optional().nullable().or(z.literal("")),
});
