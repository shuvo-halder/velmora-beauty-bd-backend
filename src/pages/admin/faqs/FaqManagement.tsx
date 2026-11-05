import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { faqService } from '../../../services/faq.service';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  HelpCircle,
  Plus,
  Search,
  Edit,
  Trash2,
  FolderPlus,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Folder,
  AlertCircle,
  Filter,
  Layers
} from 'lucide-react';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { notify } from '../../../lib/notify';

export function FaqManagement() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  // RBAC permissions
  const canRead = hasPermission('FAQ', 'read');
  const canWrite = hasPermission('FAQ', 'write');
  const canDelete = hasPermission('FAQ', 'delete');

  // React Query for fetching FAQs and Categories
  const { data: faqs = [], isLoading: isLoadingFaqs, error: faqsError } = useQuery({
    queryKey: ['faq-list'],
    queryFn: faqService.getFaqs,
    enabled: canRead,
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['faq-categories'],
    queryFn: faqService.getCategories,
    enabled: canRead,
  });

  // Local state for UI
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Modal states
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any | null>(null);
  const [faqToDelete, setFaqToDelete] = useState<any | null>(null);
  const [catToDelete, setCatToDelete] = useState<any | null>(null);

  // FAQ Form State
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategoryId, setFaqCategoryId] = useState<string>('');
  const [faqOrderIndex, setFaqOrderIndex] = useState<number>(0);
  const [faqIsActive, setFaqIsActive] = useState(true);
  const [faqIsGlobal, setFaqIsGlobal] = useState(true);
  const [faqFormError, setFaqFormError] = useState<string | null>(null);

  // Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [catFormError, setCatFormError] = useState<string | null>(null);

  // FAQ Mutations
  const createFaqMutation = useMutation({
    mutationFn: faqService.createFaq,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-list'] });
      setIsFaqModalOpen(false);
      resetFaqForm();
      notify.success('FAQ Created', 'New FAQ has been added.');
    },
    onError: (err: any) => {
      setFaqFormError(err.response?.data?.error?.message || 'Failed to create FAQ');
      notify.apiError(err, 'Failed to create FAQ');
    }
  });

  const updateFaqMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => faqService.updateFaq(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-list'] });
      setIsFaqModalOpen(false);
      resetFaqForm();
      notify.success('FAQ Updated', 'FAQ has been updated.');
    },
    onError: (err: any) => {
      setFaqFormError(err.response?.data?.error?.message || 'Failed to update FAQ');
      notify.apiError(err, 'Failed to update FAQ');
    }
  });

  const deleteFaqMutation = useMutation({
    mutationFn: faqService.deleteFaq,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-list'] });
      notify.success('FAQ Deleted', `FAQ "${faqToDelete?.question || ''}" was deleted.`);
      setFaqToDelete(null);
    },
    onError: (err: any) => {
      notify.apiError(err, 'Failed to delete FAQ');
      setFaqToDelete(null);
    }
  });

  // Category Mutations
  const createCategoryMutation = useMutation({
    mutationFn: faqService.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-categories'] });
      setNewCatName('');
      setNewCatDesc('');
      setCatFormError(null);
      notify.success('Category Created', 'FAQ Category added successfully.');
    },
    onError: (err: any) => {
      setCatFormError(err.response?.data?.error?.message || 'Failed to create Category');
      notify.apiError(err, 'Failed to create Category');
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: faqService.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faq-categories'] });
      notify.success('Category Deleted', `Category "${catToDelete?.name || ''}" was deleted.`);
      setCatToDelete(null);
    },
    onError: (err: any) => {
      notify.apiError(err, 'Failed to delete category');
      setCatToDelete(null);
    }
  });

  // Helpers
  const resetFaqForm = () => {
    setFaqQuestion('');
    setFaqAnswer('');
    setFaqCategoryId('');
    setFaqOrderIndex(0);
    setFaqIsActive(true);
    setFaqIsGlobal(true);
    setEditingFaq(null);
    setFaqFormError(null);
  };

  const handleOpenCreateFaq = () => {
    resetFaqForm();
    // Default order index to max orderIndex + 10
    const maxOrder = faqs.reduce((max: number, f: any) => Math.max(max, f.orderIndex || 0), 0);
    setFaqOrderIndex(maxOrder + 10);
    setIsFaqModalOpen(true);
  };

  const handleOpenEditFaq = (faq: any) => {
    setEditingFaq(faq);
    setFaqQuestion(faq.question);
    setFaqAnswer(faq.answer);
    setFaqCategoryId(faq.categoryId || '');
    setFaqOrderIndex(faq.orderIndex || 0);
    setFaqIsActive(faq.isActive);
    setFaqIsGlobal(faq.isGlobal !== false);
    setFaqFormError(null);
    setIsFaqModalOpen(true);
  };

  const handleSaveFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim()) {
      setFaqFormError('Question is required');
      return;
    }
    if (!faqAnswer.trim()) {
      setFaqFormError('Answer is required');
      return;
    }

    const payload = {
      question: faqQuestion.trim(),
      answer: faqAnswer.trim(),
      categoryId: faqCategoryId || null,
      orderIndex: Number(faqOrderIndex),
      isActive: faqIsActive,
      isGlobal: faqIsGlobal,
    };

    if (editingFaq) {
      updateFaqMutation.mutate({ id: editingFaq.id, data: payload });
    } else {
      createFaqMutation.mutate(payload);
    }
  };

  const handleToggleActive = (faq: any) => {
    if (!canWrite) return;
    updateFaqMutation.mutate({
      id: faq.id,
      data: { isActive: !faq.isActive }
    });
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setCatFormError('Category name is required');
      return;
    }
    createCategoryMutation.mutate({
      name: newCatName.trim(),
      description: newCatDesc.trim() || null
    });
  };

  // Re-ordering logic
  const handleMoveOrder = async (faq: any, direction: 'up' | 'down') => {
    if (!canWrite) return;
    
    // Sort all current list items by orderIndex
    const sorted = [...faqs].sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));
    const currentIndex = sorted.findIndex((f: any) => f.id === faq.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const neighbor = sorted[targetIndex];

    let faqNewIndex = neighbor.orderIndex;
    let neighborNewIndex = faq.orderIndex;

    // Ensure distinct order indexes if they were equal
    if (faqNewIndex === neighborNewIndex) {
      if (direction === 'up') {
        faqNewIndex = Math.max(0, faqNewIndex - 1);
        neighborNewIndex = neighborNewIndex + 1;
      } else {
        faqNewIndex = faqNewIndex + 1;
        neighborNewIndex = Math.max(0, neighborNewIndex - 1);
      }
    }

    try {
      await Promise.all([
        faqService.updateFaq(faq.id, { orderIndex: faqNewIndex }),
        faqService.updateFaq(neighbor.id, { orderIndex: neighborNewIndex })
      ]);
      queryClient.invalidateQueries({ queryKey: ['faq-list'] });
    } catch (e) {
      console.error('Failed to change sort order', e);
    }
  };

  // Filtering & Sorting for Render
  const filteredFaqs = faqs.filter((faq: any) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory =
      selectedCategoryId === 'ALL' || faq.categoryId === selectedCategoryId;

    return matchesSearch && matchesCategory;
  });

  // Sort them sequentially by orderIndex
  const sortedRenderedFaqs = [...filteredFaqs].sort(
    (a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)
  );

  // Permission Guard
  if (!canRead) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto stroke-[1.5]" />
        <h3 className="text-xl font-bold">Access Denied</h3>
        <p className="text-sm text-muted-foreground">
          You do not have the required permissions (`FAQ:read`) to view FAQ Management.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <HelpCircle className="h-8 w-8 text-primary" /> FAQ Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Create, categorize, reorder, and configure frequently asked questions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button
            id="manage-categories-btn"
            variant="outline"
            onClick={() => setIsCategoryModalOpen(true)}
            className="gap-2 text-sm"
          >
            <Layers className="h-4 w-4 text-muted-foreground" />
            Manage Categories
          </Button>

          {canWrite && (
            <Button
              id="create-faq-btn"
              onClick={handleOpenCreateFaq}
              className="gap-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              Create FAQ
            </Button>
          )}
        </div>
      </div>

      {/* Control bar: search & filter */}
      <Card id="faq-filters-card" className="border shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="faq-search-input"
              placeholder="Search by question or answer keywords..."
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

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              id="faq-category-filter"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="h-9 w-full md:w-56 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">All Categories</option>
              <option value="">Uncategorized</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* List content */}
      {isLoadingFaqs ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading FAQ entries...</p>
        </div>
      ) : faqsError ? (
        <div className="p-8 text-center max-w-md mx-auto space-y-4 border rounded-xl bg-destructive/5 border-destructive/20">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h3 className="text-lg font-bold">Failed to load FAQs</h3>
          <p className="text-sm text-muted-foreground">
            Could not communicate with the database. Please verify your connection or try again.
          </p>
        </div>
      ) : sortedRenderedFaqs.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-xl space-y-3 bg-muted/10">
          <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto opacity-40" />
          <div className="space-y-1">
            <p className="text-base font-semibold">No FAQs matches your query</p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Try adjusting your text search, resetting category filter, or create a brand new FAQ.
            </p>
          </div>
          {(searchQuery || selectedCategoryId !== 'ALL') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryId('ALL');
              }}
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRenderedFaqs.map((faq: any, idx: number) => {
            const isExpanded = expandedFaqId === faq.id;
            const itemCategoryName = faq.category?.name || categories.find((c: any) => c.id === faq.categoryId)?.name || 'Uncategorized';

            return (
              <div
                key={faq.id}
                className={`border rounded-xl bg-card hover:bg-muted/10 transition-all overflow-hidden ${
                  faq.isActive ? 'border-border' : 'border-border/60 opacity-80'
                }`}
              >
                {/* Header Row */}
                <div
                  className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                  onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Sort Index Controls */}
                    <div className="flex flex-col items-center shrink-0 border-r pr-3.5 mr-0.5">
                      {canWrite && (
                        <button
                          id={`move-up-${faq.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveOrder(faq, 'up');
                          }}
                          disabled={idx === 0}
                          className="p-0.5 hover:text-primary disabled:text-muted-foreground/30 transition"
                          title="Move Up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                      )}
                      <span className="text-xs font-mono font-semibold" title="Sort order index">
                        {faq.orderIndex}
                      </span>
                      {canWrite && (
                        <button
                          id={`move-down-${faq.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveOrder(faq, 'down');
                          }}
                          disabled={idx === sortedRenderedFaqs.length - 1}
                          className="p-0.5 hover:text-primary disabled:text-muted-foreground/30 transition"
                          title="Move Down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-semibold bg-muted/20">
                          {itemCategoryName}
                        </Badge>
                        {faq.isGlobal === false ? (
                          <Badge variant="outline" className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                            Product Only
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30">
                            Global
                          </Badge>
                        )}
                        {!faq.isActive && (
                          <Badge variant="secondary" className="text-[10px] font-semibold text-muted-foreground bg-muted">
                            Inactive / Draft
                          </Badge>
                        )}
                      </div>
                      <p className="font-semibold text-sm text-foreground leading-snug line-clamp-2" title={faq.question}>
                        {faq.question}
                      </p>
                    </div>
                  </div>

                  {/* Right hand controls */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {/* Active toggle button */}
                    {canWrite ? (
                      <button
                        id={`active-toggle-${faq.id}`}
                        onClick={() => handleToggleActive(faq)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          faq.isActive ? 'bg-primary' : 'bg-muted-foreground/30'
                        }`}
                        title={faq.isActive ? 'Deactivate FAQ' : 'Activate FAQ'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            faq.isActive ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    ) : (
                      <span className={`h-2.5 w-2.5 rounded-full ${faq.isActive ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                    )}

                    {/* Expand indicator */}
                    <button
                      onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                      className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    {/* Edit / Delete */}
                    <div className="flex items-center gap-1 border-l pl-2">
                      {canWrite && (
                        <Button
                          id={`edit-faq-${faq.id}`}
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditFaq(faq)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          id={`delete-faq-${faq.id}`}
                          variant="ghost"
                          size="icon"
                          onClick={() => setFaqToDelete(faq)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete FAQ"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Answer Body */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t bg-muted/5 animate-in fade-in duration-200">
                    <div className="pl-[52px] space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Answer</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FAQ Create / Edit Modal Dialog */}
      {isFaqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background border rounded-xl shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  {editingFaq ? 'Edit FAQ Entry' : 'Create FAQ Entry'}
                </h3>
                <button
                  id="close-faq-modal-btn"
                  onClick={() => setIsFaqModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {faqFormError && (
                <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{faqFormError}</span>
                </div>
              )}

              <form onSubmit={handleSaveFaq} className="space-y-4">
                {/* Question */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Question</label>
                  <Input
                    id="faq-form-question"
                    value={faqQuestion}
                    onChange={(e) => setFaqQuestion(e.target.value)}
                    placeholder="Enter the frequently asked question..."
                    required
                  />
                </div>

                {/* Answer */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Answer</label>
                  <textarea
                    id="faq-form-answer"
                    value={faqAnswer}
                    onChange={(e) => setFaqAnswer(e.target.value)}
                    placeholder="Enter the clear and helpful answer..."
                    rows={5}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  />
                </div>

                {/* Two Column details: Category & Sort Order */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category select */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
                    <select
                      id="faq-form-category"
                      value={faqCategoryId}
                      onChange={(e) => setFaqCategoryId(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort order index */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sort Order Index</label>
                    <Input
                      id="faq-form-order-index"
                      type="number"
                      value={faqOrderIndex}
                      onChange={(e) => setFaqOrderIndex(parseInt(e.target.value) || 0)}
                      placeholder="e.g. 10"
                    />
                  </div>
                </div>

                {/* Active switch toggle */}
                <div className="flex items-center justify-between border bg-muted/20 p-3.5 rounded-lg">
                  <div className="space-y-0.5">
                    <span className="text-sm font-semibold block">Visible / Published</span>
                    <span className="text-xs text-muted-foreground">If turned off, this FAQ is saved as a hidden draft.</span>
                  </div>
                  <button
                    id="faq-form-active-toggle"
                    type="button"
                    onClick={() => setFaqIsActive(!faqIsActive)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      faqIsActive ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        faqIsActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Global Storefront FAQ vs Product Only toggle */}
                <div className="flex items-center justify-between border bg-muted/20 p-3.5 rounded-lg">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold block">Global Storefront FAQ</span>
                      <Badge variant={faqIsGlobal ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5 font-medium">
                        {faqIsGlobal ? 'Global' : 'Product Only'}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {faqIsGlobal
                        ? 'Visible on the main Storefront /faq page (can also be assigned to products).'
                        : 'Product-only FAQ. Hidden from /faq page; only visible on assigned products.'}
                    </span>
                  </div>
                  <button
                    id="faq-form-global-toggle"
                    type="button"
                    onClick={() => setFaqIsGlobal(!faqIsGlobal)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      faqIsGlobal ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        faqIsGlobal ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Footer action buttons */}
                <div className="flex justify-end gap-2.5 pt-2 border-t mt-4">
                  <Button
                    id="faq-form-cancel"
                    type="button"
                    variant="outline"
                    onClick={() => setIsFaqModalOpen(false)}
                    disabled={createFaqMutation.isPending || updateFaqMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    id="faq-form-submit"
                    type="submit"
                    disabled={createFaqMutation.isPending || updateFaqMutation.isPending}
                    className="gap-1.5"
                  >
                    {(createFaqMutation.isPending || updateFaqMutation.isPending) && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    {editingFaq ? 'Save Changes' : 'Create FAQ'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal Dialog */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background border rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Manage FAQ Categories
                </h3>
                <button
                  id="close-category-modal-btn"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Add New Category Section */}
              {canWrite && (
                <div className="bg-muted/10 p-4 rounded-xl border space-y-3">
                  <h4 className="text-sm font-bold flex items-center gap-1.5">
                    <FolderPlus className="h-4 w-4 text-primary" /> Create New Category
                  </h4>
                  {catFormError && (
                    <div className="p-2.5 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-xs font-medium">
                      {catFormError}
                    </div>
                  )}
                  <form onSubmit={handleCreateCategory} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category Name</label>
                      <Input
                        id="new-cat-name"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="e.g. Billing"
                        required
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Description (Optional)</label>
                      <Input
                        id="new-cat-desc"
                        value={newCatDesc}
                        onChange={(e) => setNewCatDesc(e.target.value)}
                        placeholder="e.g. Invoicing & checkout queries"
                        className="h-9"
                      />
                    </div>
                    <Button
                      id="save-category-btn"
                      type="submit"
                      disabled={createCategoryMutation.isPending}
                      className="h-9 w-full gap-1.5"
                    >
                      {createCategoryMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Add Category
                    </Button>
                  </form>
                </div>
              )}

              {/* Category List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Existing Categories ({categories.length})</h4>
                {isLoadingCategories ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                    No categories have been created yet.
                  </p>
                ) : (
                  <div className="border rounded-lg max-h-60 overflow-y-auto divide-y">
                    {categories.map((cat: any) => {
                      // Check count of faqs under this category
                      const count = faqs.filter((f: any) => f.categoryId === cat.id).length;

                      return (
                        <div key={cat.id} className="p-3 flex items-center justify-between gap-4 bg-card">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="font-semibold text-sm leading-none flex items-center gap-1.5">
                              <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              {cat.name}
                              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono font-bold shrink-0">
                                {count} {count === 1 ? 'FAQ' : 'FAQs'}
                              </span>
                            </p>
                            {cat.description && (
                              <p className="text-xs text-muted-foreground truncate" title={cat.description}>
                                {cat.description}
                              </p>
                            )}
                          </div>

                          {canDelete && (
                            <Button
                              id={`delete-category-${cat.id}`}
                              variant="ghost"
                              size="icon"
                              disabled={count > 0 || deleteCategoryMutation.isPending}
                              onClick={() => setCatToDelete(cat)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:hover:bg-transparent"
                              title={count > 0 ? "Cannot delete category while it has FAQs" : "Delete category"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Close footer */}
              <div className="flex justify-end pt-2 border-t">
                <Button id="close-category-modal-footer" onClick={() => setIsCategoryModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete FAQ Dialog */}
      <ConfirmDialog
        isOpen={!!faqToDelete}
        onOpenChange={(open) => !open && setFaqToDelete(null)}
        title="Delete FAQ"
        description={
          <>
            Are you sure you want to delete this FAQ?
            {faqToDelete && (
              <p className="mt-2 font-medium text-foreground italic">"{faqToDelete.question}"</p>
            )}
          </>
        }
        confirmText="Delete FAQ"
        variant="destructive"
        isLoading={deleteFaqMutation.isPending}
        onConfirm={() => faqToDelete && deleteFaqMutation.mutate(faqToDelete.id)}
      />

      {/* Delete Category Dialog */}
      <ConfirmDialog
        isOpen={!!catToDelete}
        onOpenChange={(open) => !open && setCatToDelete(null)}
        title="Delete FAQ Category"
        description={
          <>
            Are you sure you want to delete the <strong>"{catToDelete?.name}"</strong> category?
          </>
        }
        confirmText="Delete Category"
        variant="destructive"
        isLoading={deleteCategoryMutation.isPending}
        onConfirm={() => catToDelete && deleteCategoryMutation.mutate(catToDelete.id)}
      />
    </div>
  );
}
