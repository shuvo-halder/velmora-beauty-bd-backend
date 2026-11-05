import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductForm } from './ProductForm';
import { createProduct } from '../../services/product.service';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { notify } from '@/src/lib/notify';

export function ProductCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      notify.success('Product Created', `"${data.name || 'Product'}" was successfully added to your catalog.`);
      navigate('/products');
    },
    onError: (error) => {
      notify.apiError(error, 'Failed to create product. Please verify the fields.');
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/products')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Create Product</h2>
      </div>
      <ProductForm onSubmit={(data) => mutation.mutate(data)} isLoading={mutation.isPending} />
    </div>
  );
}

