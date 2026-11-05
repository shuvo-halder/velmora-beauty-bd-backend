import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BrandForm } from './BrandForm';
import { getBrandById, updateBrand } from '../../services/brand.service';
 import { ArrowLeft } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { notify } from '@/src/lib/notify';

export function BrandEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: brand, isLoading } = useQuery({
    queryKey: ['brand', id],
    queryFn: () => getBrandById(id!),
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => updateBrand(id!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['brand', id] });
      notify.success('Brand Updated', `Changes to "${data?.name || brand?.name || 'Brand'}" were saved successfully.`);
      navigate('/brands');
    },
    onError: (error: any) => {
      notify.apiError(error, 'Failed to update brand.');
    }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading brand details...</div>;
  }

  if (!brand) {
    return <div className="p-8 text-center text-destructive">Brand not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/brands')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Edit Brand</h2>
      </div>
      
      <BrandForm initialData={brand} onSubmit={(data) => mutation.mutate(data)} isLoading={mutation.isPending} />
    </div>
  );
}

