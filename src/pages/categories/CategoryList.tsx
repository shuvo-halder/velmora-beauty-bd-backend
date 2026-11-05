import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/src/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Edit, Trash2, FolderTree, Folder } from 'lucide-react';
import { getCategories, deleteCategory } from '../../services/category.service';
import { PermissionGuard } from '../../components/layout/PermissionGuard';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { notify } from '../../lib/notify';

export function CategoryList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);
  
  // Fetch as tree for hierarchical display
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => getCategories(true),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      notify.success('Category Deleted', `"${categoryToDelete?.name || 'Category'}" and subcategories were removed.`);
      setCategoryToDelete(null);
    },
    onError: (err: any) => {
      notify.apiError(err, 'Failed to delete category.');
    }
  });

  const handleConfirmDelete = () => {
    if (categoryToDelete) {
      deleteMutation.mutate(categoryToDelete.id);
    }
  };

  const hasWrite = hasPermission('Categories', 'write');
  const hasDelete = hasPermission('Categories', 'delete');
  const showActions = hasWrite || hasDelete;

  const renderCategoryRows = (cats: any[], level = 0) => {
    return cats.map((category) => (
      <React.Fragment key={category.id}>
        <TableRow>
          <TableCell className="font-medium">
            <div className="flex items-center" style={{ paddingLeft: `${level * 24}px` }}>
              {category.children && category.children.length > 0 ? (
                <FolderTree className="h-4 w-4 mr-2 text-primary" />
              ) : (
                <Folder className="h-4 w-4 mr-2 text-muted-foreground" />
              )}
              {category.name}
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground">{category.slug}</TableCell>
          <TableCell>{category.sortOrder}</TableCell>
          <TableCell>
            <Badge variant={category.isActive ? 'success' : 'secondary'}>
              {category.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </TableCell>
          <TableCell>
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Actions for ${category.name}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {hasWrite && (
                    <DropdownMenuItem onClick={() => navigate(`/categories/${category.id}/edit`)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {hasDelete && (
                    <DropdownMenuItem 
                      onClick={() => setCategoryToDelete({ id: category.id, name: category.name })}
                      className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </TableCell>
        </TableRow>
        {category.children && category.children.length > 0 && renderCategoryRows(category.children, level + 1)}
      </React.Fragment>
    ));
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading categories...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Categories</h2>
        <PermissionGuard module="Categories" action="write">
          <Button onClick={() => navigate('/categories/new')}>
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        </PermissionGuard>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="text-sm text-muted-foreground">Manage your product categories. Categories support infinite nesting.</div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Status</TableHead>
                {showActions && (
                  <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showActions ? 5 : 4} className="text-center py-8 text-muted-foreground">
                    No categories found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                renderCategoryRows(categories)
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
        title="Delete Category"
        description={
          <>
            Are you sure you want to delete category <strong>{categoryToDelete?.name}</strong>? Any nested subcategories and product assignments will be affected.
          </>
        }
        confirmText="Delete Category"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

