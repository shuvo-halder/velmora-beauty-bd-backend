import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BlogPostForm } from './BlogPostForm';
import { blogService } from '../../../services/blog.service';
import { ArrowLeft, PenTool, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { notify } from '../../../lib/notify';

export function BlogPostEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch blog post details
  const { data: post, isLoading, error } = useQuery({
    queryKey: ['blog-posts', id],
    queryFn: () => blogService.getPostById(id!),
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => blogService.updatePost(id!, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      queryClient.invalidateQueries({ queryKey: ['blog-posts', id] });
      notify.success('Blog Post Updated', `Post "${res?.title || 'Blog Post'}" updated successfully.`);
      navigate('/admin/blog');
    },
    onError: (error: any) => {
      notify.apiError(error, 'Failed to update blog post.');
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Retrieving article details...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <h3 className="text-xl font-bold text-destructive">Error Loading Post</h3>
        <p className="text-sm text-muted-foreground">The requested blog post could not be found or there was an issue connecting to the server.</p>
        <Button onClick={() => navigate('/admin/blog')} variant="outline">Back to Articles</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/blog')} id="back-to-list-btn">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <PenTool className="h-8 w-8 text-primary" /> Edit Blog Post
          </h2>
          <p className="text-sm text-muted-foreground">Modify details, content, category, or publishing state of this article.</p>
        </div>
      </div>

      <BlogPostForm
        initialData={post}
        onSubmit={(data) => mutation.mutate(data)}
        isLoading={mutation.isPending}
      />
    </div>
  );
}
