import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CategoryForm } from './CategoryForm';
import { getCategoryById, updateCategory } from '../../services/category.service';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { notify } from '@/src/lib/notify';

export function CategoryEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: category, isLoading } = useQuery({
    queryKey: ['category', id],
    queryFn: () => getCategoryById(id!),
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => updateCategory(id!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category', id] });
      notify.success('Category Updated', `Changes to "${data?.name || category?.name || 'Category'}" were saved successfully.`);
      navigate('/categories');
    },
    onError: (error: any) => {
      notify.apiError(error, 'Failed to update category. Please verify the input.');
    }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading category details...</div>;
  }

  if (!category) {
    return <div className="p-8 text-center text-destructive">Category not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/categories')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Edit Category</h2>
      </div>
      
      <CategoryForm initialData={category} onSubmit={(data) => mutation.mutate(data)} isLoading={mutation.isPending} />
    </div>
  );
}

