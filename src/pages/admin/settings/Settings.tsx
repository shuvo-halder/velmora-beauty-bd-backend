import { api } from "../../../lib/api";
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "../../../services/setting.service";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { LoadingSpinner } from "../../../components/ui/LoadingSpinner";
import { Save, Eye, Globe, Image, Shield, Truck, Receipt, Mail, BarChart, Check, Palette, RefreshCw, Phone, AlertCircle } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useBranding } from "../../../context/BrandingContext";
import { MediaUploaderInput } from "../../../components/admin/MediaUploaderInput";
import { notify } from "../../../lib/notify";

import { PermissionGuard } from "../../../components/layout/PermissionGuard";
import { CourierProvidersSection } from "../../../components/admin/settings/CourierProvidersSection";

const TABS = [
  { id: "Branding", label: "Branding", icon: Palette },
  { id: "SEO", label: "SEO & Meta", icon: Globe },
  { id: "SMTP", label: "SMTP Email", icon: Mail },
  { id: "Analytics", label: "Analytics", icon: BarChart },
  { id: "Security", label: "Security", icon: Shield },
  { id: "Shipping", label: "Shipping", icon: Truck },
  { id: "Tax", label: "Tax Rules", icon: Receipt },
  { id: "Store", label: "Store Contact", icon: Phone },
];

