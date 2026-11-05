import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Badge } from '@/src/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/src/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Edit, Eye, Trash2, Archive } from 'lucide-react';
import { getProducts, deleteProduct } from '../services/product.service';
import { PermissionGuard } from '../components/layout/PermissionGuard';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { notify } from '../lib/notify';

export function Products() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: products = [], isLoading } = useQuery<any[]>({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      notify.success('Product Deleted', `"${productToDelete?.name || 'Product'}" has been permanently removed.`);
      setProductToDelete(null);
    },
    onError: (err) => {
      notify.apiError(err, 'Failed to delete product.');
    },
  });

  const handleConfirmDelete = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete.id);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading products...</div>;
  }

  const hasWrite = hasPermission('Products', 'write');
  const hasDelete = hasPermission('Products', 'delete');
  const showActions = hasWrite || hasDelete;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Products</h2>
        <PermissionGuard module="Products" action="write">
          <Button onClick={() => navigate('/products/new')}>
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </PermissionGuard>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" aria-label="Search products" placeholder="Search products..." className="pl-8" />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/admin/archive?entityType=products')}
                className="gap-1.5"
              >
                <Archive className="h-3.5 w-3.5 text-muted-foreground" /> Archived Products
              </Button>
              <Button variant="outline" size="sm">Filter</Button>
              <Button variant="outline" size="sm">Export</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                {showActions && (
                  <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showActions ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    No products found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const imageSrc = product.thumbnail ||
                    (typeof product.primaryImage === 'string' ? product.primaryImage : product.primaryImage?.imageUrl || product.primaryImage?.url) ||
                    product.images?.find((i: any) => i.isPrimary)?.imageUrl ||
                    product.images?.find((i: any) => i.isPrimary)?.url ||
                    product.images?.[0]?.imageUrl ||
                    product.images?.[0]?.url ||
                    product.ogImage;

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md border overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                            {imageSrc ? (
                              <img src={imageSrc} alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-xs text-muted-foreground">No img</span>
                            )}
                          </div>
                          <span className="truncate max-w-[200px] sm:max-w-[300px]">{product.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{product.sku || 'N/A'}</TableCell>
                      <TableCell>৳{product.price ? Number(product.price).toFixed(2) : '0.00'}</TableCell>
                      <TableCell>{product.inventory?.quantity || 0}</TableCell>
                      <TableCell>
                        <Badge variant={product.status === 'Active' ? 'success' : 'secondary'}>
                          {product.status || 'Draft'}
                        </Badge>
                      </TableCell>
                      {showActions && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Actions for ${product.name}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/products/${product.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              {hasWrite && (
                                <DropdownMenuItem onClick={() => navigate(`/products/${product.id}/edit`)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {hasDelete && (
                                <DropdownMenuItem 
                                  onClick={() => setProductToDelete({ id: product.id, name: product.name })}
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={!!productToDelete}
        onOpenChange={(open) => !open && setProductToDelete(null)}
        title="Delete Product"
        description={
          <>
            Are you sure you want to permanently delete <strong>{productToDelete?.name}</strong>? This action cannot be undone and will remove associated inventory records.
          </>
        }
        confirmText="Delete Product"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

