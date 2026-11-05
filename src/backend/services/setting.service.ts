import { prisma } from "../config/db";
import { AppError } from "../utils/AppError";
import { EventService } from "./event.service";
import { ActivityType } from "@prisma/client";
import { StorefrontSettingService } from "./storefront/setting.service";

export class SettingService {
  static async getStore() {
    let setting = await prisma.storeSetting.findFirst();
    if (!setting) setting = await prisma.storeSetting.create({ data: {} });
    return setting;
  }

  static async updateStore(data: any, userId: string) {
    const payload = {
      whatsappOrderNumber: data.whatsappOrderNumber !== undefined ? (data.whatsappOrderNumber?.trim() || null) : undefined,
      callOrderNumber: data.callOrderNumber !== undefined ? (data.callOrderNumber?.trim() || null) : undefined,
      supportEmail: data.supportEmail !== undefined ? (data.supportEmail?.trim() || null) : undefined,
      supportPhone: data.supportPhone !== undefined ? (data.supportPhone?.trim() || null) : undefined,
      address: data.address !== undefined ? (data.address?.trim() || null) : undefined,
      city: data.city !== undefined ? (data.city?.trim() || null) : undefined,
      country: data.country !== undefined ? (data.country?.trim() || null) : undefined,
      location: data.location !== undefined ? (data.location?.trim() || null) : undefined,
      facebookUrl: data.facebookUrl !== undefined ? (data.facebookUrl?.trim() || null) : undefined,
      instagramUrl: data.instagramUrl !== undefined ? (data.instagramUrl?.trim() || null) : undefined,
      youtubeUrl: data.youtubeUrl !== undefined ? (data.youtubeUrl?.trim() || null) : undefined,
      tiktokUrl: data.tiktokUrl !== undefined ? (data.tiktokUrl?.trim() || null) : undefined,
      linkedinUrl: data.linkedinUrl !== undefined ? (data.linkedinUrl?.trim() || null) : undefined,
    };

    // Filter out undefined values
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== undefined)
    );

    let setting = await prisma.storeSetting.findFirst();
    if (setting) {
      setting = await prisma.storeSetting.update({ where: { id: setting.id }, data: cleanPayload });
    } else {
      setting = await prisma.storeSetting.create({ data: cleanPayload });
    }
    StorefrontSettingService.clearCache();
    await prisma.activityLog.create({
      data: {
        userId,
        action: "UPDATE_STORE",
        entityType: "Settings",
        entityId: setting.id,
        details: JSON.stringify(cleanPayload)
      }
    });
    return setting;
  }

  static async getBranding() {
    let setting = await prisma.brandingSetting.findFirst();
    if (!setting) setting = await prisma.brandingSetting.create({ data: {} });
    return setting;
  }

  static async updateBranding(data: any, userId: string) {
    const cleanData = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === "" ? null : v]).filter(([_, v]) => v !== undefined)
    );
    let setting = await prisma.brandingSetting.findFirst();
    if (setting) {
      setting = await prisma.brandingSetting.update({ where: { id: setting.id }, data: cleanData as any });
    } else {
      setting = await prisma.brandingSetting.create({ data: cleanData as any });
    }
    StorefrontSettingService.clearCache();
    await prisma.activityLog.create({
      data: {
        userId,
        action: "UPDATE_BRANDING",
        entityType: "Settings",
        entityId: setting.id,
        details: JSON.stringify(cleanData)
      }
    });
    return setting;
  }

  static async getSEO() {
    let setting = await prisma.sEOSetting.findFirst();
    if (!setting) setting = await prisma.sEOSetting.create({ data: {} });
    return setting;
  }

  static async updateSEO(data: any, userId: string) {
    const cleanData = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === "" ? null : v]).filter(([_, v]) => v !== undefined)
    );
    let setting = await prisma.sEOSetting.findFirst();
    if (setting) {
      setting = await prisma.sEOSetting.update({ where: { id: setting.id }, data: cleanData as any });
    } else {
      setting = await prisma.sEOSetting.create({ data: cleanData as any });
    }

    StorefrontSettingService.clearCache();
    await prisma.activityLog.create({
      data: {
        userId,
        action: "UPDATE_SEO",
        entityType: "Settings",
        entityId: setting.id,
        details: JSON.stringify(cleanData)
      }
    });
    return setting;
  }

  static async getSMTP() {
    let setting = await prisma.sMTPSetting.findFirst();
    if (!setting) setting = await prisma.sMTPSetting.create({ data: { port: 587, secure: false } });
    const result = { ...setting };
    if (result.password) {
      result.password = "********";
    }
    return result;
  }

  static async updateSMTP(data: any, userId: string) {
    if (data.password === "********") {
      delete data.password;
    }

    // Default secure mode based on standard port expectations if not explicitly provided
    if (data.port === 587 && data.secure === undefined) {
      data.secure = false;
    } else if (data.port === 465 && data.secure === undefined) {
      data.secure = true;
    }

    let setting = await prisma.sMTPSetting.findFirst();
    if (setting) {
      setting = await prisma.sMTPSetting.update({ where: { id: setting.id }, data });
    } else {
      setting = await prisma.sMTPSetting.create({ data });
    }

    // Redact password and sensitive credentials before logging into ActivityLog
    const auditDetails = { ...data };
    if (auditDetails.password) {
      auditDetails.password = "[REDACTED]";
    }

    await prisma.activityLog.create({
      data: {
        userId,
        action: "UPDATE_SMTP",
        entityType: "Settings",
        entityId: setting.id,
        details: JSON.stringify(auditDetails)
      }
    });

    const result = { ...setting };
    if (result.password) {
      result.password = "********";
    }
    return result;
  }

  static async getAnalytics() {
    let setting = await prisma.analyticsSetting.findFirst();
    if (!setting) setting = await prisma.analyticsSetting.create({ data: {} });
    return setting;
  }

  static async updateAnalytics(data: any, userId: string) {
    const payload: any = { ...data };
    if (payload.ga4MeasurementId) {
      payload.googleAnalyticsId = payload.ga4MeasurementId;
    }
    if (payload.gtmContainerId) {
      payload.googleTagManagerId = payload.gtmContainerId;
    }
    if (payload.metaPixelId) {
      payload.facebookPixelId = payload.metaPixelId;
    }

    const sanitizedData: any = {};
    const allowedKeys = [
      "googleAnalyticsId",
      "googleTagManagerId",
      "facebookPixelId",
      "tiktokPixelId",
      "googleAdsId",
      "googleAdsConversionId",
      "googleAdsConversionLabel",
      "ga4ApiSecret",
      "hotjarId",
      "enableAnalytics",
    ];

    allowedKeys.forEach((key) => {
      if (typeof payload[key] !== "undefined") {
        if (key === "enableAnalytics") {
          sanitizedData[key] = Boolean(payload[key]);
        } else {
          // Normalize empty strings to null
          const val = payload[key];
          sanitizedData[key] = (val === "" || val === null) ? null : val;
        }
      }
    });

    let setting = await prisma.analyticsSetting.findFirst();
    if (setting) {
      setting = await prisma.analyticsSetting.update({ where: { id: setting.id }, data: sanitizedData });
    } else {
      setting = await prisma.analyticsSetting.create({ data: sanitizedData });
    }
    StorefrontSettingService.clearCache();
    await prisma.activityLog.create({
      data: {
        userId,
        action: "UPDATE_ANALYTICS",
        entityType: "Settings",
        entityId: setting.id,
        details: JSON.stringify(data)
      }
    });
    return setting;
  }

  static async getSecurity() {
    let setting = await prisma.securitySetting.findFirst();
    if (!setting) setting = await prisma.securitySetting.create({ data: {} });
    return setting;
  }

  static async updateSecurity(data: any, userId: string) {
    let setting = await prisma.securitySetting.findFirst();
    if (setting) {
      setting = await prisma.securitySetting.update({ where: { id: setting.id }, data });
    } else {
      setting = await prisma.securitySetting.create({ data });
    }
    await prisma.activityLog.create({
      data: {
        userId,
        action: "UPDATE_SECURITY",
        entityType: "Settings",
        entityId: setting.id,
        details: JSON.stringify(data)
      }
    });
    return setting;
  }

  static async getShipping() {
    let setting = await prisma.shippingSetting.findFirst();
    if (!setting) {
      setting = await prisma.shippingSetting.create({
        data: {
          insideDhakaCharge: 60,
          outsideDhakaCharge: 120,
          defaultShippingCost: 60,
          freeShippingThreshold: 2000,
          freeShippingEnabled: true,
          enableFreeShipping: true,
        },
      });
    }
    return {
      ...setting,
      insideDhakaCharge: setting.insideDhakaCharge ?? 60,
      outsideDhakaCharge: setting.outsideDhakaCharge ?? 120,
      freeShippingThreshold: setting.freeShippingThreshold !== null ? setting.freeShippingThreshold : 2000,
      freeShippingEnabled: setting.freeShippingEnabled ?? setting.enableFreeShipping ?? true,
      enableFreeShipping: setting.freeShippingEnabled ?? setting.enableFreeShipping ?? true,
    };
  }

  static async updateShipping(data: any, userId: string) {
    let setting = await prisma.shippingSetting.findFirst();

    // Synchronize boolean and cost alias fields
    if (data.freeShippingEnabled !== undefined && data.enableFreeShipping === undefined) {
      data.enableFreeShipping = data.freeShippingEnabled;
    } else if (data.enableFreeShipping !== undefined && data.freeShippingEnabled === undefined) {
      data.freeShippingEnabled = data.enableFreeShipping;
    }
    if (data.insideDhakaCharge !== undefined && data.defaultShippingCost === undefined) {
      data.defaultShippingCost = data.insideDhakaCharge;
    }

    if (setting) {
      setting = await prisma.shippingSetting.update({ where: { id: setting.id }, data });
    } else {
      setting = await prisma.shippingSetting.create({ data });
    }
    StorefrontSettingService.clearCache();
    await prisma.activityLog.create({
      data: {
        userId,
        action: "UPDATE_SHIPPING",
        entityType: "Settings",
        entityId: setting.id,
        details: JSON.stringify(data)
      }
    });
    return setting;
  }

  static async getTax() {
    let setting = await prisma.taxSetting.findFirst();
    if (!setting) setting = await prisma.taxSetting.create({ data: {} });
    return setting;
  }

  static async updateTax(data: any, userId: string) {
    if (data.taxEnabled !== undefined && data.enableTax === undefined) {
      data.enableTax = data.taxEnabled;
    } else if (data.enableTax !== undefined && data.taxEnabled === undefined) {
      data.taxEnabled = data.enableTax;
    }

    let setting = await prisma.taxSetting.findFirst();
    if (setting) {
      setting = await prisma.taxSetting.update({ where: { id: setting.id }, data });
    } else {
      setting = await prisma.taxSetting.create({ data });
    }
    StorefrontSettingService.clearCache();
    await prisma.activityLog.create({
      data: {
        userId,
        action: "UPDATE_TAX",
        entityType: "Settings",
        entityId: setting.id,
        details: JSON.stringify(data)
      }
    });
    return setting;
  }

  static async getGeneral() {
    return prisma.setting.findMany();
  }

  static async updateGeneral(data: any[], userId: string) {
    // Assuming data is an array of { key, value }
    const txs = data.map(item => prisma.setting.upsert({
      where: { key: item.key },
      create: { group: 'general', key: item.key, value: item.value, type: 'string' },
      update: { value: item.value }
    }));
    await prisma.$transaction(txs);
    StorefrontSettingService.clearCache();
    await prisma.activityLog.create({
      data: {
        userId,
        action: "UPDATE_GENERAL",
        entityType: "Settings",
        entityId: "general",
        details: JSON.stringify(data)
      }
    });
    return this.getGeneral();
  }
}
