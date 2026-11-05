import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface MediaUploaderInputProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  placeholder?: string;
  description?: string;
}

export const MediaUploaderInput: React.FC<MediaUploaderInputProps> = ({
  label,
  value,
  onChange,
  folder = 'settings',
  placeholder = 'https://...',
  description,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type.toLowerCase())) {
      setError('Invalid file type. Allowed: JPG, PNG, WEBP, SVG');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await fetch('/api/v1/media/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      const uploadedUrl = data.data?.secureUrl || data.data?.url;
      if (uploadedUrl) {
        onChange(uploadedUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground block">{label}</label>
      {description && <p className="text-xs text-muted-foreground mb-1">{description}</p>}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {value ? (
          <div className="relative group h-14 w-28 shrink-0 rounded-lg border bg-muted/40 p-1 flex items-center justify-center overflow-hidden">
            <img src={value} alt={label} className="h-full w-full object-contain" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="h-14 w-28 shrink-0 rounded-lg border border-dashed flex flex-col items-center justify-center bg-muted/20 text-muted-foreground text-xs p-1">
            <ImageIcon className="h-4 w-4 opacity-50" />
            <span>No image</span>
          </div>
        )}

        <div className="flex-1 w-full space-y-1">
          <div className="flex gap-2">
            <Input
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="flex-1 text-xs"
            />
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 text-xs flex items-center gap-1.5"
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>
      </div>
    </div>
  );
};
