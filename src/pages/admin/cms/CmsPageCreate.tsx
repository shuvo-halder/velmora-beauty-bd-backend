import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CmsPageForm } from './CmsPageForm';
import { pageService } from '../../../services/page.service';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { notify } from '../../../lib/notify';

export function CmsPageCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: pageService.createPage,
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['cms-pages'] });
      notify.success('CMS Page Created', `Page "${res?.title || 'CMS Page'}" has been published.`);
      navigate('/admin/cms');
    },
    onError: (error: any) => {
      notify.apiError(error, 'Failed to create CMS page. Ensure the slug is unique.');
    }
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/cms')} id="back-to-list-btn">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" /> Create CMS Page
          </h2>
          <p className="text-sm text-muted-foreground">Add a new standard, policy, or landing page to the store.</p>
        </div>
      </div>
      
      <CmsPageForm onSubmit={(data) => mutation.mutate(data)} isLoading={mutation.isPending} />
    </div>
  );
}
