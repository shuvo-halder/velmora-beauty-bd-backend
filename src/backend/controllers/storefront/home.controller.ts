import { Request, Response } from "express";
import { storefrontContentService } from "../../services/storefront/content.service";
import {
  mapBannerToStorefrontDTO,
  mapPopupToStorefrontDTO,
  mapPromotionToStorefrontDTO,
  mapCouponToStorefrontDTO,
  mapCampaignToStorefrontDTO,
  mapAnnouncementToStorefrontDTO
} from "../../dtos/storefront/mappers";

export const getBanners = async (req: Request, res: Response) => {
  const banners = await storefrontContentService.getActiveBanners();
  res.json({
    status: "success",
    data: banners.map(mapBannerToStorefrontDTO)
  });
};

export const getPopups = async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  const popups = await storefrontContentService.getActivePopups(type);
  res.json({
    status: "success",
    data: popups.map(mapPopupToStorefrontDTO)
  });
};

export const getPromotions = async (req: Request, res: Response) => {
  const promotions = await storefrontContentService.getActivePromotions();
  res.json({
    status: "success",
    data: promotions.map(mapPromotionToStorefrontDTO)
  });
};

export const getCoupons = async (req: Request, res: Response) => {
  const coupons = await storefrontContentService.getPublicCoupons();
  res.json({
    status: "success",
    data: coupons.map(mapCouponToStorefrontDTO)
  });
};

export const getCampaigns = async (req: Request, res: Response) => {
  const campaigns = await storefrontContentService.getActiveCampaigns();
  res.json({
    status: "success",
    data: campaigns.map(mapCampaignToStorefrontDTO)
  });
};

export const getAnnouncements = async (req: Request, res: Response) => {
  const announcements = await storefrontContentService.getPublicAnnouncements();
  res.json({
    status: "success",
    data: announcements.map(mapAnnouncementToStorefrontDTO)
  });
};

export const getHome = async (req: Request, res: Response) => {
  const [
    banners,
    popups,
    promotions,
    coupons,
    campaigns,
    announcements
  ] = await Promise.all([
    storefrontContentService.getActiveBanners(),
    storefrontContentService.getActivePopups(),
    storefrontContentService.getActivePromotions(),
    storefrontContentService.getPublicCoupons(),
    storefrontContentService.getActiveCampaigns(),
    storefrontContentService.getPublicAnnouncements()
  ]);

  res.json({
    status: "success",
    data: {
      banners: banners.map(mapBannerToStorefrontDTO),
      popups: popups.map(mapPopupToStorefrontDTO),
      promotions: promotions.map(mapPromotionToStorefrontDTO),
      coupons: coupons.map(mapCouponToStorefrontDTO),
      campaigns: campaigns.map(mapCampaignToStorefrontDTO),
      announcements: announcements.map(mapAnnouncementToStorefrontDTO)
    }
  });
};
