import { StorefrontSettingService } from "./setting.service";

export class StorefrontAnalyticsService {
  static async getAnalyticsConfig() {
    const settings = await StorefrontSettingService.getPublicSettings();
    return settings.analytics;
  }
}
