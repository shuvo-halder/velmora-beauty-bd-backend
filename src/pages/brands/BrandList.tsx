import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/src/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { getBrands, deleteBrand } from '../../services/brand.service';
import { PermissionGuard } from '../../components/layout/PermissionGuard';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { notify } from '../../lib/notify';

export function BrandList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [brandToDelete, setBrandToDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: getBrands,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      notify.success('Brand Deleted', `"${brandToDelete?.name || 'Brand'}" was deleted.`);
      setBrandToDelete(null);
    },
    onError: (err: any) => {
      notify.apiError(err, 'Failed to delete brand.');
    }
  });

  const handleConfirmDelete = () => {
    if (brandToDelete) {
      deleteMutation.mutate(brandToDelete.id);
    }
  };

  const hasWrite = hasPermission('Brands', 'write');
  const hasDelete = hasPermission('Brands', 'delete');
  const showActions = hasWrite || hasDelete;

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading brands...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Brands</h2>
        <PermissionGuard module="Brands" action="write">
          <Button onClick={() => navigate('/brands/new')}>
            <Plus className="mr-2 h-4 w-4" /> Add Brand
          </Button>
        </PermissionGuard>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="text-sm text-muted-foreground">Manage product brands and manufacturers.</div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Status</TableHead>
                {showActions && (
                  <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showActions ? 5 : 4} className="text-center py-8 text-muted-foreground">
                    No brands found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                brands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium flex items-center gap-3">
                      {brand.logoUrl ? (
                        <img src={brand.logoUrl} alt={brand.name} className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">NA</div>
                      )}
                      {brand.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{brand.slug}</TableCell>
                    <TableCell>
                      {brand.website ? (
                        <a href={brand.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          Link
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={brand.isActive ? 'success' : 'secondary'}>
                        {brand.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    {showActions && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Actions for ${brand.name}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {hasWrite && (
                              <DropdownMenuItem onClick={() => navigate(`/brands/${brand.id}/edit`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {hasDelete && (
                              <DropdownMenuItem 
                                onClick={() => setBrandToDelete({ id: brand.id, name: brand.name })}
                                className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={!!brandToDelete}
        onOpenChange={(open) => !open && setBrandToDelete(null)}
        title="Delete Brand"
        description={
          <>
            Are you sure you want to delete brand <strong>{brandToDelete?.name}</strong>? Any associated product links will be unassigned.
          </>
        }
        confirmText="Delete Brand"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}


