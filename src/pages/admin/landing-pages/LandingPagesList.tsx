import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { landingPageService } from '../../../services/landing-page.service';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  LayoutTemplate,
  Plus,
  Search,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  Smartphone,
  Monitor,
  Copy,
  ExternalLink,
  Sparkles,
  Type,
  Image as ImageIcon,
  MousePointer,
  HelpCircle,
  Layers,
  Settings,
  Grid,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { notify } from '../../../lib/notify';

// Block type structures
type BlockType = 'hero' | 'text' | 'image' | 'cta' | 'features' | 'faq';

interface HeroBlock {
  id: string;
  type: 'hero';
  title: string;
  subtitle: string;
  bgType: 'light' | 'dark' | 'gradient';
  ctaText: string;
  ctaUrl: string;
  imageUrl?: string;
}

interface TextBlock {
  id: string;
  type: 'text';
  heading?: string;
  body: string;
  align: 'left' | 'center' | 'right';
}

interface ImageBlock {
  id: string;
  type: 'image';
  url: string;
  alt: string;
  caption?: string;
  aspectRatio: '16:9' | '4:3' | 'square' | 'auto';
}

interface CtaBlock {
  id: string;
  type: 'cta';
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  theme: 'primary' | 'secondary' | 'dark';
}

interface FeatureItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

interface FeaturesBlock {
  id: string;
  type: 'features';
  title: string;
  description?: string;
  items: FeatureItem[];
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqBlock {
  id: string;
  type: 'faq';
  title: string;
  description?: string;
  items: FaqItem[];
}

type ContentBlock = HeroBlock | TextBlock | ImageBlock | CtaBlock | FeaturesBlock | FaqBlock;

// Default starter templates for new pages
const DEFAULT_BLOCKS: ContentBlock[] = [
  {
    id: 'b1',
    type: 'hero',
    title: 'Transform Your Business Operations',
    subtitle: 'Streamline workflows, engage customers, and scale securely with our high-performance suite.',
    bgType: 'gradient',
    ctaText: 'Get Started Today',
    ctaUrl: '#cta',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60'
  },
  {
    id: 'b2',
    type: 'features',
    title: 'Why Industry Leaders Choose Us',
    description: 'Engineered for scalability, speed, and absolute reliability.',
    items: [
      { id: 'f1', title: 'Lightning Fast Page Speeds', description: 'Optimized static content delivery ensures near-instant loading times for global visitors.', iconName: 'Zap' },
      { id: 'f2', title: 'Ironclad Enterprise Security', description: 'Robust standard encryption protocols keep customer data locked down and private.', iconName: 'Shield' },
      { id: 'f3', title: 'Seamless Developer API', description: 'Integrate existing workflows with standard tooling and intuitive rest APIs.', iconName: 'Code' }
    ]
  },
  {
    id: 'b3',
    type: 'cta',
    title: 'Ready to Elevate Your Platform?',
    description: 'Join over 10,000+ businesses utilizing our digital infrastructure.',
    buttonText: 'Schedule a Demo',
    buttonLink: '#demo',
    theme: 'dark'
  },
  {
    id: 'b4',
    type: 'faq',
    title: 'Frequently Asked Questions',
    description: 'Have questions about onboarding, scaling, or billing?',
    items: [
      { id: 'q1', question: 'How simple is the onboarding integration process?', answer: 'Our custom setup takes less than ten minutes. We provide standard CLI kits and robust packages.' },
      { id: 'q2', question: 'Do you offer custom pricing brackets for growing startups?', answer: 'Absolutely. Contact our sales department to custom build a volume package that suits your budget constraint.' }
    ]
  }
];

export function LandingPagesList() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  // RBAC permission gates
  const canRead = hasPermission('LandingPages', 'read');
  const canWrite = hasPermission('LandingPages', 'write');
  const canDelete = hasPermission('LandingPages', 'delete');

  // React Query for pages
  const { data: pages = [], isLoading, error, refetch } = useQuery({
    queryKey: ['landing-pages'],
    queryFn: landingPageService.getPages,
    enabled: canRead
  });

  // Main UI State switching
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  // Search and general filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED' | 'SCHEDULED'>('ALL');

