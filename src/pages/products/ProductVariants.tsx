import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { Input } from '@/src/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/src/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { getProductVariants, deleteVariant, createProductVariant, updateVariant } from '../../services/variant.service';
import { getAttributes } from '../../services/attribute.service';
import { api } from '../../lib/api';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { notify } from '../../lib/notify';

interface ProductVariantsProps {
  productId: string;
}

export function ProductVariants({ productId }: ProductVariantsProps) {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<any>(null);
  const [variantToDelete, setVariantToDelete] = useState<{ id: string; sku: string } | null>(null);
  
  const [formData, setFormData] = useState({
    sku: '',
    price: '',
    compareAtPrice: '',
    quantity: '',
    weight: '',
    barcode: '',
    image: '',
    isActive: true,
  });
  
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);

  const { data: attributes = [] } = useQuery({
    queryKey: ['attributes'],
    queryFn: getAttributes,
  });

  const { data: variants = [], isLoading } = useQuery({
    queryKey: ['productVariants', productId],
    queryFn: () => getProductVariants(productId),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createProductVariant(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productVariants', productId] });
      setIsFormOpen(false);
      resetForm();
      notify.success('Variant Created', 'Product variant has been created successfully.');
    },
    onError: (err: any) => notify.apiError(err, 'Failed to create variant.')
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateVariant(editingVariant.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productVariants', productId] });
      setIsFormOpen(false);
      setEditingVariant(null);
      resetForm();
      notify.success('Variant Updated', 'Product variant details have been updated.');
    },
    onError: (err: any) => notify.apiError(err, 'Failed to update variant.')
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVariant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productVariants', productId] });
      notify.success('Variant Deleted', `Variant ${variantToDelete?.sku || ''} was deleted.`);
      setVariantToDelete(null);
    },
    onError: (err: any) => notify.apiError(err, 'Failed to delete variant.')
  });

  const resetForm = () => {
    setFormData({
      sku: '',
      price: '',
      compareAtPrice: '',
      quantity: '',
      weight: '',
      barcode: '',
      image: '',
      isActive: true,
    });
    setSelectedAttributes([]);
    setEditingVariant(null);
  };

  const handleEdit = (variant: any) => {
    setEditingVariant(variant);
    setFormData({
      sku: variant.sku || '',
      price: variant.price || '',
      compareAtPrice: variant.compareAtPrice || '',
      quantity: variant.inventories?.[0]?.quantityAvailable || '',
      weight: variant.weight || '',
      barcode: variant.barcode || '',
      image: variant.images?.[0]?.url || '',
      isActive: variant.isActive,
    });
    setSelectedAttributes(variant.attributes?.map((a: any) => a.attributeValueId) || []);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      price: formData.price ? parseFloat(formData.price) : undefined,
      compareAtPrice: formData.compareAtPrice ? parseFloat(formData.compareAtPrice) : undefined,
      quantity: formData.quantity ? parseInt(formData.quantity) : undefined,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      attributes: selectedAttributes,
    };
    
    if (editingVariant) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isLoading) return <LoadingSpinner message="Loading variants..." />;

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-xl">Product Variants</CardTitle>
        <Button onClick={() => { resetForm(); setIsFormOpen(true); }} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Add Variant
        </Button>
      </CardHeader>
      <CardContent>
        {isFormOpen && (
          <div className="mb-8 p-4 border rounded-md bg-muted/50">
            <h3 className="text-lg font-medium mb-4">{editingVariant ? 'Edit Variant' : 'New Variant'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">SKU</label>
                  <Input 
                    value={formData.sku} 
                    onChange={e => setFormData({...formData, sku: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price</label>
                  <Input 
                    type="number" step="0.01" 
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sale Price</label>
                  <Input 
                    type="number" step="0.01" 
                    value={formData.compareAtPrice} 
                    onChange={e => setFormData({...formData, compareAtPrice: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input 
                    type="number" 
                    value={formData.quantity} 
                    onChange={e => setFormData({...formData, quantity: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Barcode</label>
                  <Input 
                    value={formData.barcode} 
                    onChange={e => setFormData({...formData, barcode: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Weight</label>
                  <Input 
                    type="number" step="0.01" 
                    value={formData.weight} 
                    onChange={e => setFormData({...formData, weight: e.target.value})} 
                  />
                </div>
                <div className="space-y-2 lg:col-span-3">
                  <label className="text-sm font-medium">Image URL</label>
                  <Input 
                    value={formData.image} 
                    onChange={e => setFormData({...formData, image: e.target.value})} 
                  />
                </div>
                <div className="space-y-2 flex items-center h-full pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.isActive} 
                      onChange={e => setFormData({...formData, isActive: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium">Active</span>
                  </label>
                </div>
              </div>

              {attributes.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Attributes</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {attributes.map((attr: any) => (
                      <div key={attr.id} className="space-y-2">
                        <label className="text-sm text-muted-foreground">{attr.name}</label>
                        <select
                          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          onChange={(e) => {
                            const newSelected = selectedAttributes.filter(
                              id => !attr.values.some((v: any) => v.id === id)
                            );
                            if (e.target.value) {
                              newSelected.push(e.target.value);
                            }
                            setSelectedAttributes(newSelected);
                          }}
                          value={
                            attr.values.find((v: any) => selectedAttributes.includes(v.id))?.id || ""
                          }
                        >
                          <option value="">None</option>
                          {attr.values.map((val: any) => (
                            <option key={val.id} value={val.id}>{val.value}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingVariant ? 'Update Variant' : 'Create Variant'}
                </Button>
              </div>
            </form>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No variants found. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              variants.map((variant: any) => (
                <TableRow key={variant.id}>
                  <TableCell>
                    {variant.images?.[0]?.url ? (
                      <img src={variant.images[0].url} alt={variant.sku} className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">NA</div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {variant.sku}
                    <div className="text-xs text-muted-foreground mt-1">
                      {variant.attributes?.map((a: any) => a.attributeValue.value).join(' • ')}
                    </div>
                  </TableCell>
                  <TableCell>
                    ৳{Number(variant.price).toFixed(2)}
                    {variant.compareAtPrice && (
                      <span className="text-muted-foreground line-through ml-2 text-xs">
                        ৳{Number(variant.compareAtPrice).toFixed(2)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{variant.inventories?.[0]?.quantityAvailable || 0}</TableCell>
                  <TableCell>
                    <Badge variant={variant.isActive ? 'success' : 'secondary'}>
                      {variant.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(variant)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setVariantToDelete({ id: variant.id, sku: variant.sku })}
                          className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <ConfirmDialog
        isOpen={!!variantToDelete}
        onOpenChange={(open) => !open && setVariantToDelete(null)}
        title="Delete Product Variant"
        description={
          <>
            Are you sure you want to delete variant <strong>{variantToDelete?.sku}</strong>? This will permanently remove its inventory records.
          </>
        }
        confirmText="Delete Variant"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => variantToDelete && deleteMutation.mutate(variantToDelete.id)}
      />
    </Card>
  );
}
