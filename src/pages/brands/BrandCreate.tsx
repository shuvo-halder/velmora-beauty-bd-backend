import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BrandForm } from './BrandForm';
import { createBrand } from '../../services/brand.service';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { notify } from '@/src/lib/notify';

export function BrandCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createBrand,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      notify.success('Brand Created', `"${data?.name || 'Brand'}" was added to manufacturers.`);
      navigate('/brands');
    },
    onError: (error: any) => {
      notify.apiError(error, 'Failed to create brand.');
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/brands')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Create Brand</h2>
      </div>
      
      <BrandForm onSubmit={(data) => mutation.mutate(data)} isLoading={mutation.isPending} />
    </div>
  );
}

