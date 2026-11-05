import { Request, Response, NextFunction } from 'express';
import { prisma } from "../config/db";
import { StorefrontSettingService } from "../services/storefront/setting.service";

export const getGlobalSeo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const seoSetting = await prisma.sEOSetting.findFirst();
    const branding = await prisma.brandingSetting.findFirst();
    
    res.json({
      siteTitle: seoSetting?.metaTitle || branding?.siteTitle || "Enterprise Store",
      siteDescription: seoSetting?.metaDescription || branding?.siteDescription || "Shop top quality equipment.",
      metaKeywords: seoSetting?.metaKeywords || null,
      defaultOgImage: seoSetting?.ogImage || null,
      robotsConfig: seoSetting?.robotsTxt || null,
    });
  } catch (error) {
    next(error);
  }
};

export const updateGlobalSeo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const seoSetting = await prisma.sEOSetting.findFirst();
    const payload = {
        metaTitle: req.body.siteTitle,
        metaDescription: req.body.siteDescription,
        metaKeywords: req.body.metaKeywords,
        ogImage: req.body.defaultOgImage,
        robotsTxt: req.body.robotsConfig,
    };
    
    // Remove undefined values to preserve patch semantics if any
    const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([_, v]) => v !== undefined)
    );

    if (seoSetting) {
      await prisma.sEOSetting.update({ where: { id: seoSetting.id }, data: cleanPayload });
    } else {
      await prisma.sEOSetting.create({ data: cleanPayload });
    }
    
    StorefrontSettingService.clearCache();
    
    res.json({
      siteTitle: req.body.siteTitle,
      siteDescription: req.body.siteDescription,
      metaKeywords: req.body.metaKeywords,
      defaultOgImage: req.body.defaultOgImage,
      robotsConfig: req.body.robotsConfig,
    });
  } catch (error) {
    next(error);
  }
};
