import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CategoryForm } from './CategoryForm';
import { createCategory } from '../../services/category.service';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { notify } from '@/src/lib/notify';

export function CategoryCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createCategory,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      notify.success('Category Created', `"${data?.name || 'Category'}" was created successfully.`);
      navigate('/categories');
    },
    onError: (error: any) => {
      notify.apiError(error, 'Failed to create category. Ensure the slug is unique.');
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/categories')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Create Category</h2>
      </div>
      
      <CategoryForm onSubmit={(data) => mutation.mutate(data)} isLoading={mutation.isPending} />
    </div>
  );
}

