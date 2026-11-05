import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CmsPageForm } from './CmsPageForm';
import { pageService } from '../../../services/page.service';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { notify } from '../../../lib/notify';

export function CmsPageEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch page data
  const { data: page, isLoading, error } = useQuery({
    queryKey: ['cms-pages', id],
    queryFn: () => pageService.getPageById(id!),
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => pageService.updatePage(id!, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['cms-pages'] });
      queryClient.invalidateQueries({ queryKey: ['cms-pages', id] });
      notify.success('CMS Page Updated', `Page "${res?.title || 'CMS Page'}" updated successfully.`);
      navigate('/admin/cms');
    },
    onError: (error: any) => {
      notify.apiError(error, 'Failed to update CMS page.');
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Retrieving page details...</p>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <h3 className="text-xl font-bold text-destructive">Error Loading Page</h3>
        <p className="text-sm text-muted-foreground">The requested page could not be found or there was an issue connecting to the server.</p>
        <Button onClick={() => navigate('/admin/cms')} variant="outline">Back to Pages</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/cms')} id="back-to-list-btn">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" /> Edit CMS Page
          </h2>
          <p className="text-sm text-muted-foreground">Modify details, content, or publishing settings for this page.</p>
        </div>
      </div>

      <CmsPageForm
        initialData={page}
        onSubmit={(data) => mutation.mutate(data)}
        isLoading={mutation.isPending}
      />
    </div>
  );
}
