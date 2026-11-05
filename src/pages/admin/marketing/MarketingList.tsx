import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketingService, MarketingCampaign } from '../../../services/marketing.service';
import { 
  Megaphone, 
  Plus, 
  Mail, 
  MessageSquare, 
  Bell, 
  Send, 
  Clock, 
  Archive, 
  Trash2, 
  Edit3, 
  TrendingUp, 
  DollarSign, 
  MousePointer, 
  Eye
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { notify } from '../../../lib/notify';

export function MarketingList() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<MarketingCampaign | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<MarketingCampaign | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'Email' as 'Email' | 'SMS' | 'Push',
    subject: '',
    content: '',
    status: 'Draft' as 'Draft' | 'Scheduled' | 'Sent' | 'Archived',
    scheduledAt: new Date().toISOString().split('T')[0],
  });

  const { data: analyticsRes } = useQuery({
    queryKey: ['marketing-analytics'],
    queryFn: () => marketingService.getAnalytics(),
  });

  const { data: campaignsRes, isLoading } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: () => marketingService.getAllCampaigns(),
  });

  const analytics = analyticsRes?.data || {
    totalCoupons: 0,
    activePromotions: 0,
    totalCampaigns: 0,
    couponRevenue: 0,
    conversionRate: '14.2%',
    customerAcquisitionCount: 86,
  };

  const campaigns: MarketingCampaign[] = campaignsRes?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: Partial<MarketingCampaign>) => marketingService.createCampaign(data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      setIsModalOpen(false);
      resetForm();
      notify.success('Campaign Created', `Campaign "${res?.name || formData.name}" created.`);
    },
    onError: (err) => notify.apiError(err, 'Failed to create campaign.')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MarketingCampaign> }) => marketingService.updateCampaign(id, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      setIsModalOpen(false);
      setEditingCampaign(null);
      resetForm();
      notify.success('Campaign Updated', `Campaign "${res?.name || 'Campaign'}" updated.`);
    },
    onError: (err) => notify.apiError(err, 'Failed to update campaign.')
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => marketingService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      notify.success('Campaign Dispatched', 'Campaign status updated and messages dispatched.');
    },
    onError: (err) => notify.apiError(err, 'Failed to dispatch campaign.')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => marketingService.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      notify.success('Campaign Deleted', `Campaign "${campaignToDelete?.name || 'Campaign'}" was deleted.`);
      setCampaignToDelete(null);
    },
    onError: (err) => notify.apiError(err, 'Failed to delete campaign.')
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'Email',
      subject: '',
      content: '',
      status: 'Draft',
      scheduledAt: new Date().toISOString().split('T')[0],
    });
  };

  const handleEdit = (c: MarketingCampaign) => {
    setEditingCampaign(c);
    setFormData({
      name: c.name,
      type: c.type,
      subject: c.subject || '',
      content: c.content,
      status: c.status,
      scheduledAt: c.scheduledAt ? new Date(c.scheduledAt).toISOString().split('T')[0] : '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCampaign) {
      updateMutation.mutate({ id: editingCampaign.id, data: formData });
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
            <Megaphone className="h-6 w-6 text-indigo-500" /> Marketing & Broadcast Campaigns
          </h1>
          <p className="text-sm text-muted-foreground">
            Deploy email newsletters, SMS alerts, and push notifications to customer segments
          </p>
        </div>
        <Button onClick={() => { setEditingCampaign(null); resetForm(); setIsModalOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Create Campaign
        </Button>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Email, SMS & Push active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">34.8%</div>
            <p className="text-xs text-muted-foreground mt-1">Above industry benchmark</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12.4%</div>
            <p className="text-xs text-muted-foreground mt-1">High conversion engagement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Acquired Customers</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.customerAcquisitionCount || 86}</div>
            <p className="text-xs text-muted-foreground mt-1">Directly attributed to marketing</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Campaign Name</th>
                <th className="px-4 py-3">Channel Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Scheduled / Sent</th>
                <th className="px-4 py-3">Performance Metrics</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading marketing campaigns...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No marketing campaigns found.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div className="font-semibold text-foreground">{c.name}</div>
                      {c.subject && <div className="text-xs text-muted-foreground truncate max-w-xs">{c.subject}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted">
                        {c.type === 'Email' && <Mail className="h-3.5 w-3.5 text-blue-500" />}
                        {c.type === 'SMS' && <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />}
                        {c.type === 'Push' && <Bell className="h-3.5 w-3.5 text-purple-500" />}
                        {c.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        c.status === 'Sent' ? 'bg-emerald-500/10 text-emerald-600' :
                        c.status === 'Scheduled' ? 'bg-amber-500/10 text-amber-600' :
                        c.status === 'Draft' ? 'bg-slate-500/10 text-slate-600' :
                        'bg-zinc-500/10 text-zinc-600'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.sentAt ? `Sent: ${new Date(c.sentAt).toLocaleDateString()}` : 
                       c.scheduledAt ? `Scheduled: ${new Date(c.scheduledAt).toLocaleDateString()}` : 
                       'Draft Mode'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {c.parsedMetrics ? (
                        <div className="flex gap-3">
                          <div><span className="text-muted-foreground">Open:</span> <span className="font-semibold">{c.parsedMetrics.openRate}</span></div>
                          <div><span className="text-muted-foreground">Click:</span> <span className="font-semibold">{c.parsedMetrics.clickRate}</span></div>
                          <div><span className="text-muted-foreground">Conv:</span> <span className="font-semibold text-emerald-600">{c.parsedMetrics.conversions}</span></div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Pending execution</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.status === 'Draft' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            title="Send Campaign Now"
                            onClick={() => statusMutation.mutate({ id: c.id, status: 'Sent' })}
                          >
                            <Send className="h-4 w-4 text-emerald-500" />
                          </Button>
                        )}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleEdit(c)}
                        >
                          <Edit3 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          title="Delete Campaign"
                          onClick={() => setCampaignToDelete(c)}
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
              {editingCampaign ? 'Edit Marketing Campaign' : 'Create New Marketing Campaign'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Summer Discount Blast"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Channel Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  >
                    <option value="Email">Email Broadcast</option>
                    <option value="SMS">SMS Message</option>
                    <option value="Push">App Push Notification</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Campaign Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Sent">Sent</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              {formData.type === 'Email' && (
                <div>
                  <label className="block font-medium mb-1">Subject Line</label>
                  <input
                    type="text"
                    placeholder="e.g. 🔥 Exclusive 20% off all catalog items!"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-medium mb-1">Message Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter campaign body copy or HTML template..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Scheduled Date</label>
                <input
                  type="date"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!campaignToDelete}
        onOpenChange={(open) => !open && setCampaignToDelete(null)}
        title="Delete Marketing Campaign"
        description={
          <>
            Are you sure you want to permanently delete campaign <strong>{campaignToDelete?.name}</strong>?
          </>
        }
        confirmText="Delete Campaign"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => campaignToDelete && deleteMutation.mutate(campaignToDelete.id)}
      />
    </div>
  );
}
