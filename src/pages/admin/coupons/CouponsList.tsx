import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { couponService, Coupon } from '../../../services/coupon.service';
import { getCategories } from '../../../services/category.service';
import { getBrands } from '../../../services/brand.service';
import { getProducts } from '../../../services/product.service';
import { 
  Ticket, 
  Plus, 
  Search, 
  Copy, 
  Trash2, 
  Edit3, 
  Power, 
  TrendingUp, 
  Users, 
  Percent,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Tag,
  Package,
  Layers,
  ShoppingBag,
  Filter
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { notify } from '../../../lib/notify';
import { useAuth } from '../../../context/AuthContext';

export function CouponsList() {
  const queryClient = useQueryClient();
  const { can, user } = useAuth();
  const canWrite = can('Coupons', 'write') || can('Marketing', 'write') || user?.role?.name === 'Super Admin';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [discountTypeFilter, setDiscountTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [productSearch, setProductSearch] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed' | 'free_shipping',
    discountValue: '10',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    minOrderAmount: '',
    maxDiscountAmount: '',
    usageLimit: '',
    usagePerCustomer: '',
    isActive: true,
    applicableCategories: [] as string[],
    applicableProducts: [] as string[],
    applicableBrands: [] as string[],
  });

  // Queries
  const { data: couponsResponse, isLoading } = useQuery({
    queryKey: ['coupons', search, statusFilter, discountTypeFilter, page, limit],
    queryFn: () =>
      couponService.getAll({
        search,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        discountType: discountTypeFilter !== 'all' ? discountTypeFilter : undefined,
        page,
        limit,
      }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(false),
    enabled: isModalOpen,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: () => getBrands(),
    enabled: isModalOpen,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
    enabled: isModalOpen,
  });

  const coupons: Coupon[] = couponsResponse?.data || [];
  const pagination = couponsResponse?.pagination;

  const createMutation = useMutation({
    mutationFn: (data: any) => couponService.create(data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      setIsModalOpen(false);
      resetForm();
      notify.success('Coupon Created', `Coupon code "${res?.data?.code || formData.code}" created successfully.`);
    },
    onError: (err) => notify.apiError(err, 'Failed to create coupon.')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => couponService.update(id, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      setIsModalOpen(false);
      setEditingCoupon(null);
      resetForm();
      notify.success('Coupon Updated', `Coupon code "${res?.data?.code || 'Coupon'}" updated.`);
    },
    onError: (err) => notify.apiError(err, 'Failed to update coupon.')
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => couponService.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      notify.success('Status Updated', 'Coupon activation state changed.');
    },
    onError: (err) => notify.apiError(err, 'Failed to toggle coupon status.')
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => couponService.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      notify.success('Coupon Duplicated', 'A cloned coupon draft was created.');
    },
    onError: (err) => notify.apiError(err, 'Failed to duplicate coupon.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => couponService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      notify.success('Coupon Deleted', `Coupon "${couponToDelete?.code || 'Coupon'}" was removed.`);
      setCouponToDelete(null);
    },
    onError: (err) => notify.apiError(err, 'Failed to delete coupon.')
  });

  const resetForm = () => {
    setFormData({
      code: '',
      discountType: 'percentage',
      discountValue: '10',
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      minOrderAmount: '',
      maxDiscountAmount: '',
      usageLimit: '',
      usagePerCustomer: '',
      isActive: true,
      applicableCategories: [],
      applicableProducts: [],
      applicableBrands: [],
    });
    setProductSearch('');
  };

  const parseScopeList = (scope: any): string[] => {
    if (!scope) return [];
    if (Array.isArray(scope)) return scope;
    if (typeof scope === 'string') {
      try {
        const parsed = JSON.parse(scope);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return scope.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue ?? 0),
      validFrom: coupon.validFrom ? new Date(coupon.validFrom).toISOString().split('T')[0] : '',
      validUntil: coupon.validUntil ? new Date(coupon.validUntil).toISOString().split('T')[0] : '',
      minOrderAmount: coupon.minOrderAmount != null && coupon.minOrderAmount > 0 ? String(coupon.minOrderAmount) : '',
      maxDiscountAmount: coupon.maxDiscountAmount != null && coupon.maxDiscountAmount > 0 ? String(coupon.maxDiscountAmount) : '',
      usageLimit: coupon.usageLimit != null && coupon.usageLimit > 0 ? String(coupon.usageLimit) : '',
      usagePerCustomer: coupon.usagePerCustomer != null && coupon.usagePerCustomer > 0 ? String(coupon.usagePerCustomer) : '',
      isActive: coupon.isActive,
      applicableCategories: parseScopeList(coupon.applicableCategories),
      applicableProducts: parseScopeList(coupon.applicableProducts),
      applicableBrands: parseScopeList(coupon.applicableBrands),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      notify.error('Validation Error', 'Coupon code is required.');
      return;
    }

    const payload = {
      code: formData.code.trim().toUpperCase(),
      discountType: formData.discountType,
      discountValue: formData.discountType === 'free_shipping' ? 0 : parseFloat(formData.discountValue) || 0,
      validFrom: formData.validFrom,
      validUntil: formData.validUntil,
      isActive: formData.isActive,
      minOrderAmount: formData.minOrderAmount.trim() !== '' && Number(formData.minOrderAmount) > 0 ? Number(formData.minOrderAmount) : null,
      maxDiscountAmount: formData.maxDiscountAmount.trim() !== '' && Number(formData.maxDiscountAmount) > 0 ? Number(formData.maxDiscountAmount) : null,
      usageLimit: formData.usageLimit.trim() !== '' && Number(formData.usageLimit) > 0 ? Number(formData.usageLimit) : null,
      usagePerCustomer: formData.usagePerCustomer.trim() !== '' && Number(formData.usagePerCustomer) > 0 ? Number(formData.usagePerCustomer) : null,
      applicableCategories: formData.applicableCategories.length > 0 ? formData.applicableCategories : null,
      applicableProducts: formData.applicableProducts.length > 0 ? formData.applicableProducts : null,
      applicableBrands: formData.applicableBrands.length > 0 ? formData.applicableBrands : null,
    };

    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleSelection = (listName: 'applicableCategories' | 'applicableProducts' | 'applicableBrands', itemId: string) => {
    setFormData(prev => {
      const currentList = prev[listName];
      const exists = currentList.includes(itemId);
      return {
        ...prev,
        [listName]: exists ? currentList.filter(id => id !== itemId) : [...currentList, itemId],
      };
    });
  };

  // Stats summary
  const totalRevenue = coupons.reduce((sum, c) => sum + (c.stats?.revenueGenerated || 0), 0);
  const totalUses = coupons.reduce((sum, c) => sum + (c.stats?.totalUses || 0), 0);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Ticket className="h-6 w-6 text-primary" /> Coupon Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Create, manage, and analyze promotional discount coupons & rules
          </p>
        </div>
        <Button onClick={() => { setEditingCoupon(null); resetForm(); setIsModalOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Create Coupon
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Coupons</CardTitle>
            <Ticket className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coupons.filter(c => c.isActive).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Showing page results</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Coupon Uses</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUses}</div>
            <p className="text-xs text-muted-foreground mt-1">Across listed completed orders</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Generated</CardTitle>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">৳</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">Attributed to valid coupon codes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search code..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={discountTypeFilter}
            onChange={(e) => { setDiscountTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border rounded-md text-sm bg-background focus:outline-none"
          >
            <option value="all">All Discount Types</option>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount (৳)</option>
            <option value="free_shipping">Free Shipping</option>
          </select>
        </div>

        <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {['all', 'active', 'expired', 'inactive'].map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap ${
                statusFilter === status 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Coupons Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Code & Type</th>
                <th className="px-4 py-3">Discount Value</th>
                <th className="px-4 py-3">Applicable Scope</th>
                <th className="px-4 py-3">Min Order / Cap</th>
                <th className="px-4 py-3">Validity</th>
                <th className="px-4 py-3">Usage & Stats</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading coupons...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    No coupons found matching criteria.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => {
                  const catScope = parseScopeList(coupon.applicableCategories);
                  const prodScope = parseScopeList(coupon.applicableProducts);
                  const brandScope = parseScopeList(coupon.applicableBrands);
                  const hasRestrictions = catScope.length > 0 || prodScope.length > 0 || brandScope.length > 0;

                  return (
                    <tr key={coupon.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div className="font-mono font-bold text-primary tracking-wide">{coupon.code}</div>
                        <div className="text-xs text-muted-foreground capitalize">{coupon.discountType.replace('_', ' ')}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {coupon.discountType === 'percentage' && `${coupon.discountValue}%`}
                        {coupon.discountType === 'fixed' && `৳${coupon.discountValue}`}
                        {coupon.discountType === 'free_shipping' && 'Free Shipping'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {!hasRestrictions ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded font-medium">
                            All Items
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {catScope.length > 0 && (
                              <span className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">
                                <Layers className="h-3 w-3" /> {catScope.length} Cat
                              </span>
                            )}
                            {brandScope.length > 0 && (
                              <span className="inline-flex items-center gap-0.5 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 px-1.5 py-0.5 rounded font-medium">
                                <Tag className="h-3 w-3" /> {brandScope.length} Brand
                              </span>
                            )}
                            {prodScope.length > 0 && (
                              <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium">
                                <Package className="h-3 w-3" /> {prodScope.length} Prod
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div>Min: {coupon.minOrderAmount ? `৳${coupon.minOrderAmount}` : 'No Min'}</div>
                        <div>Cap: {coupon.maxDiscountAmount ? `৳${coupon.maxDiscountAmount}` : 'Unlimited'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div>{new Date(coupon.validFrom).toLocaleDateString()}</div>
                        <div>to {new Date(coupon.validUntil).toLocaleDateString()}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold text-foreground">
                          {coupon.stats?.totalUses ?? coupon.usedCount ?? 0} / {coupon.usageLimit ?? '∞'} uses
                        </div>
                        <div className="text-emerald-600 font-medium">৳{(coupon.stats?.revenueGenerated || 0).toFixed(2)} rev</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          coupon.isActive 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}>
                          {coupon.isActive ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {coupon.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            title={!canWrite ? "No permission to edit" : "Toggle Status"}
                            disabled={!canWrite || toggleMutation.isPending}
                            onClick={() => toggleMutation.mutate(coupon.id)}
                          >
                            <Power className={`h-4 w-4 ${coupon.isActive ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            title={!canWrite ? "No permission to duplicate" : "Duplicate Coupon"}
                            disabled={!canWrite || duplicateMutation.isPending}
                            onClick={() => duplicateMutation.mutate(coupon.id)}
                          >
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            title={!canWrite ? "No permission to edit" : "Edit Coupon"}
                            disabled={!canWrite}
                            onClick={() => handleEdit(coupon)}
                          >
                            <Edit3 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            title={!canWrite ? "No permission to delete" : "Delete Coupon"}
                            disabled={!canWrite || deleteMutation.isPending}
                            onClick={() => setCouponToDelete(coupon)}
                          >
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-muted/20 text-xs">
            <div className="text-muted-foreground">
              Showing {pagination.total === 0 ? 0 : (page - 1) * limit + 1} to{' '}
              {Math.min(page * limit, pagination.total)} of {pagination.total} coupons
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="gap-1 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <span className="font-medium px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                className="gap-1 text-xs"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal for Create / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border rounded-lg max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-xl font-bold">
                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              {/* Basic Details */}
              <div>
                <label className="block font-medium mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER2026"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-md font-mono bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Discount Type *</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (৳)</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Discount Value *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={formData.discountType === 'free_shipping'}
                    placeholder={formData.discountType === 'free_shipping' ? '0' : 'Value'}
                    value={formData.discountType === 'free_shipping' ? '0' : formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none disabled:bg-muted"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Valid From *</label>
                  <input
                    type="date"
                    required
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Valid Until *</label>
                  <input
                    type="date"
                    required
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  />
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                <div>
                  <label className="block font-medium mb-0.5">Min Order Amount (৳)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Leave blank for no min order"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  />
                  <p className="text-[11px] text-muted-foreground mt-0.5">Leave blank for no minimum order restriction</p>
                </div>

                <div>
                  <label className="block font-medium mb-0.5">Max Discount Cap (৳)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Leave blank for unlimited"
                    value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  />
                  <p className="text-[11px] text-muted-foreground mt-0.5">Leave blank for unlimited maximum discount</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-0.5">Total Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Leave blank for unlimited uses"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  />
                  <p className="text-[11px] text-muted-foreground mt-0.5">Leave blank for unlimited global uses</p>
                </div>

                <div>
                  <label className="block font-medium mb-0.5">Limit Per Customer</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Leave blank for unlimited per customer"
                    value={formData.usagePerCustomer}
                    onChange={(e) => setFormData({ ...formData, usagePerCustomer: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  />
                  <p className="text-[11px] text-muted-foreground mt-0.5">Leave blank for unlimited uses per customer</p>
                </div>
              </div>

              {/* Applicable Scope Restrictions */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm flex items-center gap-1.5">
                    <Filter className="h-4 w-4 text-primary" /> Applicable Scope Restrictions
                  </span>
                  <span className="text-xs text-muted-foreground">Leave all unselected to apply to all products</span>
                </div>

                {/* Categories Scope */}
                <div className="border rounded-md p-3 space-y-2 bg-muted/20">
                  <label className="font-medium text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-blue-500" /> Applicable Categories ({formData.applicableCategories.length} selected)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {categories.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No categories available</span>
                    ) : (
                      categories.map(cat => {
                        const isSelected = formData.applicableCategories.includes(cat.id);
                        return (
                          <button
                            type="button"
                            key={cat.id}
                            onClick={() => toggleSelection('applicableCategories', cat.id)}
                            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 font-medium'
                                : 'bg-background hover:bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {cat.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Brands Scope */}
                <div className="border rounded-md p-3 space-y-2 bg-muted/20">
                  <label className="font-medium text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5 text-purple-500" /> Applicable Brands ({formData.applicableBrands.length} selected)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {brands.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No brands available</span>
                    ) : (
                      brands.map(brand => {
                        const isSelected = formData.applicableBrands.includes(brand.id);
                        return (
                          <button
                            type="button"
                            key={brand.id}
                            onClick={() => toggleSelection('applicableBrands', brand.id)}
                            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                              isSelected
                                ? 'bg-purple-600 text-white border-purple-600 font-medium'
                                : 'bg-background hover:bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {brand.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Products Scope */}
                <div className="border rounded-md p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <Package className="h-3.5 w-3.5 text-amber-500" /> Applicable Products ({formData.applicableProducts.length} selected)
                    </label>
                    <input
                      type="text"
                      placeholder="Search product..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="px-2 py-0.5 text-xs border rounded bg-background"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No products found</span>
                    ) : (
                      filteredProducts.map(prod => {
                        const isSelected = formData.applicableProducts.includes(prod.id);
                        return (
                          <button
                            type="button"
                            key={prod.id}
                            onClick={() => toggleSelection('applicableProducts', prod.id)}
                            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                              isSelected
                                ? 'bg-amber-600 text-white border-amber-600 font-medium'
                                : 'bg-background hover:bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {prod.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isActive" className="font-medium">Activate immediately</label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!couponToDelete}
        onOpenChange={(open) => !open && setCouponToDelete(null)}
        title="Delete Coupon"
        description={
          <>
            Are you sure you want to permanently delete coupon <strong>{couponToDelete?.code}</strong>? Any active carts using this code will no longer receive the discount.
          </>
        }
        confirmText="Delete Coupon"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => couponToDelete && deleteMutation.mutate(couponToDelete.id)}
      />
    </div>
  );
}
