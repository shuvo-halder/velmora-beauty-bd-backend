import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductForm } from './ProductForm';
import { getProductById, updateProduct } from '../../services/product.service';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { notify } from '@/src/lib/notify';

export function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProductById(id!),
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => updateProduct(id!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      notify.success('Product Updated', `Changes to "${data?.name || product?.name || 'Product'}" were saved successfully.`);
      navigate('/products');
    },
    onError: (error) => {
      notify.apiError(error, 'Failed to update product. Please verify the changes.');
    }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading product details...</div>;
  }

  if (!product) {
    return <div className="p-8 text-center text-destructive">Product not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/products')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Edit Product</h2>
      </div>
      <ProductForm initialData={product} onSubmit={(data) => mutation.mutate(data)} isLoading={mutation.isPending} />
    </div>
  );
}

