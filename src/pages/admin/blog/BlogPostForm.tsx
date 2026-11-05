import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent } from '../../../components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { mediaService } from '../../../services/media.service';
import { useAuth } from '../../../context/AuthContext';
import { Globe, FileText, ArrowLeft, Eye, Image as ImageIcon, Loader2, Calendar, Folder } from 'lucide-react';
import { RichTextEditor } from '../../../components/ui/RichTextEditor';
import DOMPurify from 'dompurify';

interface BlogPostFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export function BlogPostForm({ initialData, onSubmit, isLoading }: BlogPostFormProps) {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    excerpt: initialData?.excerpt || '',
    content: initialData?.content || '',
    status: initialData?.status || 'DRAFT',
    featuredImageId: initialData?.featuredImageId || '',
    categoryId: initialData?.categoryId || '',
    publishedAt: initialData?.publishedAt || '',
    scheduledFor: initialData?.scheduledFor || '',
  });

  const [previewMode, setPreviewMode] = useState(false);
  const [slugError, setSlugError] = useState('');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // Fetch available media assets for the Featured Image selector
  const { data: mediaAssets = [], isLoading: isLoadingMedia } = useQuery({
    queryKey: ['media-assets'],
    queryFn: () => mediaService.getAssets(),
  });

  // Auto-generate slug from title (only when creating, not editing)
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
        setSlugError('Invalid slug format. Use lowercase alphanumeric and hyphens (e.g. blog-post-title)');
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

  const handleSelectFeaturedImage = (imageId: string) => {
    setFormData((prev) => ({ ...prev, featuredImageId: imageId }));
    setIsMediaModalOpen(false);
  };

  const handleRemoveFeaturedImage = () => {
    setFormData((prev) => ({ ...prev, featuredImageId: '' }));
  };

  const selectedImage = mediaAssets.find((asset: any) => asset.id === formData.featuredImageId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (slugError) return;

    // Build standard payload for backend
    const payload: any = {
      title: formData.title,
      slug: formData.slug,
      excerpt: formData.excerpt || null,
      content: formData.content,
      status: formData.status,
      featuredImageId: formData.featuredImageId || null,
      categoryId: formData.categoryId || null,
      authorId: initialData?.authorId || user?.id || null,
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

    onSubmit(payload);
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Fields */}
          <div className="lg:col-span-2 space-y-6">
            <Card id="blog-content-card">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Post Title</label>
                  <Input
                    id="blog-title-input"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. 5 Simple Ways to Optimize Your Workspace"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-foreground">URL Slug</label>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3 w-3" /> /blog/{formData.slug || 'slug'}
                    </span>
                  </div>
                  <Input
                    id="blog-slug-input"
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    placeholder="e.g. 5-ways-to-optimize-workspace"
                    required
                  />
                  {slugError && (
                    <p className="text-xs font-medium text-destructive mt-1">{slugError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <RichTextEditor
                    label="Excerpt (Short Summary)"
                    value={formData.excerpt}
                    onChange={(val) => setFormData((prev) => ({ ...prev, excerpt: val }))}
                    placeholder="Provide a captivating 1-2 sentence summary for lists and SEO cards..."
                    minHeight="120px"
                    folder="blog"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Post Content
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
                      {previewMode ? 'Edit Editor' : 'Preview Live'}
                    </Button>
                  </div>

                  {previewMode ? (
                    <div className="min-h-[350px] p-4 rounded-md border border-input bg-muted/30 overflow-y-auto prose dark:prose-invert max-w-none text-foreground">
                      {formData.content ? (
                        <div
                          className="prose dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formData.content) }}
                        />
                      ) : (
                        <span className="text-muted-foreground italic">No content written yet.</span>
                      )}
                    </div>
                  ) : (
                    <RichTextEditor
                      value={formData.content}
                      onChange={(val) => setFormData((prev) => ({ ...prev, content: val }))}
                      placeholder="Write your article content here in rich text with headings, lists, images, code blocks..."
                      minHeight="350px"
                      folder="blog"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar controls */}
          <div className="space-y-6">
            
            {/* Featured Image Selector */}
            <Card id="featured-image-card">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" /> Featured Image
                  </h3>
                  {formData.featuredImageId && (
                    <Button
                      id="remove-image-btn"
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleRemoveFeaturedImage}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="border border-dashed rounded-lg p-4 bg-muted/20 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
                  {selectedImage ? (
                    <div className="absolute inset-0 flex flex-col justify-between p-2 bg-black/60 text-white z-10 opacity-0 hover:opacity-100 transition-opacity">
                      <div className="text-xs truncate font-medium bg-black/50 p-1 rounded">
                        {selectedImage.originalName}
                      </div>
                      <Button
                        id="change-image-btn-overlay"
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsMediaModalOpen(true)}
                        className="mx-auto"
                      >
                        Change Image
                      </Button>
                    </div>
                  ) : null}

                  {selectedImage ? (
                    <img
                      src={selectedImage.url}
                      alt={selectedImage.altText || 'Featured'}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center space-y-2">
                      <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                      <p className="text-xs text-muted-foreground">No image selected</p>
                      <Button
                        id="select-image-btn"
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsMediaModalOpen(true)}
                        className="h-8 text-xs"
                      >
                        Browse Media Library
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Classification & Category */}
            <Card id="category-and-settings-card">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Folder className="h-4 w-4 text-muted-foreground" /> Category & Meta
                </h3>
                
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Category (Optional)</label>
                  <select
                    id="blog-category-select"
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">No Category</option>
                    {initialData?.category && (
                      <option value={initialData.category.id}>{initialData.category.name}</option>
                    )}
                  </select>
                  <p className="text-[10px] text-muted-foreground italic">
                    Categories can be configured in the future once database collections are initialized.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Publishing Settings */}
            <Card id="publish-settings-card">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">Publishing Settings</h3>
                  <p className="text-xs text-muted-foreground">Configure the lifecycle state and timelines.</p>
                </div>

                <div className="space-y-4 pt-2 border-t">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Status</label>
                    <select
                      id="blog-status-select"
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
                      <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-muted-foreground" /> Publish Date / Time
                      </label>
                      <input
                        id="published-at-input"
                        type="datetime-local"
                        name="publishedAt"
                        value={formData.publishedAt ? formData.publishedAt.slice(0, 16) : ''}
                        onChange={handleChange}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </div>
                  )}

                  {formData.status === 'SCHEDULED' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-muted-foreground" /> Schedule Date / Time
                      </label>
                      <input
                        id="scheduled-for-input"
                        type="datetime-local"
                        name="scheduledFor"
                        value={formData.scheduledFor ? formData.scheduledFor.slice(0, 16) : ''}
                        onChange={handleChange}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t">
                  <Button
                    id="submit-blog-button"
                    type="submit"
                    className="w-full"
                    disabled={isLoading || !!slugError}
                  >
                    {isLoading ? 'Saving Post...' : initialData ? 'Update Post' : 'Create Post'}
                  </Button>
                  <Button
                    id="cancel-blog-button"
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

      {/* Media library dialog overlay */}
      {isMediaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-background border rounded-lg shadow-lg max-w-2xl w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" /> Choose Featured Image
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setIsMediaModalOpen(false)}>✕</Button>
              </div>

              {isLoadingMedia ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Retrieving library files...</p>
                </div>
              ) : mediaAssets.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
                  <p className="text-sm font-semibold">No Media Assets Found</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Please upload some images to the Media Library from the main menu first.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[350px] overflow-y-auto p-1">
                  {mediaAssets.map((asset: any) => (
                    <div
                      key={asset.id}
                      onClick={() => handleSelectFeaturedImage(asset.id)}
                      className={`cursor-pointer group relative border rounded-lg overflow-hidden h-28 hover:ring-2 hover:ring-primary/50 transition-all ${
                        formData.featuredImageId === asset.id ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <img
                        src={asset.url}
                        alt={asset.altText || asset.originalName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/75 text-white p-1 text-[10px] truncate group-hover:block hidden">
                        {asset.originalName}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t">
                <Button id="close-modal-btn" variant="outline" onClick={() => setIsMediaModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
