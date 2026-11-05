import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bannerService, Banner } from '../../../services/banner.service';
import { Image, Plus, Trash2, Edit3, Power, CheckCircle2, XCircle, Link, Calendar } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { MediaUploaderInput } from '../../../components/admin/MediaUploaderInput';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { notify } from '../../../lib/notify';

export function BannersList() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bannerToDelete, setBannerToDelete] = useState<Banner | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    desktopImage: '',
    mobileImage: '',
    linkUrl: '',
    ctaText: 'Shop Now',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 1,
    isActive: true,
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: () => bannerService.getAll(),
  });

  const banners: Banner[] = response?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: Partial<Banner>) => bannerService.create(data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      setIsModalOpen(false);
      resetForm();
      notify.success('Banner Created', `Banner "${res?.title || formData.title}" created.`);
    },
    onError: (err) => notify.apiError(err, 'Failed to create banner.')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Banner> }) => bannerService.update(id, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      setIsModalOpen(false);
      setEditingBanner(null);
      resetForm();
      notify.success('Banner Updated', `Banner "${res?.title || 'Banner'}" updated.`);
    },
    onError: (err) => notify.apiError(err, 'Failed to update banner.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bannerService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      notify.success('Banner Deleted', `Banner "${bannerToDelete?.title || 'Banner'}" was deleted.`);
      setBannerToDelete(null);
    },
    onError: (err) => notify.apiError(err, 'Failed to delete banner.')
  });

  const resetForm = () => {
    setFormData({
      title: '',
      desktopImage: '',
      mobileImage: '',
      linkUrl: '',
      ctaText: 'Shop Now',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 1,
      isActive: true,
    });
  };

  const handleEdit = (b: Banner) => {
    setEditingBanner(b);
    setFormData({
      title: b.title,
      desktopImage: b.desktopImage,
      mobileImage: b.mobileImage || '',
      linkUrl: b.linkUrl || '',
      ctaText: b.ctaText || 'Shop Now',
      startDate: b.startDate ? new Date(b.startDate).toISOString().split('T')[0] : '',
      endDate: b.endDate ? new Date(b.endDate).toISOString().split('T')[0] : '',
      priority: b.priority || 1,
      isActive: b.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Image className="h-6 w-6 text-primary" /> Storefront Banners
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage homepage sliders, promotional banners, and mobile hero assets
          </p>
        </div>
        <Button onClick={() => { setEditingBanner(null); resetForm(); setIsModalOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Banner
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Banner Title & Image</th>
                <th className="px-4 py-3">CTA & Target Link</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading banners...
                  </td>
                </tr>
              ) : banners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No banners configured.
                  </td>
                </tr>
              ) : (
                banners.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium flex items-center gap-3">
                      <img 
                        src={b.desktopImage || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=200'} 
                        alt={b.title}
                        className="w-16 h-10 object-cover rounded border"
                      />
                      <div>
                        <div className="font-semibold text-foreground">{b.title}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-medium text-foreground">{b.ctaText || 'None'}</div>
                      <div className="text-muted-foreground truncate max-w-xs">{b.linkUrl || 'No link'}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{b.priority}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>{b.startDate ? new Date(b.startDate).toLocaleDateString() : 'Immediate'}</div>
                      <div>to {b.endDate ? new Date(b.endDate).toLocaleDateString() : 'Indefinite'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        b.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        {b.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(b)}>
                          <Edit3 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Delete Banner" onClick={() => setBannerToDelete(b)}>
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
            <h2 className="text-xl font-bold">{editingBanner ? 'Edit Banner' : 'Add Banner'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Banner Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Summer Mega Sale Header"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                />
              </div>

              <MediaUploaderInput
                label="Desktop Banner Image"
                value={formData.desktopImage}
                onChange={(url) => setFormData({ ...formData, desktopImage: url })}
                folder="cms/banners"
                placeholder="Upload or enter Desktop Banner Image URL"
              />

              <MediaUploaderInput
                label="Mobile Banner Image (Optional)"
                value={formData.mobileImage}
                onChange={(url) => setFormData({ ...formData, mobileImage: url })}
                folder="cms/banners"
                placeholder="Upload or enter Mobile Banner Image URL"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">CTA Button Text</label>
                  <input
                    type="text"
                    value={formData.ctaText}
                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Target Link URL</label>
                  <input
                    type="text"
                    placeholder="/category/summer"
                    value={formData.linkUrl}
                    onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1">Priority</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  />
                </div>
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
                  id="isActiveBanner"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isActiveBanner" className="font-medium">Activate Banner</label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit">{editingBanner ? 'Update Banner' : 'Create Banner'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!bannerToDelete}
        onOpenChange={(open) => !open && setBannerToDelete(null)}
        title="Delete Banner"
        description={
          <>
            Are you sure you want to delete banner <strong>{bannerToDelete?.title}</strong>?
          </>
        }
        confirmText="Delete Banner"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => bannerToDelete && deleteMutation.mutate(bannerToDelete.id)}
      />
    </div>
  );
}
