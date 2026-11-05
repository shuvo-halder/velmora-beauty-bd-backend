import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { popupService, Popup } from '../../../services/popup.service';
import { Layers, Plus, Trash2, Edit3, Power, CheckCircle2, XCircle, Clock, Tag } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { MediaUploaderInput } from '../../../components/admin/MediaUploaderInput';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { notify } from '../../../lib/notify';

export function PopupsList() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null);
  const [popupToDelete, setPopupToDelete] = useState<Popup | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    type: 'homepage' as 'exit_intent' | 'homepage' | 'product' | 'coupon',
    headline: '',
    body: '',
    couponCode: '',
    imageUrl: '',
    delaySeconds: 3,
    isActive: true,
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['popups'],
    queryFn: () => popupService.getAll(),
  });

  const popups: Popup[] = response?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: Partial<Popup>) => popupService.create(data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['popups'] });
      setIsModalOpen(false);
      resetForm();
      notify.success('Popup Created', `Popup "${res?.title || formData.title}" created.`);
    },
    onError: (err) => notify.apiError(err, 'Failed to create popup.')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Popup> }) => popupService.update(id, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['popups'] });
      setIsModalOpen(false);
      setEditingPopup(null);
      resetForm();
      notify.success('Popup Updated', `Popup "${res?.title || 'Popup'}" updated.`);
    },
    onError: (err) => notify.apiError(err, 'Failed to update popup.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => popupService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popups'] });
      notify.success('Popup Deleted', `Popup "${popupToDelete?.title || 'Popup'}" was deleted.`);
      setPopupToDelete(null);
    },
    onError: (err) => notify.apiError(err, 'Failed to delete popup.')
  });

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'homepage',
      headline: '',
      body: '',
      couponCode: '',
      imageUrl: '',
      delaySeconds: 3,
      isActive: true,
    });
  };

  const handleEdit = (p: Popup) => {
    setEditingPopup(p);
    setFormData({
      title: p.title,
      type: p.type,
      headline: p.headline || '',
      body: p.body || '',
      couponCode: p.couponCode || '',
      imageUrl: p.imageUrl || '',
      delaySeconds: p.delaySeconds || 0,
      isActive: p.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPopup) {
      updateMutation.mutate({ id: editingPopup.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-purple-500" /> Popups & Overlays
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure exit-intent modals, newsletter signup overlays, and product coupons
          </p>
        </div>
        <Button onClick={() => { setEditingPopup(null); resetForm(); setIsModalOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Create Popup
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Title & Headline</th>
                <th className="px-4 py-3">Popup Trigger Type</th>
                <th className="px-4 py-3">Linked Coupon</th>
                <th className="px-4 py-3">Delay</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading popups...
                  </td>
                </tr>
              ) : popups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No popups configured.
                  </td>
                </tr>
              ) : (
                popups.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div className="font-semibold text-foreground">{p.title}</div>
                      <div className="text-xs text-muted-foreground">{p.headline || 'No headline'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-muted capitalize">
                        {p.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-primary">
                      {p.couponCode || 'None'}
                    </td>
                    <td className="px-4 py-3 text-xs">{p.delaySeconds}s</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        p.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(p)}>
                          <Edit3 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Delete Popup" onClick={() => setPopupToDelete(p)}>
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
            <h2 className="text-xl font-bold">{editingPopup ? 'Edit Popup' : 'Create Popup'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Popup Internal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Exit Intent Newsletter Offer"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Trigger Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  >
                    <option value="exit_intent">Exit Intent</option>
                    <option value="homepage">Homepage Popup</option>
                    <option value="product">Product Page Popup</option>
                    <option value="coupon">Coupon Claim Popup</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Delay (Seconds)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.delaySeconds}
                    onChange={(e) => setFormData({ ...formData, delaySeconds: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Display Headline</label>
                <input
                  type="text"
                  placeholder="e.g. Wait! Don't leave empty handed"
                  value={formData.headline}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Popup Body Text</label>
                <textarea
                  rows={3}
                  placeholder="Get 15% off your first order when you subscribe..."
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Linked Coupon Code</label>
                  <input
                    type="text"
                    placeholder="e.g. WELCOME15"
                    value={formData.couponCode}
                    onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-md font-mono bg-background focus:outline-none"
                  />
                </div>

              <MediaUploaderInput
                label="Popup Image (Optional)"
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                folder="cms/popups"
                placeholder="Upload or enter Popup Image URL"
              />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActivePopup"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isActivePopup" className="font-medium">Activate Overlay Popup</label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit">{editingPopup ? 'Update Popup' : 'Create Popup'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!popupToDelete}
        onOpenChange={(open) => !open && setPopupToDelete(null)}
        title="Delete Popup"
        description={
          <>
            Are you sure you want to delete popup overlay <strong>{popupToDelete?.title}</strong>?
          </>
        }
        confirmText="Delete Popup"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => popupToDelete && deleteMutation.mutate(popupToDelete.id)}
      />
    </div>
  );
}
