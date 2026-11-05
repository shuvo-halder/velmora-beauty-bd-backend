import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Loader2, Save, CheckCircle2, AlertCircle, FileText, Globe, Image as ImageIcon } from 'lucide-react';
import { seoService } from '../../../services/seo.service';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';

export function SeoManagement() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  const canRead = hasPermission('SEO', 'read');
  const canWrite = hasPermission('SEO', 'write');

  // Input states
  const [siteTitle, setSiteTitle] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [defaultOgImage, setDefaultOgImage] = useState('');
  const [robotsConfig, setRobotsConfig] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Load Data
  const { data: seoData, isLoading, error } = useQuery({
    queryKey: ['global-seo'],
    queryFn: seoService.getGlobalSeo,
    enabled: canRead,
  });

  // Sync state with loaded data
  useEffect(() => {
    if (seoData) {
      setSiteTitle(seoData.siteTitle || '');
      setSiteDescription(seoData.siteDescription || '');
      setMetaKeywords(seoData.metaKeywords || '');
      setDefaultOgImage(seoData.defaultOgImage || '');
      setRobotsConfig(seoData.robotsConfig || '');
    }
  }, [seoData]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: seoService.updateGlobalSeo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-seo'] });
      setFormSuccess('Global SEO settings have been successfully updated!');
      setFormError(null);
      setTimeout(() => setFormSuccess(null), 4000);
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to save SEO configuration.');
      setFormSuccess(null);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!siteTitle.trim()) {
      setFormError('Site Title is required.');
      return;
    }
    if (!siteDescription.trim()) {
      setFormError('Site Description is required.');
      return;
    }

    if (defaultOgImage && !defaultOgImage.startsWith('http://') && !defaultOgImage.startsWith('https://')) {
      setFormError('Default OpenGraph Image must be a valid URL starting with http:// or https://');
      return;
    }

    saveMutation.mutate({
      siteTitle: siteTitle.trim(),
      siteDescription: siteDescription.trim(),
      metaKeywords: metaKeywords.trim() || null,
      defaultOgImage: defaultOgImage.trim() || null,
      robotsConfig: robotsConfig.trim() || null,
    });
  };

  if (!canRead) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto stroke-[1.5]" />
        <h3 className="text-xl font-bold">Access Denied</h3>
        <p className="text-sm text-muted-foreground">
          You do not have the required permissions (`SEO:read`) to view SEO configurations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Search className="h-8 w-8 text-primary" /> Global SEO & Robots.txt
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure global meta tags, OpenGraph social properties, and crawlers rules.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Retrieving current global SEO profile...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center max-w-md mx-auto space-y-4 border rounded-xl bg-destructive/5 border-destructive/20">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="text-lg font-bold">Failed to Load Profile</h3>
          <p className="text-sm text-muted-foreground">
            Could not communicate with the database configuration inventory. Please reload.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && (
            <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm font-medium flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Site Identity Meta */}
              <Card id="seo-identity-card" className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                    <Globe className="h-4 w-4 text-primary" /> Basic Metadata Configuration
                  </CardTitle>
                  <CardDescription>
                    These tags define how search engine crawlers interpret and display your store in query results.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Global Site Title</label>
                    <Input
                      id="seo-input-title"
                      value={siteTitle}
                      onChange={(e) => setSiteTitle(e.target.value)}
                      placeholder="e.g. My Premium E-Commerce Store"
                      required
                      disabled={!canWrite}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Global Meta Description</label>
                    <textarea
                      id="seo-input-desc"
                      value={siteDescription}
                      onChange={(e) => setSiteDescription(e.target.value)}
                      rows={3}
                      placeholder="e.g. Shop the latest high-performance modular equipment and accessories with instant delivery."
                      required
                      disabled={!canWrite}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meta Keywords (Comma Separated)</label>
                    <Input
                      id="seo-input-keywords"
                      value={metaKeywords}
                      onChange={(e) => setMetaKeywords(e.target.value)}
                      placeholder="e.g. ecommerce, modular, gear, custom accessories"
                      disabled={!canWrite}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Robots.txt rules */}
              <Card id="seo-crawler-card" className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                    <FileText className="h-4 w-4 text-primary" /> Robots.txt Crawler Configuration
                  </CardTitle>
                  <CardDescription>
                    Establish permissions and exclusion boundaries for search crawlers like Googlebot or Bingbot.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Robots.txt Content Rules</label>
                    <textarea
                      id="seo-input-robots"
                      value={robotsConfig}
                      onChange={(e) => setRobotsConfig(e.target.value)}
                      rows={6}
                      placeholder={`User-agent: *\nDisallow: /admin/\nDisallow: /checkout/\n\nSitemap: https://mystore.com/sitemap.xml`}
                      disabled={!canWrite}
                      className="font-mono flex w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Visual Preview Options */}
            <div className="space-y-6">
              {/* OG Image Config */}
              <Card id="seo-og-card" className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                    <ImageIcon className="h-4 w-4 text-primary" /> OpenGraph Social Image
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Default Share Image URL</label>
                    <Input
                      id="seo-input-og"
                      value={defaultOgImage}
                      onChange={(e) => setDefaultOgImage(e.target.value)}
                      placeholder="https://mystore.com/og-banner.jpg"
                      disabled={!canWrite}
                    />
                  </div>

                  {defaultOgImage && defaultOgImage.startsWith('http') && (
                    <div className="relative border rounded-lg overflow-hidden bg-muted aspect-[1.91/1] flex items-center justify-center">
                      <img
                        src={defaultOgImage}
                        alt="Default OpenGraph Banner"
                        referrerPolicy="no-referrer"
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Form Action */}
              {canWrite && (
                <Button
                  id="seo-save-btn"
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="w-full gap-2 font-semibold h-10"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
