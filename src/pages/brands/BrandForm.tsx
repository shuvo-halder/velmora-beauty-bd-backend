import React, { useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Card, CardContent } from '@/src/components/ui/card';
import { MediaUploaderInput } from '../../components/admin/MediaUploaderInput';
import { RichTextEditor } from '@/src/components/ui/RichTextEditor';

interface BrandFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export function BrandForm({ initialData, onSubmit, isLoading }: BrandFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    logoUrl: initialData?.logoUrl || '',
    website: initialData?.website || '',
    isActive: initialData?.isActive === false ? false : true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
              <label className="text-sm font-medium">Website</label>
              <Input type="url" name="website" value={formData.website} onChange={handleChange} placeholder="https://..." />
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2">
              <MediaUploaderInput
                label="Brand Logo"
                value={formData.logoUrl}
                onChange={(url) => setFormData((prev) => ({ ...prev, logoUrl: url }))}
                folder="brands"
                placeholder="Upload or enter Brand Logo URL"
              />
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
                placeholder="Brand description and details..."
                minHeight="180px"
                folder="brands"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Brand'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
