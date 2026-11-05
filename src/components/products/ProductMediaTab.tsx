import React, { useState, useRef } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Input } from '@/src/components/ui/input';
import { 
  UploadCloud, 
  Trash2, 
  Star, 
  GripVertical, 
  Image as ImageIcon, 
  ArrowLeft, 
  ArrowRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  uploadProductImage, 
  deleteProductImage, 
  reorderProductImages, 
  setPrimaryProductImage,
  ProductImageItem 
} from '../../services/product.service';
import { mediaService } from '../../services/media.service';

interface ProductMediaTabProps {
  productId?: string;
  images: ProductImageItem[];
  onImagesChange: (images: ProductImageItem[]) => void;
}

export function ProductMediaTab({ productId, images, onImagesChange }: ProductMediaTabProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const validateFiles = (files: FileList | File[]): { validFiles: File[]; error?: string } => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const validFiles: File[] = [];

    for (const file of Array.from(files)) {
      if (!validTypes.includes(file.type.toLowerCase())) {
        return {
          validFiles: [],
          error: `Invalid file format (${file.name}). Only JPG, JPEG, PNG, and WEBP images are allowed.`
        };
      }
      if (file.size > maxSize) {
        return {
          validFiles: [],
          error: `File size too large (${file.name}). Maximum size allowed is 5MB.`
        };
      }
      validFiles.push(file);
    }

    return { validFiles };
  };

  const handleFileUpload = async (files: File[], isPrimaryUpload = false) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (files.length === 0) return;

    setIsUploading(true);
    try {
      if (productId) {
        // Upload via API directly
        const newUploadedImages: ProductImageItem[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const isPrimary = isPrimaryUpload && i === 0;
          const uploaded = await uploadProductImage(productId, file, { isPrimary });
          newUploadedImages.push(uploaded);
        }

        // Re-fetch or update state
        let updatedList: ProductImageItem[];
        if (isPrimaryUpload) {
          const primaryId = newUploadedImages[0].id;
          updatedList = [...images, ...newUploadedImages].map(img => ({
            ...img,
            isPrimary: img.id === primaryId
          }));
        } else {
          updatedList = [...images, ...newUploadedImages];
        }

        onImagesChange(updatedList);
        setSuccessMessage('Image(s) uploaded successfully!');
      } else {
        // Upload via mediaService for product creation
        const newLocalImages: ProductImageItem[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const uploadedAsset = await mediaService.uploadAsset(file, 'products');
          const isPrimary = isPrimaryUpload && i === 0;
          newLocalImages.push({
            id: uploadedAsset.id || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            imageUrl: uploadedAsset.secureUrl || uploadedAsset.url,
            url: uploadedAsset.secureUrl || uploadedAsset.url,
            publicId: uploadedAsset.publicId || null,
            sortOrder: images.length + i,
            isPrimary: isPrimary || (images.length === 0 && i === 0),
            altText: file.name
          });
        }

        let updatedList: ProductImageItem[];
        if (isPrimaryUpload) {
          const primaryId = newLocalImages[0].id;
          updatedList = [...images.map(img => ({ ...img, isPrimary: false })), ...newLocalImages];
        } else {
          updatedList = [...images, ...newLocalImages];
        }

        onImagesChange(updatedList);
        setSuccessMessage('Image preview(s) added!');
      }
    } catch (err: any) {
      console.error('Failed to upload image:', err);
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, isPrimary = false) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const { validFiles, error } = validateFiles(e.dataTransfer.files);
      if (error) {
        setErrorMessage(error);
        return;
      }
      handleFileUpload(validFiles, isPrimary);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDeleteImage = async (imageId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (productId && !imageId.startsWith('temp-')) {
        await deleteProductImage(productId, imageId);
      }

      const remaining = images.filter(img => img.id !== imageId);
      // If deleted primary image, assign new primary image if available
      const wasPrimary = images.find(img => img.id === imageId)?.isPrimary;
      if (wasPrimary && remaining.length > 0) {
        remaining[0].isPrimary = true;
      }

      onImagesChange(remaining);
      setSuccessMessage('Image removed.');
    } catch (err: any) {
      console.error('Failed to delete image:', err);
      setErrorMessage(err?.response?.data?.message || 'Failed to delete image');
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (productId && !imageId.startsWith('temp-')) {
        await setPrimaryProductImage(productId, imageId);
      }

      const updated = images.map(img => ({
        ...img,
        isPrimary: img.id === imageId
      }));

      onImagesChange(updated);
      setSuccessMessage('Primary image updated.');
    } catch (err: any) {
      console.error('Failed to set primary image:', err);
      setErrorMessage(err?.response?.data?.message || 'Failed to set primary image');
    }
  };

  const handleMove = async (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const newImages = [...images];
    const temp = newImages[index];
    newImages[index] = newImages[targetIndex];
    newImages[targetIndex] = temp;

    // Update sortOrder
    const reordered = newImages.map((img, idx) => ({ ...img, sortOrder: idx }));
    onImagesChange(reordered);

    if (productId && !images.some(img => img.id.startsWith('temp-'))) {
      try {
        await reorderProductImages(productId, reordered.map(i => i.id));
      } catch (err) {
        console.error('Failed to reorder images on server:', err);
      }
    }
  };

  // HTML5 Drag and Drop handlers for reordering
  const handleItemDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleItemDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    const reordered = newImages.map((img, idx) => ({ ...img, sortOrder: idx }));
    onImagesChange(reordered);
  };

  const handleItemDragEnd = async () => {
    setDraggedIndex(null);
    if (productId && !images.some(img => img.id.startsWith('temp-'))) {
      try {
        await reorderProductImages(productId, images.map(i => i.id));
      } catch (err) {
        console.error('Failed to save reordered images:', err);
      }
    }
  };

  const primaryImg = images.find(img => img.isPrimary) || images[0];

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-3 text-sm">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Product Media Management</CardTitle>
          <CardDescription>
            Upload, manage, and arrange thumbnail and gallery images. Only JPG, JPEG, PNG, and WEBP formats (Max 5MB each) are allowed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Upload Dropzones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Thumbnail Upload Dropzone */}
            <div 
              onDrop={(e) => handleDrop(e, true)}
              onDragOver={handleDragOver}
              className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary transition-colors cursor-pointer bg-muted/20 flex flex-col items-center justify-center space-y-3"
              onClick={() => thumbnailInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={thumbnailInputRef}
                className="hidden" 
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => {
                  if (e.target.files) {
                    const { validFiles, error } = validateFiles(e.target.files);
                    if (error) setErrorMessage(error);
                    else handleFileUpload(validFiles, true);
                  }
                }}
              />
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-sm">Upload Primary Thumbnail</p>
                <p className="text-xs text-muted-foreground mt-1">Drag & drop or click to upload primary product card image</p>
                <p className="text-[11px] text-muted-foreground mt-1 font-mono">JPG, PNG, WEBP &bull; Max 5MB</p>
              </div>
              <Button type="button" variant="outline" size="sm" disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Select Thumbnail'}
              </Button>
            </div>

            {/* Gallery Upload Dropzone */}
            <div 
              onDrop={(e) => handleDrop(e, false)}
              onDragOver={handleDragOver}
              className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary transition-colors cursor-pointer bg-muted/20 flex flex-col items-center justify-center space-y-3"
              onClick={() => galleryInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={galleryInputRef}
                multiple
                className="hidden" 
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => {
                  if (e.target.files) {
                    const { validFiles, error } = validateFiles(e.target.files);
                    if (error) setErrorMessage(error);
                    else handleFileUpload(validFiles, false);
                  }
                }}
              />
              <div className="h-12 w-12 rounded-full bg-secondary/80 text-foreground flex items-center justify-center">
                <ImageIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-sm">Upload Gallery Images</p>
                <p className="text-xs text-muted-foreground mt-1">Drag & drop multiple images for product detail gallery</p>
                <p className="text-[11px] text-muted-foreground mt-1 font-mono">JPG, PNG, WEBP &bull; Max 5MB</p>
              </div>
              <Button type="button" variant="secondary" size="sm" disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Browse Gallery Files'}
              </Button>
            </div>
          </div>

          {/* Primary Image Preview Section */}
          {primaryImg && (
            <div className="p-4 rounded-xl border bg-card/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  Primary Image / Thumbnail Preview
                </span>
                <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white">
                  Active Primary Card Image
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-24 w-24 rounded-lg border overflow-hidden bg-muted flex-shrink-0">
                  <img src={primaryImg.imageUrl || primaryImg.url} alt={primaryImg.altText || 'Primary'} className="h-full w-full object-cover" />
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-mono text-muted-foreground truncate max-w-md">URL: {primaryImg.imageUrl || primaryImg.url}</p>
                  {primaryImg.publicId && <p className="font-mono text-muted-foreground">Public ID: {primaryImg.publicId}</p>}
                  <p className="text-emerald-600 dark:text-emerald-400 font-medium">This image will be used on Storefront & Admin product listing cards.</p>
                </div>
              </div>
            </div>
          )}

          {/* Gallery & Reorder Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-semibold">
                Media Gallery ({images.length} {images.length === 1 ? 'Image' : 'Images'})
              </h3>
              <span className="text-xs text-muted-foreground">Drag & drop or use arrows to reorder gallery</span>
            </div>

            {images.length === 0 ? (
              <div className="py-12 border rounded-xl text-center text-muted-foreground space-y-2">
                <ImageIcon className="h-10 w-10 mx-auto opacity-30" />
                <p className="text-sm">No product media uploaded yet.</p>
                <p className="text-xs">Use the upload dropzones above to add product photos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((img, idx) => {
                  const isPrimary = img.isPrimary;
                  const src = img.imageUrl || img.url;

                  return (
                    <div
                      key={img.id}
                      draggable
                      onDragStart={(e) => handleItemDragStart(e, idx)}
                      onDragOver={(e) => handleItemDragOver(e, idx)}
                      onDragEnd={handleItemDragEnd}
                      className={`relative group rounded-xl border bg-card p-2 flex flex-col justify-between space-y-2 transition-all ${
                        isPrimary ? 'ring-2 ring-amber-500 border-amber-500 shadow-md' : 'hover:border-primary/50'
                      } ${draggedIndex === idx ? 'opacity-40 border-dashed' : 'opacity-100'}`}
                    >
                      {/* Image container with badges */}
                      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-muted">
                        <img src={src} alt={img.altText || `Product Image ${idx + 1}`} className="h-full w-full object-cover" />

                        {/* Top Badges */}
                        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                          {isPrimary && (
                            <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 font-bold shadow">
                              Primary
                            </Badge>
                          )}
                        </div>

                        {/* Drag handle overlay */}
                        <div className="absolute top-1.5 right-1.5 bg-black/60 text-white p-1 rounded cursor-grab active:cursor-grabbing opacity-70 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="h-3.5 w-3.5" />
                        </div>
                      </div>

                      {/* Image Action Buttons */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs gap-1">
                          <Button
                            type="button"
                            variant={isPrimary ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => handleSetPrimary(img.id)}
                            className={`w-full text-[11px] h-7 ${isPrimary ? 'bg-amber-500/10 text-amber-600 border-amber-300 font-semibold' : ''}`}
                          >
                            <Star className={`h-3 w-3 mr-1 ${isPrimary ? 'fill-amber-500 text-amber-500' : ''}`} />
                            {isPrimary ? 'Primary' : 'Make Primary'}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeleteImage(img.id)}
                            className="h-7 w-7 flex-shrink-0"
                            title="Delete Image"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Reorder Arrows */}
                        <div className="flex items-center justify-between gap-1 pt-1 border-t">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={idx === 0}
                            onClick={() => handleMove(idx, 'left')}
                            className="h-6 w-6"
                            title="Move Left"
                          >
                            <ArrowLeft className="h-3 w-3" />
                          </Button>
                          <span className="text-[10px] font-mono text-muted-foreground">Order: {img.sortOrder}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={idx === images.length - 1}
                            onClick={() => handleMove(idx, 'right')}
                            className="h-6 w-6"
                            title="Move Right"
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