  // Builder Page Meta State
  const [pageName, setPageName] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageStatus, setPageStatus] = useState<'DRAFT' | 'PUBLISHED' | 'SCHEDULED'>('DRAFT');
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Active expanded block editor index
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

  // Interactive Live Preview options
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewFaqOpenId, setPreviewFaqOpenId] = useState<string | null>(null);

  // Read-only Quick View Modal
  const [viewingPage, setViewingPage] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pageToDelete, setPageToDelete] = useState<any | null>(null);
  const [isResetBlocksConfirmOpen, setIsResetBlocksConfirmOpen] = useState(false);

  // Page level mutations
  const createMutation = useMutation({
    mutationFn: landingPageService.createPage,
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      setIsWorkspaceOpen(false);
      resetWorkspaceForm();
      notify.success('Landing Page Created', `Landing page "${res?.name || pageName}" created successfully.`);
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to create landing page.');
      notify.apiError(err, 'Failed to create landing page.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => landingPageService.updatePage(id, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      setIsWorkspaceOpen(false);
      resetWorkspaceForm();
      notify.success('Landing Page Updated', `Landing page "${res?.name || pageName}" updated successfully.`);
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to save landing page.');
      notify.apiError(err, 'Failed to save landing page.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: landingPageService.deletePage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      notify.success('Landing Page Deleted', `Landing page "${pageToDelete?.name || ''}" deleted.`);
      setPageToDelete(null);
    },
    onError: (err: any) => {
      notify.apiError(err, 'Failed to delete landing page.');
      setPageToDelete(null);
    }
  });

  // Auto-generate slug helper
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPageName(val);
    if (!editingPageId) {
      // Auto-generate lowercase, hyphenated slug
      const slug = val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setPageSlug(slug);
    }
  };

  const resetWorkspaceForm = () => {
    setPageName('');
    setPageSlug('');
    setPageStatus('DRAFT');
    setBlocks([]);
    setEditingPageId(null);
    setFormError(null);
    setExpandedBlockId(null);
  };

  // Open creation mode
  const handleOpenCreateWorkspace = () => {
    resetWorkspaceForm();
    // Default blocks to guide the user initially
    setBlocks(JSON.parse(JSON.stringify(DEFAULT_BLOCKS)));
    setIsWorkspaceOpen(true);
  };

  // Open edit mode
  const handleOpenEditWorkspace = (page: any) => {
    setEditingPageId(page.id);
    setPageName(page.name);
    setPageSlug(page.slug);
    setPageStatus(page.status as any);
    setFormError(null);
    try {
      setBlocks(JSON.parse(page.content));
    } catch (e) {
      setBlocks([]);
    }
    setIsWorkspaceOpen(true);
  };

  // Block management actions
  const handleAddBlock = (type: BlockType) => {
    const id = `b-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    let newBlock: ContentBlock;

    switch (type) {
      case 'hero':
        newBlock = {
          id,
          type: 'hero',
          title: 'Unleash Digital Efficiency',
          subtitle: 'A stunning modern platform for next-generation businesses.',
          bgType: 'gradient',
          ctaText: 'Explore Features',
          ctaUrl: '#features'
        };
        break;
      case 'text':
        newBlock = {
          id,
          type: 'text',
          heading: 'Core Architecture & Standards',
          body: 'Our platform is engineered with standards-based modular structures. Build anything you need with robust rest endpoints.',
          align: 'left'
        };
        break;
      case 'image':
        newBlock = {
          id,
          type: 'image',
          url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=60',
          alt: 'Product Workspace Dashboard Mockup',
          aspectRatio: '16:9'
        };
        break;
      case 'cta':
        newBlock = {
          id,
          type: 'cta',
          title: 'Get Started in Under Five Minutes',
          description: 'Deploy your instance instantly and start configuring your blocks.',
          buttonText: 'Create Free Account',
          buttonLink: '#signup',
          theme: 'primary'
        };
        break;
      case 'features':
        newBlock = {
          id,
          type: 'features',
          title: 'Key Platform Capabilities',
          description: 'Designed from the ground up for elite speed and modular growth.',
          items: [
            { id: `f-${Date.now()}-1`, title: 'Intuitive Dashboard', description: 'Monitor operational state metrics in real-time from a single workspace view.', iconName: 'Grid' },
            { id: `f-${Date.now()}-2`, title: 'Automated Workflows', description: 'Trigger webhooks and synchronize records seamlessly with robust pipelines.', iconName: 'Sparkles' }
          ]
        };
        break;
      case 'faq':
        newBlock = {
          id,
          type: 'faq',
          title: 'Frequently Answered Questions',
          description: 'Got general or custom technical queries?',
          items: [
            { id: `q-${Date.now()}-1`, question: 'Is billing calculated dynamically on active volumes?', answer: 'Yes, our brackets scale down transparently to match real deployment usage.' }
          ]
        };
        break;
    }

    setBlocks(prev => [...prev, newBlock]);
    setExpandedBlockId(id);
  };

  const handleDeleteBlock = (blockId: string) => {
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    if (expandedBlockId === blockId) {
      setExpandedBlockId(null);
    }
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const newBlocks = [...blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;
    setBlocks(newBlocks);
  };

  // Block edit mutation helpers
  const handleUpdateBlockField = (blockId: string, field: string, value: any) => {
    setBlocks(prev =>
      prev.map(b => (b.id === blockId ? { ...b, [field]: value } : b))
    );
  };

  // Feature block nesting updates
  const handleUpdateFeatureItem = (blockId: string, itemId: string, field: string, value: string) => {
    setBlocks(prev =>
      prev.map(b => {
        if (b.id === blockId && b.type === 'features') {
          return {
            ...b,
            items: b.items.map(item => (item.id === itemId ? { ...item, [field]: value } : item))
          };
        }
        return b;
      })
    );
  };

  const handleAddFeatureItem = (blockId: string) => {
    setBlocks(prev =>
      prev.map(b => {
        if (b.id === blockId && b.type === 'features') {
          return {
            ...b,
            items: [
              ...b.items,
              {
                id: `f-${Date.now()}-${Math.random()}`,
                title: 'New Feature Attribute',
                description: 'Provide an actionable, rich description detailing value.',
                iconName: 'Sparkles'
              }
            ]
          };
        }
        return b;
      })
    );
  };

  const handleDeleteFeatureItem = (blockId: string, itemId: string) => {
    setBlocks(prev =>
      prev.map(b => {
        if (b.id === blockId && b.type === 'features') {
          return {
            ...b,
            items: b.items.filter(item => item.id !== itemId)
          };
        }
        return b;
      })
    );
  };

  // FAQ block nesting updates
  const handleUpdateFaqItem = (blockId: string, itemId: string, field: string, value: string) => {
    setBlocks(prev =>
      prev.map(b => {
        if (b.id === blockId && b.type === 'faq') {
          return {
            ...b,
            items: b.items.map(item => (item.id === itemId ? { ...item, [field]: value } : item))
          };
        }
        return b;
      })
    );
  };

  const handleAddFaqItem = (blockId: string) => {
    setBlocks(prev =>
      prev.map(b => {
        if (b.id === blockId && b.type === 'faq') {
          return {
            ...b,
            items: [
              ...b.items,
              {
                id: `q-${Date.now()}-${Math.random()}`,
                question: 'Add frequently asked question?',
                answer: 'Specify your clear, high-contrast descriptive answer context.'
              }
            ]
          };
        }
        return b;
      })
    );
  };

  const handleDeleteFaqItem = (blockId: string, itemId: string) => {
    setBlocks(prev =>
      prev.map(b => {
        if (b.id === blockId && b.type === 'faq') {
          return {
            ...b,
            items: b.items.filter(item => item.id !== itemId)
          };
        }
        return b;
      })
    );
  };

  // Form Submit Action
  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!pageName.trim()) {
      setFormError('Page name is required');
      return;
    }

    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!pageSlug.trim() || !slugRegex.test(pageSlug)) {
      setFormError('Invalid slug format. Must contain only lowercase letters, numbers, and hyphens (no spaces).');
      return;
    }

    if (blocks.length === 0) {
      setFormError('Please add at least one content block to build the landing page layout.');
      return;
    }

    const payload = {
      name: pageName.trim(),
      slug: pageSlug.trim(),
      status: pageStatus,
      content: JSON.stringify(blocks)
    };

    if (editingPageId) {
      updateMutation.mutate({ id: editingPageId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Helper formatting size bytes or block lengths
  const getBlockCount = (contentString: string) => {
    try {
      const parsed = JSON.parse(contentString);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch (e) {
      return 0;
    }
  };

  // Clipboard copy helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtering list items
  const filteredPages = pages.filter((page: any) => {
    const matchesSearch =
      page.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.slug.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || page.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Guard: Unauthorized
  if (!canRead) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto stroke-[1.5]" />
        <h3 className="text-xl font-bold">Access Denied</h3>
        <p className="text-sm text-muted-foreground">
          You do not have the required permissions (`LandingPages:read`) to view Landing Pages.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ============================================================== */}
      {/* 1. PAGES INDEX TABLE VIEW                                      */}
      {/* ============================================================== */}
      {!isWorkspaceOpen ? (
        <div className="space-y-6">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <LayoutTemplate className="h-8 w-8 text-primary" /> Landing Pages
              </h1>
              <p className="text-sm text-muted-foreground">
                Design and organize high-conversion, modular layout landing pages.
              </p>
            </div>

            {canWrite && (
              <Button id="new-page-btn" onClick={handleOpenCreateWorkspace} className="gap-2 text-sm">
                <Plus className="h-4 w-4" /> Create Landing Page
              </Button>
            )}
          </div>

          {/* Filtering Controls */}
          <Card id="lp-filters-card" className="border shadow-sm">
            <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Text Search */}
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="lp-search-input"
                  placeholder="Search page by name or slug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status Tabs */}
              <div className="flex flex-wrap gap-1 border p-1 rounded-lg bg-muted/20 w-full md:w-auto">
                {['ALL', 'DRAFT', 'PUBLISHED', 'SCHEDULED'].map((st) => (
                  <Button
                    key={st}
                    id={`filter-${st.toLowerCase()}`}
                    variant={statusFilter === st ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setStatusFilter(st as any)}
                    className="flex-1 md:flex-initial text-xs h-8 px-3"
                  >
                    {st === 'ALL' ? 'All Pages' : st}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Table list */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Retrieving landing pages...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center max-w-md mx-auto space-y-4 border rounded-xl bg-destructive/5 border-destructive/20">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
              <h3 className="text-lg font-bold">Failed to load Pages</h3>
              <p className="text-sm text-muted-foreground">
                Could not communicate with the database inventory. Please reload.
              </p>
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-xl space-y-3 bg-muted/10">
              <LayoutTemplate className="h-12 w-12 text-muted-foreground mx-auto opacity-40" />
              <div className="space-y-1">
                <p className="text-base font-semibold">No landing pages match your search</p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Try adjusting filters or create a beautiful new landing page workspace.
                </p>
              </div>
              {(searchQuery || statusFilter !== 'ALL') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/30 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="p-4">Page Information</th>
                      <th className="p-4">Target Slug</th>
                      <th className="p-4">Blocks Layout</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {filteredPages.map((page: any) => {
                      const blockCount = getBlockCount(page.content);
                      const statusColor =
                        page.status === 'PUBLISHED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : page.status === 'SCHEDULED'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20';

                      return (
                        <tr key={page.id} className="hover:bg-muted/10 transition">
                          <td className="p-4">
                            <div className="font-semibold text-foreground">{page.name}</div>
                          </td>
                          <td className="p-4 font-mono text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">/{page.slug}</span>
                              <Button
                                id={`copy-slug-${page.id}`}
                                variant="ghost"
                                size="icon"
                                onClick={() => copyToClipboard(page.slug, page.id)}
                                className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                              >
                                {copiedId === page.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-xs font-medium">
                              {blockCount} {blockCount === 1 ? 'block' : 'blocks'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge className={`text-xs px-2 py-0.5 font-semibold capitalize border ${statusColor}`} variant="outline">
                              {page.status?.toLowerCase()}
                            </Badge>
                          </td>
                          <td className="p-4 text-xs text-muted-foreground">
                            {new Date(page.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              {/* Preview Quick Modal */}
                              <Button
                                id={`quick-view-${page.id}`}
                                variant="ghost"
                                size="icon"
                                onClick={() => setViewingPage(page)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title="Quick Preview Content"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {/* Edit Page */}
                              {canWrite && (
                                <Button
                                  id={`edit-page-${page.id}`}
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEditWorkspace(page)}
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  title="Edit Workspace Builder"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Delete Page */}
                              {canDelete && (
                                <Button
                                  id={`delete-page-${page.id}`}
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setPageToDelete(page)}
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Delete Page"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ============================================================== */
        /* 2. PAGE BUILDER WORKSPACE                                      */
        /* ============================================================== */
        <div className="space-y-6">
          {/* Builder Top Bar Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                <span className="cursor-pointer hover:text-foreground transition" onClick={() => setIsWorkspaceOpen(false)}>Landing Pages</span>
                <span>/</span>
                <span className="text-foreground">{editingPageId ? 'Edit Page Builder' : 'Create New Page'}</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                {pageName ? pageName : 'Untitled Workspace'}
              </h2>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                id="cancel-builder-btn"
                variant="outline"
                size="sm"
                onClick={() => setIsWorkspaceOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>

              <Button
                id="save-builder-btn"
                onClick={handleSaveWorkspace}
                size="sm"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="gap-1.5 text-xs bg-primary hover:bg-primary/95 text-primary-foreground font-semibold"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                <CheckCircle2 className="h-4 w-4" />
                Save Landing Page
              </Button>
            </div>
          </div>

          {/* Builder Validation Banner */}
          {formError && (
            <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm font-medium flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Two Column Grid layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 2A. LEFT COLUMN: PROPERTIES & BLOCKS ACCORDION EDITOR (5/12) */}
            <div className="lg:col-span-5 space-y-6 max-h-[80vh] overflow-y-auto pr-1.5">
              {/* Properties Section */}
              <Card className="border shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                    <Settings className="h-4 w-4 text-primary" /> General Properties
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Name field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Landing Page Title</label>
                    <Input
                      id="builder-input-name"
                      value={pageName}
                      onChange={handleNameChange}
                      placeholder="e.g. Summer Promotional Campaign"
                      required
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Two-col status and slug */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL Slug Path</label>
                      <div className="flex rounded-md shadow-sm border focus-within:ring-1 focus-within:ring-ring bg-background overflow-hidden">
                        <span className="flex items-center px-2.5 text-xs text-muted-foreground bg-muted border-r font-mono">/</span>
                        <input
                          id="builder-input-slug"
                          value={pageSlug}
                          onChange={(e) => setPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          placeholder="promo-campaign"
                          className="flex-1 min-w-0 bg-transparent px-2.5 py-1.5 text-xs focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Publication Status</label>
                      <select
                        id="builder-input-status"
                        value={pageStatus}
                        onChange={(e: any) => setPageStatus(e.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Published</option>
                        <option value="SCHEDULED">Scheduled</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Added Blocks Layout Container */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" /> Page Content Blocks ({blocks.length})
                  </h3>
                  {blocks.length > 0 && (
                    <button
                      onClick={() => setIsResetBlocksConfirmOpen(true)}
                      className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 font-semibold border px-2 py-0.5 rounded hover:bg-muted"
                    >
                      <RotateCcw className="h-3 w-3" /> Reset Page
                    </button>
                  )}
                </div>

                {blocks.length === 0 ? (
                  <div className="text-center py-10 border border-dashed rounded-xl bg-muted/10 space-y-2">
                    <Grid className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Your layout is currently empty. Choose a template block below to start defining rich content!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {blocks.map((block, idx) => {
                      const isExpanded = expandedBlockId === block.id;

                      // Block icons & labels
                      let blockIcon = <LayoutTemplate className="h-4 w-4" />;
                      let blockTitle = 'Block';
                      switch (block.type) {
                        case 'hero':
                          blockIcon = <Sparkles className="h-4 w-4 text-amber-500" />;
                          blockTitle = `Hero Banner - "${block.title}"`;
                          break;
                        case 'text':
                          blockIcon = <Type className="h-4 w-4 text-sky-500" />;
                          blockTitle = `Text Block - "${block.heading || 'Paragraph'}"`;
                          break;
                        case 'image':
                          blockIcon = <ImageIcon className="h-4 w-4 text-emerald-500" />;
                          blockTitle = `Image Block - "${block.alt}"`;
                          break;
                        case 'cta':
                          blockIcon = <MousePointer className="h-4 w-4 text-indigo-500" />;
                          blockTitle = `CTA Banner - "${block.title}"`;
                          break;
                        case 'features':
                          blockIcon = <Grid className="h-4 w-4 text-purple-500" />;
                          blockTitle = `Features Block - "${block.title}"`;
                          break;
                        case 'faq':
                          blockIcon = <HelpCircle className="h-4 w-4 text-pink-500" />;
                          blockTitle = `FAQ Accordions - "${block.title}"`;
                          break;
                      }

                      return (
                        <div
                          key={block.id}
                          className={`border rounded-lg bg-card shadow-xs overflow-hidden transition-all duration-200 ${
                            isExpanded ? 'ring-1 ring-primary border-primary' : 'hover:border-primary/40'
                          }`}
                        >
                          {/* Accordion Trigger Row */}
                          <div
                            className="p-3.5 bg-muted/25 hover:bg-muted/45 flex items-center justify-between gap-3 cursor-pointer select-none"
                            onClick={() => setExpandedBlockId(isExpanded ? null : block.id)}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {blockIcon}
                              <span className="font-semibold text-xs text-foreground truncate max-w-[240px]">
                                {blockTitle}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {/* Reorder Up */}
                              <button
                                onClick={() => handleMoveBlock(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-20 disabled:hover:bg-transparent"
                                title="Move Block Up"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>

                              {/* Reorder Down */}
                              <button
                                onClick={() => handleMoveBlock(idx, 'down')}
                                disabled={idx === blocks.length - 1}
                                className="p-1 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-20 disabled:hover:bg-transparent"
                                title="Move Block Down"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>

                              {/* Trigger Edit toggle */}
                              <button
                                onClick={() => setExpandedBlockId(isExpanded ? null : block.id)}
                                className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </button>

                              {/* Delete Block */}
                              <button
                                id={`delete-block-${block.id}`}
                                onClick={() => handleDeleteBlock(block.id)}
                                className="p-1 rounded-md hover:bg-destructive/15 text-destructive"
                                title="Delete Block"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Accordion Panel Body */}
                          {isExpanded && (
                            <div className="p-4 border-t bg-background/50 space-y-4 text-xs">
                              {/* HERO BLOCK FORM */}
                              {block.type === 'hero' && (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Hero Title</label>
                                      <Input
                                        value={block.title}
                                        onChange={(e) => handleUpdateBlockField(block.id, 'title', e.target.value)}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Hero Subtitle</label>
                                      <Input
                                        value={block.subtitle}
                                        onChange={(e) => handleUpdateBlockField(block.id, 'subtitle', e.target.value)}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">CTA Button Label</label>
                                      <Input
                                        value={block.ctaText}
                                        onChange={(e) => handleUpdateBlockField(block.id, 'ctaText', e.target.value)}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">CTA Link URL</label>
                                      <Input
                                        value={block.ctaUrl}
                                        onChange={(e) => handleUpdateBlockField(block.id, 'ctaUrl', e.target.value)}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Promo Image URL (Optional)</label>
                                      <Input
                                        value={block.imageUrl || ''}
                                        onChange={(e) => handleUpdateBlockField(block.id, 'imageUrl', e.target.value)}
                                        placeholder="e.g. https://images.unsplash.com/..."
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Background Style</label>
                                      <select
                                        value={block.bgType}
                                        onChange={(e) => handleUpdateBlockField(block.id, 'bgType', e.target.value)}
                                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none"
                                      >
                                        <option value="light">Plain Light</option>
                                        <option value="dark">Plain Dark</option>
                                        <option value="gradient">Modern Gradient Blur</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* TEXT BLOCK FORM */}
                              {block.type === 'text' && (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Optional Heading</label>
                                      <Input
                                        value={block.heading || ''}
                                        onChange={(e) => handleUpdateBlockField(block.id, 'heading', e.target.value)}
                                        placeholder="Section header..."
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Text Alignment</label>
                                      <select
                                        value={block.align}
                                        onChange={(e) => handleUpdateBlockField(block.id, 'align', e.target.value)}
                                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                                      >
                                        <option value="left">Left Aligned</option>
                                        <option value="center">Centered</option>
                                        <option value="right">Right Aligned</option>
                                      </select>
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Body Content</label>
                                    <textarea
                                      value={block.body}
                                      onChange={(e) => handleUpdateBlockField(block.id, 'body', e.target.value)}
                                      rows={4}
                                      placeholder="Write clean paragraphs of informational copy..."
                                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* IMAGE BLOCK FORM */}
                              {block.type === 'image' && (
                                <div className="space-y-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Image Resource URL</label>
                                    <Input
                                      value={block.url}
                                      onChange={(e) => handleUpdateBlockField(block.id, 'url', e.target.value)}
                                      className="h-8 text-xs font-mono"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Image Alt Text (SEO)</label>
                                      <Input
                                        value={block.alt}
                                        onChange={(e) => handleUpdateBlockField(block.id, 'alt', e.target.value)}
                                        placeholder="Describe image..."
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Aspect Ratio Cover</label>
                                      <select
                                        value={block.aspectRatio}
                                        onChange={(e) => handleUpdateBlockField(block.id, 'aspectRatio', e.target.value)}
                                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                                      >
                                        <option value="16:9">Widescreen 16:9</option>
                                        <option value="4:3">Standard 4:3</option>
                                        <option value="square">Square 1:1</option>
                                        <option value="auto">Natural Image Height</option>
                                      </select>
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Optional Sub-caption</label>
                                    <Input
                                      value={block.caption || ''}
                                      onChange={(e) => handleUpdateBlockField(block.id, 'caption', e.target.value)}
                                      placeholder="e.g. Figure 1.2: System Architecture Schema"
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* CTA BLOCK FORM */}
                              {block.type === 'cta' && (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Action Title</label>
                                      <Input
                                        value={block.title}
                                        onChange={(e) => handleUpdateBlockField(block.id, 'title', e.target.value)}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Action Description</label>
                                      <Input
                                        value={block.description}
                                        onChange={(e) => handleUpdateBlockField(block.id, 'description', e.target.value)}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1 col-span-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Button label</label>
                                      <Input
                                        value={block.buttonText}
                                        onChange={(e) => handleUpdateBlockField(block.id, 'buttonText', e.target.value)}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <div className="space-y-1 col-span-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Link Href</label>
                                      <Input
                                        value={block.buttonLink}
                                        onChange={(e) => handleUpdateBlockField(block.id, 'buttonLink', e.target.value)}
                                        className="h-8 text-xs font-mono"
                                      />
                                    </div>
                                    <div className="space-y-1 col-span-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Theme style</label>
                                      <select
                                        value={block.theme}
                                        onChange={(e) => handleUpdateBlockField(block.id, 'theme', e.target.value)}
                                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                                      >
                                        <option value="primary">Brand Primary</option>
                                        <option value="secondary">Neutral Soft</option>
                                        <option value="dark">Luxury Dark</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* FEATURES BLOCK FORM */}
                              {block.type === 'features' && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Main Title Header</label>
                                      <Input
                                        value={block.title}
                                        onChange={(e) => handleUpdateBlockField(block.id, 'title', e.target.value)}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Optional Intro Description</label>
                                      <Input
                                        value={block.description || ''}
                                        onChange={(e) => handleUpdateBlockField(block.id, 'description', e.target.value)}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                  </div>

                                  {/* List Feature Items nested */}
                                  <div className="space-y-2 border-t pt-3">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Features Grid Cards ({block.items?.length || 0})</span>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddFeatureItem(block.id)}
                                        className="h-6 text-[10px] gap-1 px-2"
                                      >
                                        <Plus className="h-3 w-3" /> Add Feature Card
                                      </Button>
                                    </div>

                                    <div className="space-y-3.5 divide-y">
                                      {block.items?.map((item, fIdx) => (
                                        <div key={item.id} className="pt-2.5 first:pt-0 space-y-2">
                                          <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-semibold text-muted-foreground">Card #{fIdx + 1}</span>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteFeatureItem(block.id, item.id)}
                                              className="text-[10px] text-destructive hover:underline font-semibold"
                                            >
                                              Remove Card
                                            </button>
                                          </div>

                                          <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-1 col-span-2">
                                              <label className="text-[9px] font-semibold text-muted-foreground uppercase">Card Title</label>
                                              <Input
                                                value={item.title}
                                                onChange={(e) => handleUpdateFeatureItem(block.id, item.id, 'title', e.target.value)}
                                                className="h-7 text-xs"
                                              />
                                            </div>
                                            <div className="space-y-1 col-span-1">
                                              <label className="text-[9px] font-semibold text-muted-foreground uppercase">Icon (Lucide name)</label>
                                              <select
                                                value={item.iconName}
                                                onChange={(e) => handleUpdateFeatureItem(block.id, item.id, 'iconName', e.target.value)}
                                                className="h-7 w-full rounded-md border border-input bg-background px-1.5 text-xs"
                                              >
                                                <option value="Sparkles">Sparkles</option>
                                                <option value="Zap">Zap / Lightening</option>
                                                <option value="Shield">Shield / Security</option>
                                                <option value="Grid">Dashboard Grid</option>
                                                <option value="Code">Source Code</option>
                                                <option value="MousePointer">Click Action</option>
                                              </select>
                                            </div>
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-[9px] font-semibold text-muted-foreground uppercase">Card Subtext Description</label>
                                            <Input
                                              value={item.description}
                                              onChange={(e) => handleUpdateFeatureItem(block.id, item.id, 'description', e.target.value)}
                                              className="h-7 text-xs"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* FAQ BLOCK FORM */}
                              {block.type === 'faq' && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">FAQ Heading</label>
                                      <Input
                                        value={block.title}
                                        onChange={(e) => handleUpdateBlockField(block.id, 'title', e.target.value)}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">FAQ Subtitle</label>
                                      <Input
                                        value={block.description || ''}
                                        onChange={(e) => handleUpdateBlockField(block.id, 'description', e.target.value)}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                  </div>

                                  {/* List FAQ items nested */}
                                  <div className="space-y-2 border-t pt-3">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">FAQ Accordion list ({block.items?.length || 0})</span>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddFaqItem(block.id)}
                                        className="h-6 text-[10px] gap-1 px-2"
                                      >
                                        <Plus className="h-3 w-3" /> Add Question Panel
                                      </Button>
                                    </div>

                                    <div className="space-y-3.5 divide-y">
                                      {block.items?.map((item, qIdx) => (
                                        <div key={item.id} className="pt-2.5 first:pt-0 space-y-2">
                                          <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-semibold text-muted-foreground">Accordion #{qIdx + 1}</span>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteFaqItem(block.id, item.id)}
                                              className="text-[10px] text-destructive hover:underline font-semibold"
                                            >
                                              Remove Accordion
                                            </button>
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-[9px] font-semibold text-muted-foreground uppercase">Question text</label>
                                            <Input
                                              value={item.question}
                                              onChange={(e) => handleUpdateFaqItem(block.id, item.id, 'question', e.target.value)}
                                              className="h-7 text-xs"
                                            />
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-[9px] font-semibold text-muted-foreground uppercase">Answer context</label>
                                            <Input
                                              value={item.answer}
                                              onChange={(e) => handleUpdateFaqItem(block.id, item.id, 'answer', e.target.value)}
                                              className="h-7 text-xs"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add block selector grid panel */}
              <Card className="border border-dashed shadow-xs bg-muted/5">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-center">Select Content Block Template</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      id="add-block-hero"
                      type="button"
                      variant="outline"
                      onClick={() => handleAddBlock('hero')}
                      className="h-9 justify-start gap-2 text-[11px] border bg-background"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Hero Banner
                    </Button>
                    <Button
                      id="add-block-text"
                      type="button"
                      variant="outline"
                      onClick={() => handleAddBlock('text')}
                      className="h-9 justify-start gap-2 text-[11px] border bg-background"
                    >
                      <Type className="h-3.5 w-3.5 text-sky-500" /> Rich Paragraph
                    </Button>
                    <Button
                      id="add-block-image"
                      type="button"
                      variant="outline"
                      onClick={() => handleAddBlock('image')}
                      className="h-9 justify-start gap-2 text-[11px] border bg-background"
                    >
                      <ImageIcon className="h-3.5 w-3.5 text-emerald-500" /> Core Image
                    </Button>
                    <Button
                      id="add-block-cta"
                      type="button"
                      variant="outline"
                      onClick={() => handleAddBlock('cta')}
                      className="h-9 justify-start gap-2 text-[11px] border bg-background"
                    >
                      <MousePointer className="h-3.5 w-3.5 text-indigo-500" /> CTA Box
                    </Button>
                    <Button
                      id="add-block-features"
                      type="button"
                      variant="outline"
                      onClick={() => handleAddBlock('features')}
                      className="h-9 justify-start gap-2 text-[11px] border bg-background col-span-2"
                    >
                      <Grid className="h-3.5 w-3.5 text-purple-500" /> Features Matrix Grid
                    </Button>
                    <Button
                      id="add-block-faq"
                      type="button"
                      variant="outline"
                      onClick={() => handleAddBlock('faq')}
                      className="h-9 justify-start gap-2 text-[11px] border bg-background col-span-2"
                    >
                      <HelpCircle className="h-3.5 w-3.5 text-pink-500" /> FAQ Accordions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 2B. RIGHT COLUMN: MOCK DEVICE LIVE CANVAS PREVIEW (7/12) */}
            <div className="lg:col-span-7 space-y-3 lg:sticky lg:top-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Monitor className="h-3.5 w-3.5" /> Real-time Device View
                </span>

                <div className="flex gap-1 border p-0.5 rounded-md bg-muted/20">
                  <button
                    id="preview-desktop-btn"
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1 rounded ${previewDevice === 'desktop' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    title="Desktop Preview"
                  >
                    <Monitor className="h-3.5 w-3.5" />
                  </button>
                  <button
                    id="preview-mobile-btn"
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1 rounded ${previewDevice === 'mobile' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    title="Mobile Viewport"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Preview simulated frame */}
              <div
                className={`border rounded-xl shadow-md bg-background transition-all duration-300 mx-auto overflow-hidden ${
                  previewDevice === 'mobile' ? 'max-w-[360px] h-[640px]' : 'w-full h-[720px]'
                }`}
              >
                {/* Simulated URL bar */}
                <div className="bg-muted/40 p-2 border-b flex items-center gap-2 text-xs select-none">
                  <div className="flex gap-1.5 shrink-0">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
                  </div>
                  <div className="flex-1 bg-background rounded border px-3 py-0.5 text-[10px] font-mono text-muted-foreground truncate">
                    https://your-platform.com/{pageSlug || 'promo-campaign'}
                  </div>
                </div>

                {/* Simulated Content scrolling frame */}
                <div className="h-full overflow-y-auto pb-16 bg-white text-zinc-900 scroll-smooth">
                  {blocks.length === 0 ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-center p-8 space-y-3 bg-zinc-50">
                      <LayoutTemplate className="h-10 w-10 text-zinc-300 stroke-[1.2]" />
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-zinc-600">Dynamic Canvas Empty</p>
                        <p className="text-xs text-zinc-400 max-w-xs">
                          Start adding elements like Heros, Paragraphs, Images, CTAs, and matrices on the left menu.
                        </p>
                      </div>
                    </div>
                  ) : (
                    blocks.map((block) => {
                      // Live render of each block template
                      switch (block.type) {
                        case 'hero':
                          const heroBg =
                            block.bgType === 'dark'
                              ? 'bg-zinc-950 text-white'
                              : block.bgType === 'gradient'
                              ? 'bg-gradient-to-tr from-indigo-50 via-sky-50 to-emerald-50 text-zinc-900'
                              : 'bg-zinc-50 text-zinc-900';

                          return (
                            <section key={block.id} className={`p-8 md:p-12 text-center relative border-b ${heroBg}`}>
                              <div className="max-w-2xl mx-auto space-y-4">
                                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                                  {block.title || 'Dynamic Hero Title'}
                                </h1>
                                <p className="text-xs md:text-sm text-zinc-500 max-w-lg mx-auto">
                                  {block.subtitle || 'Custom subtitle detailing your promotional focus.'}
                                </p>
                                <div className="pt-2">
                                  <span className="inline-block px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white shadow hover:opacity-95 cursor-pointer">
                                    {block.ctaText || 'Get Started'}
                                  </span>
                                </div>

                                {block.imageUrl && (
                                  <div className="pt-6">
                                    <img
                                      src={block.imageUrl}
                                      alt="Hero Visual Preview"
                                      referrerPolicy="no-referrer"
                                      className="rounded-lg shadow-md max-h-[180px] w-full object-cover border"
                                    />
                                  </div>
                                )}
                              </div>
                            </section>
                          );

                        case 'text':
                          const textAlign =
                            block.align === 'center'
                              ? 'text-center'
                              : block.align === 'right'
                              ? 'text-right'
                              : 'text-left';

                          return (
                            <section key={block.id} className="p-8 border-b bg-white">
                              <div className="max-w-2xl mx-auto space-y-2">
                                {block.heading && (
                                  <h2 className={`text-base md:text-lg font-bold text-zinc-900 ${textAlign}`}>
                                    {block.heading}
                                  </h2>
                                )}
                                <p className={`text-xs md:text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap ${textAlign}`}>
                                  {block.body || 'Add structured body information copy.'}
                                </p>
                              </div>
                            </section>
                          );

                        case 'image':
                          let ratioClass = 'aspect-video';
                          if (block.aspectRatio === '4:3') ratioClass = 'aspect-[4/3]';
                          if (block.aspectRatio === 'square') ratioClass = 'aspect-square';
                          if (block.aspectRatio === 'auto') ratioClass = 'aspect-auto';

                          return (
                            <section key={block.id} className="p-8 border-b bg-zinc-50/50 flex flex-col items-center">
                              <div className="max-w-xl w-full space-y-2">
                                <div className={`w-full overflow-hidden rounded-lg border shadow-xs bg-zinc-200 ${ratioClass}`}>
                                  <img
                                    src={block.url}
                                    alt={block.alt}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                {block.caption && (
                                  <p className="text-[11px] italic text-zinc-400 text-center">
                                    {block.caption}
                                  </p>
                                )}
                              </div>
                            </section>
                          );

                        case 'cta':
                          let ctaThemeClass = 'bg-indigo-600 text-white';
                          let ctaBtnClass = 'bg-white text-indigo-600 hover:bg-zinc-50';
                          if (block.theme === 'secondary') {
                            ctaThemeClass = 'bg-zinc-100 text-zinc-900 border';
                            ctaBtnClass = 'bg-zinc-900 text-white hover:bg-zinc-800';
                          } else if (block.theme === 'dark') {
                            ctaThemeClass = 'bg-zinc-900 text-white';
                            ctaBtnClass = 'bg-white text-zinc-950 hover:bg-zinc-100';
                          }

                          return (
                            <section key={block.id} className="p-8 border-b bg-white">
                              <div className={`max-w-2xl mx-auto rounded-xl p-6 text-center space-y-3.5 ${ctaThemeClass}`}>
                                <h3 className="text-base md:text-lg font-bold leading-tight">{block.title || 'Dynamic Banner Title'}</h3>
                                <p className="text-xs opacity-90 max-w-md mx-auto">{block.description || 'Promotional taglines go here.'}</p>
                                <div className="pt-1.5">
                                  <span className={`inline-block px-4 py-2 text-xs font-bold rounded-md shadow-xs cursor-pointer ${ctaBtnClass}`}>
                                    {block.buttonText || 'Click Action'}
                                  </span>
                                </div>
                              </div>
                            </section>
                          );

                        case 'features':
                          return (
                            <section key={block.id} className="p-8 border-b bg-zinc-50/20">
                              <div className="max-w-2xl mx-auto space-y-6">
                                <div className="text-center space-y-1">
                                  <h3 className="text-base md:text-lg font-bold text-zinc-900">{block.title || 'Core Capabilities'}</h3>
                                  {block.description && (
                                    <p className="text-xs text-zinc-400">{block.description}</p>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {block.items?.map((item) => {
                                    // Simulated simple dynamic icons
                                    let previewIcon = '✦';
                                    if (item.iconName === 'Zap') previewIcon = '⚡';
                                    if (item.iconName === 'Shield') previewIcon = '🛡️';
                                    if (item.iconName === 'Grid') previewIcon = '⊞';
                                    if (item.iconName === 'Code') previewIcon = '‹›';
                                    if (item.iconName === 'MousePointer') previewIcon = '🖱️';

                                    return (
                                      <div key={item.id} className="p-4 rounded-lg border bg-white space-y-1.5 shadow-2xs">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm shrink-0 bg-indigo-50 text-indigo-600 p-1 rounded font-bold">
                                            {previewIcon}
                                          </span>
                                          <h4 className="font-bold text-xs text-zinc-800">{item.title}</h4>
                                        </div>
                                        <p className="text-[11px] text-zinc-500 leading-normal">{item.description}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </section>
                          );

                        case 'faq':
                          return (
                            <section key={block.id} className="p-8 border-b bg-white">
                              <div className="max-w-xl mx-auto space-y-6">
                                <div className="text-center space-y-1">
                                  <h3 className="text-base md:text-lg font-bold text-zinc-900">{block.title || 'Questions Hub'}</h3>
                                  {block.description && (
                                    <p className="text-xs text-zinc-400">{block.description}</p>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  {block.items?.map((item) => {
                                    const isOpen = previewFaqOpenId === item.id;
                                    return (
                                      <div key={item.id} className="border rounded-md overflow-hidden">
                                        <div
                                          className="p-3 bg-zinc-50 hover:bg-zinc-100 flex justify-between items-center cursor-pointer select-none"
                                          onClick={() => setPreviewFaqOpenId(isOpen ? null : item.id)}
                                        >
                                          <span className="font-bold text-xs text-zinc-800 leading-snug">{item.question}</span>
                                          <span className="text-zinc-400 text-xs shrink-0 pl-2">{isOpen ? '−' : '+'}</span>
                                        </div>
                                        {isOpen && (
                                          <div className="p-3 border-t bg-white text-[11px] text-zinc-500 leading-relaxed whitespace-pre-wrap animate-in fade-in duration-200">
                                            {item.answer}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </section>
                          );
                      }
                      return null;
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MODAL QUICK VIEW PREVIEW                                    */}
      {/* ============================================================== */}
      {viewingPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-background border rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header row */}
            <div className="p-4 border-b flex justify-between items-center bg-muted/20">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold flex items-center gap-1.5 text-foreground">
                  <Eye className="h-4 w-4 text-primary" /> Live Layout Preview
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Page: "{viewingPage.name}" (Slug: /{viewingPage.slug})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs px-2.5 py-0.5 capitalize border font-semibold bg-background">
                  {viewingPage.status}
                </Badge>
                <button
                  id="close-view-modal"
                  onClick={() => setViewingPage(null)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Rendered mockup */}
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50">
              <div className="max-w-2xl mx-auto bg-white border rounded-xl shadow-xs overflow-hidden">
                {(() => {
                  let parsedBlocks: ContentBlock[] = [];
                  try {
                    parsedBlocks = JSON.parse(viewingPage.content);
                  } catch (e) {
                    return (
                      <div className="p-8 text-center text-muted-foreground text-xs">
                        Failed to render content blocks configuration.
                      </div>
                    );
                  }

                  if (parsedBlocks.length === 0) {
                    return (
                      <div className="p-12 text-center text-muted-foreground text-xs">
                        This page does not contain any blocks.
                      </div>
                    );
                  }

                  return parsedBlocks.map((block) => {
                    switch (block.type) {
                      case 'hero':
                        const heroBg =
                          block.bgType === 'dark'
                            ? 'bg-zinc-950 text-white'
                            : block.bgType === 'gradient'
                            ? 'bg-gradient-to-tr from-indigo-50 via-sky-50 to-emerald-50 text-zinc-900'
                            : 'bg-zinc-50 text-zinc-900';

                        return (
                          <div key={block.id} className={`p-8 md:p-12 text-center border-b ${heroBg}`}>
                            <div className="space-y-4">
                              <h1 className="text-2xl font-extrabold tracking-tight leading-tight">
                                {block.title}
                              </h1>
                              <p className="text-xs text-zinc-500 max-w-lg mx-auto">
                                {block.subtitle}
                              </p>
                              <div>
                                <span className="inline-block px-4 py-2 text-xs font-bold rounded bg-indigo-600 text-white">
                                  {block.ctaText}
                                </span>
                              </div>
                              {block.imageUrl && (
                                <div className="pt-4">
                                  <img
                                    src={block.imageUrl}
                                    alt="Hero Preview"
                                    className="rounded-lg max-h-[160px] w-full object-cover border"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );

                      case 'text':
                        const textAl =
                          block.align === 'center'
                            ? 'text-center'
                            : block.align === 'right'
                            ? 'text-right'
                            : 'text-left';

                        return (
                          <div key={block.id} className="p-8 border-b bg-white text-zinc-800">
                            <div className="space-y-2">
                              {block.heading && (
                                <h2 className={`font-bold text-sm ${textAl}`}>{block.heading}</h2>
                              )}
                              <p className={`text-xs text-zinc-500 leading-relaxed whitespace-pre-wrap ${textAl}`}>
                                {block.body}
                              </p>
                            </div>
                          </div>
                        );

                      case 'image':
                        return (
                          <div key={block.id} className="p-6 border-b bg-zinc-50/30 flex flex-col items-center">
                            <img
                              src={block.url}
                              alt={block.alt}
                              className="rounded border max-h-[220px] object-cover"
                            />
                            {block.caption && (
                              <p className="text-[10px] italic text-zinc-400 mt-1">{block.caption}</p>
                            )}
                          </div>
                        );

                      case 'cta':
                        let cBg = 'bg-indigo-600 text-white';
                        let cBtn = 'bg-white text-indigo-600';
                        if (block.theme === 'secondary') {
                          cBg = 'bg-zinc-100 text-zinc-900 border';
                          cBtn = 'bg-zinc-900 text-white';
                        } else if (block.theme === 'dark') {
                          cBg = 'bg-zinc-900 text-white';
                          cBtn = 'bg-white text-zinc-900';
                        }

                        return (
                          <div key={block.id} className="p-6 border-b bg-white">
                            <div className={`p-6 rounded-lg text-center space-y-3 ${cBg}`}>
                              <h3 className="font-bold text-sm">{block.title}</h3>
                              <p className="text-[11px] opacity-95">{block.description}</p>
                              <div>
                                <span className={`inline-block px-4 py-1.5 text-xs font-semibold rounded ${cBtn}`}>
                                  {block.buttonText}
                                </span>
                              </div>
                            </div>
                          </div>
                        );

                      case 'features':
                        return (
                          <div key={block.id} className="p-8 border-b bg-zinc-50/20">
                            <div className="space-y-4">
                              <div className="text-center">
                                <h3 className="font-bold text-sm text-zinc-900">{block.title}</h3>
                                {block.description && (
                                  <p className="text-[11px] text-zinc-400">{block.description}</p>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {block.items?.map((item) => (
                                  <div key={item.id} className="p-3 border rounded bg-white space-y-1">
                                    <h4 className="font-bold text-xs text-zinc-800 flex items-center gap-1.5">
                                      <span className="text-indigo-600 text-xs font-bold">✦</span>
                                      {item.title}
                                    </h4>
                                    <p className="text-[10px] text-zinc-500">{item.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );

                      case 'faq':
                        return (
                          <div key={block.id} className="p-8 border-b bg-white">
                            <div className="space-y-4">
                              <div className="text-center">
                                <h3 className="font-bold text-sm text-zinc-900">{block.title}</h3>
                                {block.description && (
                                  <p className="text-[11px] text-zinc-400">{block.description}</p>
                                )}
                              </div>
                              <div className="space-y-1.5 max-w-md mx-auto">
                                {block.items?.map((item) => (
                                  <div key={item.id} className="p-2.5 border rounded bg-zinc-50/50">
                                    <p className="font-bold text-xs text-zinc-800">{item.question}</p>
                                    <p className="text-[11px] text-zinc-500 mt-1 pl-1 border-l-2 border-indigo-200">{item.answer}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                    }
                    return null;
                  });
                })()}
              </div>
            </div>

            {/* Footer close button */}
            <div className="p-4 border-t flex justify-end bg-muted/10">
              <Button id="close-view-footer" onClick={() => setViewingPage(null)}>Close Preview</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Landing Page Dialog */}
      <ConfirmDialog
        isOpen={!!pageToDelete}
        onOpenChange={(open) => !open && setPageToDelete(null)}
        title="Delete Landing Page"
        description={
          <>
            Are you sure you want to delete the landing page <strong>"{pageToDelete?.name}"</strong>?
            This will permanently remove all custom styled blocks.
          </>
        }
        confirmText="Delete Page"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => pageToDelete && deleteMutation.mutate(pageToDelete.id)}
      />

      {/* Reset Layout Blocks Dialog */}
      <ConfirmDialog
        isOpen={isResetBlocksConfirmOpen}
        onOpenChange={(open) => !open && setIsResetBlocksConfirmOpen(false)}
        title="Reset Page Blocks"
        description="Are you sure you want to clear all blocks and start with a blank template? Any unsaved edits will be lost."
        confirmText="Clear All Blocks"
        variant="destructive"
        onConfirm={() => {
          setBlocks([]);
          setIsResetBlocksConfirmOpen(false);
          notify.info('Blocks Cleared', 'Layout has been reset to blank.');
        }}
      />
    </div>
  );
}
