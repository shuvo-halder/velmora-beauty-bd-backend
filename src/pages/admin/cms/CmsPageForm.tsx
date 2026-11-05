import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent } from '../../../components/ui/card';
import { Globe, FileText, ArrowLeft, Eye } from 'lucide-react';
import { RichTextEditor } from '@/src/components/ui/RichTextEditor';
import DOMPurify from 'dompurify';

interface CmsPageFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export function CmsPageForm({ initialData, onSubmit, isLoading }: CmsPageFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    content: initialData?.content || '',
    status: initialData?.status || 'DRAFT',
    pageType: initialData?.pageType || 'CUSTOM',
    metaTitle: initialData?.metaTitle || '',
    metaDescription: initialData?.metaDescription || '',
    publishedAt: initialData?.publishedAt || '',
    scheduledFor: initialData?.scheduledFor || '',
  });

  const [previewMode, setPreviewMode] = useState(false);
  const [slugError, setSlugError] = useState('');

  // Auto-generate slug from title
  useEffect(() => {
    if (!initialData && formData.title) {
      const generatedSlug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // remove invalid chars
        .replace(/\s+/g, '-')       // replace spaces with hyphens
        .replace(/-+/g, '-');       // collapse multiple hyphens
      setFormData(prev => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.title, initialData]);

  // Validate slug format
  useEffect(() => {
    if (formData.slug) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(formData.slug)) {
        setSlugError('Invalid slug format. Use lowercase alphanumeric and hyphens (e.g. about-us)');
      } else {
        setSlugError('');
      }
    } else {
      setSlugError('');
    }
  }, [formData.slug]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (slugError) return;

    // Build standard payload for backend
    const payload: any = {
      title: formData.title,
      slug: formData.slug,
      content: formData.content,
      status: formData.status,
      pageType: formData.pageType,
    };

    if (formData.status === 'PUBLISHED') {
      payload.publishedAt = formData.publishedAt ? new Date(formData.publishedAt).toISOString() : new Date().toISOString();
      payload.scheduledFor = null;
    } else if (formData.status === 'SCHEDULED') {
      payload.scheduledFor = formData.scheduledFor ? new Date(formData.scheduledFor).toISOString() : new Date(Date.now() + 86400000).toISOString();
      payload.publishedAt = null;
    } else {
      payload.publishedAt = null;
      payload.scheduledFor = null;
    }

    // Pass meta fields as well (mock/local fallback supported)
    payload.metaTitle = formData.metaTitle;
    payload.metaDescription = formData.metaDescription;

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content Fields */}
        <div className="lg:col-span-2 space-y-6">
          <Card id="main-content-card">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Page Title</label>
                <Input
                  id="page-title-input"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. About Our Store"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-foreground">URL Slug</label>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3" /> /pages/{formData.slug || 'slug'}
                  </span>
                </div>
                <Input
                  id="page-slug-input"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="e.g. about-our-store"
                  required
                />
                {slugError && (
                  <p className="text-xs font-medium text-destructive mt-1">{slugError}</p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Content
                  </label>
                  <Button
                    id="preview-toggle"
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => setPreviewMode(!previewMode)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {previewMode ? 'Edit Content' : 'Preview Output'}
                  </Button>
                </div>

                {previewMode ? (
                  <div className="min-h-[350px] p-4 rounded-md border border-input bg-muted/30 overflow-y-auto prose dark:prose-invert max-w-none">
                    {formData.content ? (
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formData.content) }} />
                    ) : (
                      <span className="text-muted-foreground italic">No content written yet.</span>
                    )}
                  </div>
                ) : (
                  <RichTextEditor
                    value={formData.content}
                    onChange={(val) => setFormData((prev) => ({ ...prev, content: val }))}
                    placeholder="Write page content in HTML or plain text..."
                    minHeight="350px"
                    folder="cms"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* SEO Metadata Card */}
          <Card id="seo-meta-card">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">SEO & Metadata</h3>
                <p className="text-xs text-muted-foreground">Configure custom SEO title and descriptions for search indexing.</p>
              </div>

              <div className="space-y-4 pt-2 border-t">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Meta Title</label>
                  <Input
                    id="meta-title-input"
                    name="metaTitle"
                    value={formData.metaTitle}
                    onChange={handleChange}
                    placeholder="e.g. About Our Shop - BrandName"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Meta Description</label>
                  <textarea
                    id="meta-description-input"
                    name="metaDescription"
                    value={formData.metaDescription}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Brief description summarizing the page content for search result cards..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
          <Card id="publish-controls-card">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">Publishing Settings</h3>
                <p className="text-xs text-muted-foreground">Manage status, visibility, and page classifications.</p>
              </div>

              <div className="space-y-4 pt-2 border-t">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Page Classification</label>
                  <select
                    id="page-type-select"
                    name="pageType"
                    value={formData.pageType}
                    onChange={handleChange}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="CUSTOM">Custom Page</option>
                    <option value="HOME">Homepage</option>
                    <option value="ABOUT">About Us Page</option>
                    <option value="CONTACT">Contact Page</option>
                    <option value="POLICY">Legal / Policy Page</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Status</label>
                  <select
                    id="page-status-select"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="SCHEDULED">Scheduled</option>
                  </select>
                </div>

                {formData.status === 'PUBLISHED' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Publish Date / Time</label>
                    <input
                      id="published-at-input"
                      type="datetime-local"
                      name="publishedAt"
                      value={formData.publishedAt ? formData.publishedAt.slice(0, 16) : ''}
                      onChange={handleChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                )}

                {formData.status === 'SCHEDULED' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Schedule Date / Time</label>
                    <input
                      id="scheduled-for-input"
                      type="datetime-local"
                      name="scheduledFor"
                      value={formData.scheduledFor ? formData.scheduledFor.slice(0, 16) : ''}
                      onChange={handleChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t">
                <Button
                  id="submit-page-button"
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !!slugError}
                >
                  {isLoading ? 'Saving Page...' : initialData ? 'Update Page' : 'Create Page'}
                </Button>
                <Button
                  id="cancel-form-button"
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => window.history.back()}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
