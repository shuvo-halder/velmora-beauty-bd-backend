import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionService, Promotion } from '../../../services/promotion.service';
import { 
  Zap, 
  Plus, 
  Power, 
  Trash2, 
  Edit3, 
  Sliders, 
  BarChart3, 
  CheckCircle2, 
  XCircle,
  ShoppingBag,
  Tag,
  Layers
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { notify } from '../../../lib/notify';

export function PromotionsList() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [promoToDelete, setPromoToDelete] = useState<Promotion | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'cart_discount' as 'buy_x_get_y' | 'category_discount' | 'brand_discount' | 'cart_discount' | 'bundle_discount',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 15,
    priority: 1,
    isStackable: false,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => promotionService.getAll(),
  });

  const promotions: Promotion[] = response?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: Partial<Promotion>) => promotionService.create(data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      setIsModalOpen(false);
      resetForm();
      notify.success('Promotion Created', `Promotion "${res?.name || formData.name}" created.`);
    },
    onError: (err) => notify.apiError(err, 'Failed to create promotion.')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Promotion> }) => promotionService.update(id, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      setIsModalOpen(false);
      setEditingPromo(null);
      resetForm();
      notify.success('Promotion Updated', `Promotion "${res?.name || 'Promotion'}" updated.`);
    },
    onError: (err) => notify.apiError(err, 'Failed to update promotion.')
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => promotionService.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      notify.success('Status Updated', 'Promotion rule state updated.');
    },
    onError: (err) => notify.apiError(err, 'Failed to toggle promotion.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => promotionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      notify.success('Promotion Deleted', `Promotion "${promoToDelete?.name || 'Promotion'}" was deleted.`);
      setPromoToDelete(null);
    },
    onError: (err) => notify.apiError(err, 'Failed to delete promotion.')
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'cart_discount',
      discountType: 'percentage',
      discountValue: 15,
      priority: 1,
      isStackable: false,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true,
    });
  };

  const handleEdit = (promo: Promotion) => {
    setEditingPromo(promo);
    setFormData({
      name: promo.name,
      type: promo.type,
      discountType: promo.discountType || 'percentage',
      discountValue: promo.discountValue || 0,
      priority: promo.priority || 1,
      isStackable: promo.isStackable,
      startDate: promo.startDate ? new Date(promo.startDate).toISOString().split('T')[0] : '',
      endDate: promo.endDate ? new Date(promo.endDate).toISOString().split('T')[0] : '',
      isActive: promo.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPromo) {
      updateMutation.mutate({ id: editingPromo.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" /> Automatic Promotion Engine
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure automated cart discounts, category offers, BOGO rules, and priority stacking
          </p>
        </div>
        <Button onClick={() => { setEditingPromo(null); resetForm(); setIsModalOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Create Promotion
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Rules</CardTitle>
            <Zap className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promotions.filter(p => p.isActive).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Evaluated in real-time at checkout</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Impact</CardTitle>
            <BarChart3 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳12,850.00</div>
            <p className="text-xs text-muted-foreground mt-1">Generated by automatic rules this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orders Generated</CardTitle>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-muted-foreground mt-1">Orders with automated discount applied</p>
          </CardContent>
        </Card>
      </div>

      {/* Promotions List Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Promotion Name</th>
                <th className="px-4 py-3">Rule Type</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Priority & Stack</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading promotions...
                  </td>
                </tr>
              ) : promotions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    No automatic promotions configured yet.
                  </td>
                </tr>
              ) : (
                promotions.map((promo) => (
                  <tr key={promo.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div className="font-semibold text-foreground">{promo.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted capitalize">
                        {promo.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">
                      {promo.discountType === 'percentage' ? `${promo.discountValue}%` : `৳${promo.discountValue}`}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>Priority: <span className="font-bold text-foreground">{promo.priority}</span></div>
                      <div>{promo.isStackable ? 'Stackable' : 'Non-stackable'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>{promo.startDate ? new Date(promo.startDate).toLocaleDateString() : 'Immediate'}</div>
                      <div>to {promo.endDate ? new Date(promo.endDate).toLocaleDateString() : 'Indefinite'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        promo.isActive 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}>
                        {promo.isActive ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {promo.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => toggleMutation.mutate(promo.id)}
                        >
                          <Power className={`h-4 w-4 ${promo.isActive ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleEdit(promo)}
                        >
                          <Edit3 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          title="Delete Promotion"
                          onClick={() => setPromoToDelete(promo)}
                        >
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border rounded-lg max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold">
              {editingPromo ? 'Edit Promotion' : 'Create New Promotion'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Promotion Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Storewide Summer Sale"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Promotion Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                >
                  <option value="cart_discount">Cart Discount (Threshold)</option>
                  <option value="buy_x_get_y">Buy X Get Y (BOGO)</option>
                  <option value="category_discount">Category Discount</option>
                  <option value="brand_discount">Brand Discount</option>
                  <option value="bundle_discount">Bundle Discount</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Discount Type</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Value</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Priority (Higher = Evaluated First)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isStackable"
                    checked={formData.isStackable}
                    onChange={(e) => setFormData({ ...formData, isStackable: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="isStackable" className="font-medium">Can stack with other rules</label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActivePromo"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isActivePromo" className="font-medium">Enable Rule Immediately</label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingPromo ? 'Update Promotion' : 'Create Promotion'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!promoToDelete}
        onOpenChange={(open) => !open && setPromoToDelete(null)}
        title="Delete Promotion"
        description={
          <>
            Are you sure you want to delete promotion rule <strong>{promoToDelete?.name}</strong>?
          </>
        }
        confirmText="Delete Promotion"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => promoToDelete && deleteMutation.mutate(promoToDelete.id)}
      />
    </div>
  );
}
