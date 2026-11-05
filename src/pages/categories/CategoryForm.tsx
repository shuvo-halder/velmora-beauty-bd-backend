import React, { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Card, CardContent } from '@/src/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { getCategories } from '../../services/category.service';
import { MediaUploaderInput } from '../../components/admin/MediaUploaderInput';
import { RichTextEditor } from '@/src/components/ui/RichTextEditor';

interface CategoryFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export function CategoryForm({ initialData, onSubmit, isLoading }: CategoryFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    image: initialData?.image || '',
    icon: initialData?.icon || '',
    parentId: initialData?.parentId || '',
    sortOrder: initialData?.sortOrder || 0,
    isActive: initialData?.isActive === false ? false : true,
    seoTitle: initialData?.seoTitle || '',
    seoDescription: initialData?.seoDescription || '',
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input name="name" value={formData.name} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Parent Category</label>
              <select 
                name="parentId" 
                value={formData.parentId} 
                onChange={handleChange}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">None (Top Level)</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id} disabled={cat.id === initialData?.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2">
              <MediaUploaderInput
                label="Category Banner Image"
                value={formData.image}
                onChange={(url) => setFormData((prev) => ({ ...prev, image: url }))}
                folder="categories"
                placeholder="Upload or enter Category Image URL"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Icon Name</label>
              <Input name="icon" value={formData.icon} onChange={handleChange} placeholder="e.g., Folder" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort Order</label>
              <Input type="number" name="sortOrder" value={formData.sortOrder} onChange={handleChange} />
            </div>

            <div className="space-y-2 flex items-center h-full pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  name="isActive" 
                  checked={formData.isActive} 
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
            
            <div className="col-span-1 md:col-span-2 space-y-2">
              <RichTextEditor
                label="Description"
                value={formData.description}
                onChange={(val) => setFormData((prev) => ({ ...prev, description: val }))}
                placeholder="Category description, banner copy, or overview..."
                minHeight="180px"
                folder="categories"
              />
            </div>

            <div className="col-span-1 md:col-span-2 mt-4 pt-4 border-t">
              <h3 className="text-lg font-medium mb-4">SEO Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">SEO Title</label>
                  <Input name="seoTitle" value={formData.seoTitle} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SEO Description</label>
                  <textarea 
                    name="seoDescription" 
                    value={formData.seoDescription} 
                    onChange={handleChange} 
                    rows={2}
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Category'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