export function Settings() {
  const [activeTab, setActiveTab] = useState("Branding");
  const queryClient = useQueryClient();
  const { branding, updateBrandingState, setPageTitle } = useBranding();
  const [formData, setFormData] = useState<any>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setPageTitle("Settings - " + activeTab);
  }, [activeTab, setPageTitle]);

  const { isLoading } = useQuery({
    queryKey: ["settings", activeTab.toLowerCase()],
    queryFn: async () => {
      const data = await getSettings(activeTab.toLowerCase());
      setFormData(data || {});
      setValidationError(null);
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: () => updateSettings(activeTab.toLowerCase(), formData),
    onSuccess: (updatedData) => {
      queryClient.invalidateQueries({ queryKey: ["settings", activeTab.toLowerCase()] });
      queryClient.invalidateQueries({ queryKey: ["storefront-settings"] });
      if (activeTab === "Branding") {
        updateBrandingState(formData);
      }
      setSaveSuccess(true);
      notify.success("Settings Saved", `${activeTab} settings updated successfully.`);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err) => {
      notify.apiError(err, `Failed to update ${activeTab} settings.`);
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setValidationError(null);
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev: any) => ({ ...prev, [name]: checked }));
    } else if (type === "number") {
      setFormData((prev: any) => ({ ...prev, [name]: value === "" ? "" : Number(value) }));
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation for Shipping
    if (activeTab === "Shipping") {
      const inside = Number(formData.insideDhakaCharge ?? 60);
      const outside = Number(formData.outsideDhakaCharge ?? 120);
      const threshold = Number(formData.freeShippingThreshold ?? 2000);

      if (isNaN(inside) || inside < 0) {
        const msg = "Inside Dhaka charge must be a valid non-negative number.";
        setValidationError(msg);
        notify.error("Validation Error", msg);
        return;
      }
      if (isNaN(outside) || outside < 0) {
        const msg = "Outside Dhaka charge must be a valid non-negative number.";
        setValidationError(msg);
        notify.error("Validation Error", msg);
        return;
      }
      if (isNaN(threshold) || threshold < 0) {
        const msg = "Free shipping threshold must be a valid non-negative amount.";
        setValidationError(msg);
        notify.error("Validation Error", msg);
        return;
      }
    }

    // Validation for Tax
    if (activeTab === "Tax") {
      const rate = Number(formData.defaultTaxRate ?? 0);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        const msg = "Default tax rate must be a valid percentage between 0% and 100%.";
        setValidationError(msg);
        notify.error("Validation Error", msg);
        return;
      }
    }

    mutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
        <p className="text-muted-foreground">Manage global storefront branding, SEO, security, and integration parameters.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Tabs */}
        <Card className="w-full md:w-64 p-2 h-fit shrink-0">
          <nav className="flex flex-col gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium rounded-md transition-colors",
                    activeTab === tab.id 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </Card>

        {/* Main Settings Form Container */}
        <div className="flex-1 space-y-6">
          <Card className="p-6">
            {isLoading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b">
                  <div>
                    <h3 className="text-lg font-semibold">{activeTab} Settings</h3>
                    <p className="text-xs text-muted-foreground">Configure your platform {activeTab.toLowerCase()} parameters.</p>
                  </div>
                  {saveSuccess && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200 text-xs font-semibold rounded-full animate-fade-in">
                      <Check className="h-3.5 w-3.5" /> Saved successfully
                    </div>
                  )}
                </div>

                {/* BRANDING TAB */}
                {activeTab === "Branding" && (
                  <div className="space-y-6">
                    {/* Live Preview Card */}
                    <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <Eye className="h-4 w-4 text-primary" /> Live Branding Preview
                      </div>
                      
                      {/* Browser Tab Preview */}
                      <div className="bg-white dark:bg-slate-950 rounded-lg border p-3 shadow-sm space-y-2">
                        <span className="text-xs text-muted-foreground font-medium block">Browser Tab Display:</span>
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md max-w-sm border">
                          <div className="h-4 w-4 shrink-0 flex items-center justify-center overflow-hidden rounded">
                            {formData.faviconUrl ? (
                              <img src={formData.faviconUrl} alt="Favicon" className="h-4 w-4 object-contain" />
                            ) : (
                              <div className="h-3.5 w-3.5 bg-primary rounded-full text-[8px] text-primary-foreground font-bold flex items-center justify-center">
                                {(formData.siteTitle || formData.adminPanelName || "A").charAt(0)}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-medium text-foreground truncate">
                            {formData.siteTitle || formData.adminPanelName || "Enterprise Admin Portal"}
                          </span>
                        </div>
                      </div>

                      {/* Portal Brand Header Preview */}
                      <div className="bg-white dark:bg-slate-950 rounded-lg border p-3 shadow-sm space-y-2">
                        <span className="text-xs text-muted-foreground font-medium block">Admin Sidebar Header Display:</span>
                        <div className="flex items-center gap-3 p-2 bg-slate-900 text-white rounded-md max-w-xs">
                          {formData.adminPanelLogo || formData.logoUrl ? (
                            <img src={formData.adminPanelLogo || formData.logoUrl} alt="Logo" className="h-6 max-w-[100px] object-contain" />
                          ) : (
                            <div className="h-6 w-6 bg-primary rounded flex items-center justify-center font-bold text-xs">
                              {(formData.adminPanelName || "A").charAt(0)}
                            </div>
                          )}
                          <span className="font-bold text-sm truncate">
                            {formData.adminPanelName || "Admin Portal"}
                          </span>
                        </div>
                      </div>

                      {/* Primary Color & Footer Preview */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-950 rounded-lg border p-3 shadow-sm space-y-1">
                          <span className="text-xs text-muted-foreground font-medium block">Primary Brand Accent:</span>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-12 rounded border shadow-inner" style={{ backgroundColor: formData.primaryColor || "#0f172a" }} />
                            <span className="text-xs font-mono">{formData.primaryColor || "#0f172a"}</span>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-950 rounded-lg border p-3 shadow-sm space-y-1">
                          <span className="text-xs text-muted-foreground font-medium block">Footer Notice:</span>
                          <p className="text-xs text-slate-600 dark:text-slate-400 italic truncate">
                            {formData.footerText || "© 2026 Enterprise Store"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Site Name</label>
                        <Input name="siteName" value={formData.siteName || ""} onChange={handleChange} placeholder="Enterprise Store" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Site Title (Browser Tab)</label>
                        <Input name="siteTitle" value={formData.siteTitle || ""} onChange={handleChange} placeholder="Enterprise E-Commerce Portal" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Admin Portal Name</label>
                        <Input name="adminPanelName" value={formData.adminPanelName || ""} onChange={handleChange} placeholder="Admin Portal" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Site Tagline</label>
                        <Input name="siteTagline" value={formData.siteTagline || ""} onChange={handleChange} placeholder="Enterprise Management Suite" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-sm font-medium mb-1 block">Site Description</label>
                        <textarea
                          name="siteDescription"
                          rows={2}
                          value={formData.siteDescription || ""}
                          onChange={handleChange}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Shop high quality equipment and accessories."
                        />
                      </div>
                      <MediaUploaderInput
                        label="Company Logo (Light Theme)"
                        value={formData.logoUrl || ""}
                        onChange={(url) => setFormData((prev: any) => ({ ...prev, logoUrl: url }))}
                        folder="settings/branding"
                        placeholder="Upload or enter Company Logo URL"
                      />
                      <MediaUploaderInput
                        label="Dark Theme Logo"
                        value={formData.darkLogoUrl || ""}
                        onChange={(url) => setFormData((prev: any) => ({ ...prev, darkLogoUrl: url }))}
                        folder="settings/branding"
                        placeholder="Upload or enter Dark Logo URL"
                      />
                      <MediaUploaderInput
                        label="Favicon (Browser Icon)"
                        value={formData.faviconUrl || ""}
                        onChange={(url) => setFormData((prev: any) => ({ ...prev, faviconUrl: url }))}
                        folder="settings/branding"
                        placeholder="Upload or enter Favicon ICO/PNG URL"
                      />
                      <MediaUploaderInput
                        label="Admin Panel Logo"
                        value={formData.adminPanelLogo || ""}
                        onChange={(url) => setFormData((prev: any) => ({ ...prev, adminPanelLogo: url }))}
                        folder="settings/branding"
                        placeholder="Upload or enter Admin Panel Logo URL"
                      />
                      <MediaUploaderInput
                        label="Invoice Header Logo"
                        value={formData.invoiceLogo || ""}
                        onChange={(url) => setFormData((prev: any) => ({ ...prev, invoiceLogo: url }))}
                        folder="settings/branding"
                        placeholder="Upload or enter Invoice Logo URL"
                      />
                      <div>
                        <label className="text-sm font-medium mb-1 block">Primary Brand Color</label>
                        <div className="flex gap-2 items-center">
                          <Input type="color" name="primaryColor" value={formData.primaryColor || "#0f172a"} onChange={handleChange} className="h-10 w-16 p-1 cursor-pointer" />
                          <Input name="primaryColor" value={formData.primaryColor || "#0f172a"} onChange={handleChange} className="flex-1 font-mono" />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Default Currency</label>
                        <Input name="defaultCurrency" value={formData.defaultCurrency || "BDT"} onChange={handleChange} placeholder="BDT" />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">Footer Copyright Text</label>
                      <Input name="footerText" value={formData.footerText || ""} onChange={handleChange} placeholder="© 2026 Enterprise Store. All rights reserved." />
                    </div>
                  </div>
                )}

                {/* SEO TAB */}
                {activeTab === "SEO" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Global Meta Title</label>
                      <Input name="metaTitle" value={formData.metaTitle || ""} onChange={handleChange} placeholder="Enterprise E-Commerce Store" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Global Meta Description</label>
                      <textarea
                        name="metaDescription"
                        rows={3}
                        value={formData.metaDescription || ""}
                        onChange={handleChange}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="The premier online destination for quality products."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Meta Keywords</label>
                      <Input name="metaKeywords" value={formData.metaKeywords || ""} onChange={handleChange} placeholder="ecommerce, store, online shopping" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Canonical Base URL</label>
                      <Input name="canonicalUrl" value={formData.canonicalUrl || ""} onChange={handleChange} placeholder="https://mystore.com" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">OpenGraph Title</label>
                        <Input name="ogTitle" value={formData.ogTitle || ""} onChange={handleChange} />
                      </div>
                      <MediaUploaderInput
                        label="OpenGraph Social Sharing Image"
                        value={formData.ogImage || ""}
                        onChange={(url) => setFormData((prev: any) => ({ ...prev, ogImage: url }))}
                        folder="settings/seo"
                        placeholder="Upload or enter OpenGraph Image URL"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Robots.txt Content</label>
                      <textarea
                        name="robotsTxt"
                        rows={4}
                        value={formData.robotsTxt || ""}
                        onChange={handleChange}
                        className="w-full font-mono text-xs rounded-md border border-input bg-background px-3 py-2 shadow-sm"
                        placeholder="User-agent: *&#10;Disallow: /admin/"
                      />
                    </div>
                  </div>
                )}

                {/* SMTP TAB */}
                {activeTab === "SMTP" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">SMTP Host</label>
                        <Input name="host" value={formData.host || ""} onChange={handleChange} placeholder="smtp.gmail.com" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Port</label>
                        <Input name="port" type="number" value={formData.port || ""} onChange={handleChange} placeholder="587" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Username</label>
                        <Input name="username" value={formData.username || ""} onChange={handleChange} placeholder="smtp-user@example.com" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Password</label>
                        <Input name="password" type="password" value={formData.password || ""} onChange={handleChange} placeholder="••••••••" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">From Email</label>
                        <Input name="fromEmail" value={formData.fromEmail || ""} onChange={handleChange} placeholder="noreply@example.com" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">From Name</label>
                        <Input name="fromName" value={formData.fromName || ""} onChange={handleChange} placeholder="Store Notifications" />
                      </div>
                      <div className="sm:col-span-2">
                        <MediaUploaderInput
                          label="Transactional Email Header Logo"
                          value={formData.emailHeaderLogo || ""}
                          onChange={(url) => setFormData((prev: any) => ({ ...prev, emailHeaderLogo: url }))}
                          folder="settings/email"
                          placeholder="Upload or enter Email Header Logo URL"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                          <input
                            type="checkbox"
                          name="secure"
                          checked={formData.secure ?? true}
                          onChange={handleChange}
                          className="rounded border-input text-primary focus:ring-primary"
                        />
                        Use SSL/TLS Security
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                        <input
                          type="checkbox"
                          name="enabled"
                          checked={formData.enabled ?? false}
                          onChange={handleChange}
                          className="rounded border-input text-primary focus:ring-primary"
                        />
                          Enable SMTP Email Delivery
                        </label>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          try {
                            // First save current settings
                            await api.put("/api/v1/settings/smtp", {
                              ...formData,
                              port: formData.port ? parseInt(formData.port, 10) : undefined
                            });
                            const res = await api.post("/api/v1/settings/smtp/test");
                            notify.success(res.data.message || "Test email sent successfully");
                          } catch (error: any) {
                            notify.error(error.response?.data?.message || "Failed to test SMTP connection");
                          }
                        }}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Test Connection
                      </Button>
                    </div>
                  </div>
                )}

                {/* ANALYTICS TAB */}
                {activeTab === "Analytics" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Google Analytics 4 ID (Measurement ID)</label>
                        <Input name="googleAnalyticsId" value={formData.googleAnalyticsId || ""} onChange={handleChange} placeholder="G-XXXXXXXXXX" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Google Tag Manager ID</label>
                        <Input name="googleTagManagerId" value={formData.googleTagManagerId || ""} onChange={handleChange} placeholder="GTM-XXXXXXX" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Meta / Facebook Pixel ID</label>
                        <Input name="facebookPixelId" value={formData.facebookPixelId || ""} onChange={handleChange} placeholder="1234567890" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">TikTok Pixel ID</label>
                        <Input name="tiktokPixelId" value={formData.tiktokPixelId || ""} onChange={handleChange} placeholder="CXXXXXXXXXXXXXXXXX" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Google Ads ID</label>
                        <Input name="googleAdsId" value={formData.googleAdsId || ""} onChange={handleChange} placeholder="AW-XXXXXXXXX" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Google Ads Conversion ID</label>
                        <Input name="googleAdsConversionId" value={formData.googleAdsConversionId || ""} onChange={handleChange} placeholder="AW-XXXXXXXXX" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Google Ads Conversion Label</label>
                        <Input name="googleAdsConversionLabel" value={formData.googleAdsConversionLabel || ""} onChange={handleChange} placeholder="XXXXXXXXXXXXXXXXXXX" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">GA4 API Secret (Measurement Protocol)</label>
                        <Input name="ga4ApiSecret" value={formData.ga4ApiSecret || ""} onChange={handleChange} placeholder="Secret key for server-side events" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Hotjar ID</label>
                        <Input name="hotjarId" value={formData.hotjarId || ""} onChange={handleChange} placeholder="1234567" />
                      </div>
                    </div>
                    <div className="pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                        <input
                          type="checkbox"
                          name="enableAnalytics"
                          checked={formData.enableAnalytics ?? false}
                          onChange={handleChange}
                          className="rounded border-input text-primary focus:ring-primary"
                        />
                        Enable Analytics Tracking Scripts
                      </label>
                    </div>
                  </div>
                )}

                {/* SECURITY TAB */}
                {activeTab === "Security" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Minimum Password Length</label>
                        <Input name="passwordMinLength" type="number" value={formData.passwordMinLength || 8} onChange={handleChange} />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Session Timeout (Minutes)</label>
                        <Input name="sessionTimeoutMinutes" type="number" value={formData.sessionTimeoutMinutes || 60} onChange={handleChange} />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Max Failed Login Attempts</label>
                        <Input name="maxLoginAttempts" type="number" value={formData.maxLoginAttempts || 5} onChange={handleChange} />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                        <input
                          type="checkbox"
                          name="enable2FA"
                          checked={formData.enable2FA ?? false}
                          onChange={handleChange}
                          className="rounded border-input text-primary focus:ring-primary"
                        />
                        Require Two-Factor Authentication (2FA) for Admins
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                        <input
                          type="checkbox"
                          name="enableMaintenanceMode"
                          checked={formData.enableMaintenanceMode ?? false}
                          onChange={handleChange}
                          className="rounded border-input text-primary focus:ring-primary"
                        />
                        Enable Storefront Maintenance Mode
                      </label>
                    </div>

                    {formData.enableMaintenanceMode && (
                      <div>
                        <label className="text-sm font-medium mb-1 block">Maintenance Notice Message</label>
                        <textarea
                          name="maintenanceMessage"
                          rows={3}
                          value={formData.maintenanceMessage || ""}
                          onChange={handleChange}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                          placeholder="Our storefront is currently undergoing scheduled maintenance. Please check back shortly."
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* SHIPPING TAB */}
                {activeTab === "Shipping" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Inside Dhaka Shipping Charge (BDT)</label>
                        <Input
                          name="insideDhakaCharge"
                          type="number"
                          step="1"
                          min="0"
                          value={formData.insideDhakaCharge ?? 60}
                          onChange={handleChange}
                          placeholder="60"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Standard delivery charge for orders inside Dhaka city.</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Outside Dhaka Shipping Charge (BDT)</label>
                        <Input
                          name="outsideDhakaCharge"
                          type="number"
                          step="1"
                          min="0"
                          value={formData.outsideDhakaCharge ?? 120}
                          onChange={handleChange}
                          placeholder="120"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Standard delivery charge for orders outside Dhaka.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Free Shipping Minimum Threshold (BDT)</label>
                        <Input
                          name="freeShippingThreshold"
                          type="number"
                          step="1"
                          min="0"
                          value={formData.freeShippingThreshold ?? 2000}
                          onChange={handleChange}
                          placeholder="2000"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Cart subtotal amount required to waive shipping charges.</p>
                      </div>
                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-900">
                          <input
                            type="checkbox"
                            name="freeShippingEnabled"
                            checked={formData.freeShippingEnabled ?? formData.enableFreeShipping ?? true}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData((prev: any) => ({
                                ...prev,
                                freeShippingEnabled: checked,
                                enableFreeShipping: checked,
                              }));
                            }}
                            className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                          />
                          <div>
                            <span className="block font-medium">Enable Free Shipping Rule</span>
                            <span className="text-xs text-muted-foreground font-normal">Apply free shipping automatically when subtotal reaches the threshold</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Courier Providers Management Section */}
                    <CourierProvidersSection />
                  </div>
                )}

                {/* TAX TAB */}
                {activeTab === "Tax" && (
                  <div className="space-y-4">
                    <div className="p-3 border rounded-md bg-muted/30">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                        <input
                          type="checkbox"
                          name="taxEnabled"
                          checked={formData.taxEnabled ?? formData.enableTax ?? true}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormData((prev: any) => ({
                              ...prev,
                              taxEnabled: checked,
                              enableTax: checked,
                            }));
                          }}
                          className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                        />
                        <div>
                          <span className="block font-medium">Enable Sales Tax Calculation</span>
                          <span className="text-xs text-muted-foreground font-normal">Automatically calculate and apply tax during checkout based on the configured rate</span>
                        </div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Default Tax Rate (%)</label>
                        <Input name="defaultTaxRate" type="number" step="0.01" value={formData.defaultTaxRate ?? 0} onChange={handleChange} placeholder="5.00" />
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                        <input
                          type="checkbox"
                          name="pricesIncludeTax"
                          checked={formData.pricesIncludeTax ?? false}
                          onChange={handleChange}
                          className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                        />
                        Catalog Prices Already Include Sales Tax
                      </label>
                    </div>
                  </div>
                )}

                
                {/* STORE CONTACT TAB */}
                {activeTab === "Store" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Support Email Address</label>
                        <Input name="supportEmail" type="email" value={formData.supportEmail || ""} onChange={handleChange} placeholder="support@mystore.com" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Support Phone Number</label>
                        <Input name="supportPhone" type="text" value={formData.supportPhone || ""} onChange={handleChange} placeholder="+8801812345678" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">WhatsApp Order Number</label>
                        <Input name="whatsappOrderNumber" type="text" value={formData.whatsappOrderNumber || ""} onChange={handleChange} placeholder="+8801712345678" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Call For Order Number</label>
                        <Input name="callOrderNumber" type="text" value={formData.callOrderNumber || ""} onChange={handleChange} placeholder="+8801812345678" />
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Merchant Address & Location</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                        <div className="sm:col-span-3">
                          <label className="text-sm font-medium mb-1 block">Street Address</label>
                          <Input name="address" type="text" value={formData.address || ""} onChange={handleChange} placeholder="House 12, Road 5, Block B, Banani" />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">City</label>
                          <Input name="city" type="text" value={formData.city || ""} onChange={handleChange} placeholder="Dhaka" />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Country</label>
                          <Input name="country" type="text" value={formData.country || ""} onChange={handleChange} placeholder="Bangladesh" />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Google Maps Location URL</label>
                          <Input name="location" type="url" value={formData.location || ""} onChange={handleChange} placeholder="https://maps.google.com/..." />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Social Media Profiles</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Facebook Page URL</label>
                          <Input name="facebookUrl" type="url" value={formData.facebookUrl || ""} onChange={handleChange} placeholder="https://facebook.com/mystore" />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Instagram Profile URL</label>
                          <Input name="instagramUrl" type="url" value={formData.instagramUrl || ""} onChange={handleChange} placeholder="https://instagram.com/mystore" />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">YouTube Channel URL</label>
                          <Input name="youtubeUrl" type="url" value={formData.youtubeUrl || ""} onChange={handleChange} placeholder="https://youtube.com/@mystore" />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">TikTok Profile URL</label>
                          <Input name="tiktokUrl" type="url" value={formData.tiktokUrl || ""} onChange={handleChange} placeholder="https://tiktok.com/@mystore" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-sm font-medium mb-1 block">LinkedIn Page URL</label>
                          <Input name="linkedinUrl" type="url" value={formData.linkedinUrl || ""} onChange={handleChange} placeholder="https://linkedin.com/company/mystore" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {validationError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* Form Action Button */}
                <PermissionGuard module="Settings" action="write">
                  <div className="pt-4 border-t flex justify-end">
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving Changes...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" /> Save {activeTab} Settings
                        </>
                      )}
                    </Button>
                  </div>
                </PermissionGuard>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
