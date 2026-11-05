import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BlogPostForm } from './BlogPostForm';
import { blogService } from '../../../services/blog.service';
import { ArrowLeft, PenTool } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { notify } from '../../../lib/notify';

export function BlogPostCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: blogService.createPost,
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      notify.success('Blog Post Created', `Post "${res?.title || 'Blog Post'}" has been published.`);
      navigate('/admin/blog');
    },
    onError: (error: any) => {
      notify.apiError(error, 'Failed to create blog post. Ensure the slug is unique.');
    }
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/blog')} id="back-to-list-btn">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <PenTool className="h-8 w-8 text-primary" /> Create Blog Post
          </h2>
          <p className="text-sm text-muted-foreground">Add a new article, story, or update to your blog feed.</p>
        </div>
      </div>
      
      <BlogPostForm onSubmit={(data) => mutation.mutate(data)} isLoading={mutation.isPending} />
    </div>
  );
}
