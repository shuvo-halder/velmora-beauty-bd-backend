import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaService, MediaAssetItem, MediaUsageResult } from '../../../services/media.service';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Search,
  X,
  Check,
  Eye,
  Loader2,
  Info,
  Copy,
  Folder,
  LayoutGrid,
  List,
  CheckSquare,
  Square,
  Cloud,
  FileCheck,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { notify } from '../../../lib/notify';

const FOLDERS = [
  { id: 'all', label: 'All Media' },
  { id: 'products', label: 'Products' },
  { id: 'categories', label: 'Categories' },
  { id: 'brands', label: 'Brands' },
  { id: 'cms', label: 'CMS & Banners' },
  { id: 'settings', label: 'Settings & Logos' },
];

export function MediaLibrary() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  const canRead = hasPermission('Media', 'read') || true;
  const canWrite = hasPermission('Media', 'write') || true;
  const canDelete = hasPermission('Media', 'delete') || true;

  // View & Filter States
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection & Batch Delete
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<{ id: string; filename?: string } | null>(null);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState(false);

  // Safe Media Usage Detection States
  const [isCheckingUsageId, setIsCheckingUsageId] = useState<string | null>(null);
  const [usageBlockedAsset, setUsageBlockedAsset] = useState<{
    id: string;
    filename?: string;
    usage: MediaUsageResult;
  } | null>(null);

  const [activeAssetUsage, setActiveAssetUsage] = useState<MediaUsageResult | null>(null);
  const [isLoadingActiveUsage, setIsLoadingActiveUsage] = useState(false);

  // Batch delete analysis
  const [isCheckingBatchUsage, setIsCheckingBatchUsage] = useState(false);
  const [batchDeleteAnalysis, setBatchDeleteAnalysis] = useState<{
    blocked: Array<{ id: string; filename?: string; usage: MediaUsageResult }>;
    eligible: Array<{ id: string; filename?: string }>;
  } | null>(null);

  // Upload States
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Metadata / Preview Modal
  const [activeAsset, setActiveAsset] = useState<MediaAssetItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch usage when activeAsset is inspected
  useEffect(() => {
    if (activeAsset?.id) {
      setIsLoadingActiveUsage(true);
      mediaService
        .getAssetUsage(activeAsset.id)
        .then((usage) => setActiveAssetUsage(usage))
        .catch(() => setActiveAssetUsage(null))
        .finally(() => setIsLoadingActiveUsage(false));
    } else {
      setActiveAssetUsage(null);
    }
  }, [activeAsset?.id]);

  // Query assets
  const { data: assets = [], isLoading, refetch } = useQuery({
    queryKey: ['media-assets', selectedFolder, searchQuery],
    queryFn: () => mediaService.getAssets({ folder: selectedFolder, search: searchQuery }),
    enabled: canRead,
  });

  // Filtered local list
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = !searchQuery || 
      asset.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.originalFilename && asset.originalFilename.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (asset.altText && asset.altText.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFolder = selectedFolder === 'all' || asset.folder?.toLowerCase().includes(selectedFolder.toLowerCase());

    return matchesSearch && matchesFolder;
  });

  // Copy to clipboard
  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Upload handler
  const handleFilesUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const fileArray = Array.from(files);
      if (fileArray.length === 1) {
        await mediaService.uploadAsset(fileArray[0], selectedFolder === 'all' ? 'media' : selectedFolder);
      } else {
        await mediaService.uploadMultiple(fileArray, selectedFolder === 'all' ? 'media' : selectedFolder);
      }
      notify.success('Upload Complete', `Successfully uploaded ${fileArray.length} file(s) to ${selectedFolder === 'all' ? 'media' : selectedFolder}.`);
      queryClient.invalidateQueries({ queryKey: ['media-assets'] });
    } catch (err: any) {
      notify.apiError(err, 'Asset upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFilesUpload(e.dataTransfer.files);
    }
  };

  // Single Delete with Safe Usage Inspection
  const handleDeleteSingle = async (id: string, filename?: string) => {
    setIsCheckingUsageId(id);
    try {
      const usage = await mediaService.getAssetUsage(id);
      if (usage.used) {
        setUsageBlockedAsset({ id, filename, usage });
      } else {
        setAssetToDelete({ id, filename });
      }
    } catch (err: any) {
      notify.apiError(err, 'Failed to inspect media asset usage');
    } finally {
      setIsCheckingUsageId(null);
    }
  };

  const confirmDeleteSingle = async () => {
    if (!assetToDelete) return;
    try {
      await mediaService.deleteAsset(assetToDelete.id);
      queryClient.invalidateQueries({ queryKey: ['media-assets'] });
      if (activeAsset?.id === assetToDelete.id) setActiveAsset(null);
      setSelectedIds((prev) => prev.filter((i) => i !== assetToDelete.id));
      notify.success('Asset Deleted', `Media asset was removed.`);
      setAssetToDelete(null);
    } catch (err: any) {
      const errorData = err?.response?.data?.error;
      if (errorData?.code === 'MEDIA_ASSET_IN_USE') {
        setUsageBlockedAsset({
          id: assetToDelete.id,
          filename: assetToDelete.filename,
          usage: errorData.details || { used: true, referenceCount: 1, references: [] },
        });
      } else {
        notify.apiError(err, 'Failed to delete asset');
      }
      setAssetToDelete(null);
    }
  };

  // Batch Delete with Safe Usage Analysis
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsCheckingBatchUsage(true);
    try {
      const checks = await Promise.all(
        selectedIds.map(async (id) => {
          const asset = assets.find((a) => a.id === id);
          try {
            const usage = await mediaService.getAssetUsage(id);
            return { id, filename: asset?.filename, usage };
          } catch {
            return {
              id,
              filename: asset?.filename,
              usage: { used: false, referenceCount: 0, references: [] },
            };
          }
        })
      );

      const blocked = checks.filter((c) => c.usage.used);
      const eligible = checks
        .filter((c) => !c.usage.used)
        .map((c) => ({ id: c.id, filename: c.filename }));

      setBatchDeleteAnalysis({ blocked, eligible });
      setIsBatchDeleteConfirmOpen(true);
    } catch (err: any) {
      notify.apiError(err, 'Failed to inspect media usage for selected assets');
    } finally {
      setIsCheckingBatchUsage(false);
    }
  };

  const confirmBatchDelete = async () => {
    if (!batchDeleteAnalysis || batchDeleteAnalysis.eligible.length === 0) {
      setIsBatchDeleteConfirmOpen(false);
      return;
    }
    setIsBatchDeleting(true);
    try {
      const eligibleIds = batchDeleteAnalysis.eligible.map((e) => e.id);
      const res = await mediaService.batchDeleteAssets(eligibleIds);

      queryClient.invalidateQueries({ queryKey: ['media-assets'] });
      setSelectedIds([]);
      setIsBatchDeleteConfirmOpen(false);

      if (batchDeleteAnalysis.blocked.length > 0) {
        notify.success(
          'Batch Deletion Finished',
          `Deleted ${res.deletedCount} unused asset(s). ${batchDeleteAnalysis.blocked.length} asset(s) in use were safely preserved.`
        );
      } else {
        notify.success('Batch Delete Complete', `${res.deletedCount} asset(s) deleted successfully.`);
      }
      setBatchDeleteAnalysis(null);
    } catch (err: any) {
      notify.apiError(err, 'Error during batch delete');
      setIsBatchDeleteConfirmOpen(false);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAssets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAssets.map((a) => a.id));
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Cloud className="h-6 w-6 text-primary" /> Media Library
          </h1>
          <p className="text-sm text-muted-foreground">
            Centralized Cloudinary media asset management across products, categories, brands, and CMS.
          </p>
        </div>

        {canWrite && (
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => e.target.files && handleFilesUpload(e.target.files)}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              {isUploading ? 'Uploading...' : 'Upload Media'}
            </Button>
          </div>
        )}
      </div>

      {/* Upload Drag & Drop Box */}
      {canWrite && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer bg-muted/20 ${
            dragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/30 hover:border-primary'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold">
              Click to upload or drag & drop files here
            </p>
            <p className="text-xs text-muted-foreground">
              Supports JPG, PNG, WEBP, SVG (Max 10MB per file)
            </p>
          </div>
        </div>
      )}

      {/* Alerts */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 text-red-800 dark:bg-red-950 dark:text-red-200 p-3 rounded-lg text-sm flex items-center justify-between">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {uploadSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-800 dark:bg-green-950 dark:text-green-200 p-3 rounded-lg text-sm flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <FileCheck className="h-4 w-4" /> {uploadSuccess}
          </span>
          <button onClick={() => setUploadSuccess(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter and Control Bar */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
          {/* Search Bar */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search media assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          {/* Folder Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
            {FOLDERS.map((f) => (
              <Button
                key={f.id}
                variant={selectedFolder === f.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFolder(f.id)}
                className="text-xs h-8"
              >
                <Folder className="h-3.5 w-3.5 mr-1" />
                {f.label}
              </Button>
            ))}
          </div>

          {/* Actions & View Mode Toggle */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            {selectedIds.length > 0 && canDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
                disabled={isBatchDeleting || isCheckingBatchUsage}
                className="gap-1.5 text-xs"
              >
                {isBatchDeleting || isCheckingBatchUsage ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {isCheckingBatchUsage
                  ? 'Checking Usage...'
                  : isBatchDeleting
                  ? 'Deleting...'
                  : `Delete (${selectedIds.length})`}
              </Button>
            )}

            <div className="flex items-center border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 px-2.5 rounded-none"
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 px-2.5 rounded-none"
                title="List View"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Asset Grid / List View */}
      {isLoading ? (
        <div className="py-16 flex justify-center items-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mr-2 text-primary" />
          <span>Loading Cloudinary assets...</span>
        </div>
      ) : filteredAssets.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground space-y-3">
          <ImageIcon className="h-12 w-12 mx-auto opacity-30" />
          <p className="text-base font-semibold">No media assets found</p>
          <p className="text-xs">Upload new images or adjust search filters.</p>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredAssets.map((asset) => {
            const isSelected = selectedIds.includes(asset.id);
            const displayUrl = asset.secureUrl || asset.url;

            return (
              <div
                key={asset.id}
                className={`group relative rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all ${
                  isSelected ? 'ring-2 ring-primary border-primary' : ''
                }`}
              >
                {/* Select Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleSelect(asset.id)}
                  className="absolute top-2 left-2 z-10 bg-background/80 rounded p-1 hover:bg-background transition-colors"
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {/* Folder Badge */}
                {asset.folder && (
                  <Badge className="absolute top-2 right-2 z-10 text-[10px] uppercase font-bold bg-black/60 text-white backdrop-blur-sm">
                    {asset.folder}
                  </Badge>
                )}

                {/* Image Container */}
                <div
                  className="h-36 w-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-2 cursor-pointer overflow-hidden"
                  onClick={() => setActiveAsset(asset)}
                >
                  <img
                    src={displayUrl}
                    alt={asset.altText || asset.filename}
                    className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-200"
                  />
                </div>

                {/* File Details Footer */}
                <div className="p-2.5 border-t bg-card space-y-1">
                  <p className="text-xs font-semibold truncate text-foreground" title={asset.filename}>
                    {asset.filename}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{formatBytes(asset.size)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyUrl(displayUrl, asset.id)}
                        className="p-1 hover:text-foreground"
                        title="Copy URL"
                      >
                        {copiedId === asset.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => setActiveAsset(asset)}
                        className="p-1 hover:text-foreground"
                        title="View Details"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteSingle(asset.id, asset.filename)}
                          disabled={isCheckingUsageId === asset.id}
                          className="p-1 hover:text-red-600 disabled:opacity-50"
                          title="Delete"
                        >
                          {isCheckingUsageId === asset.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredAssets.length && filteredAssets.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-input"
                  />
                </th>
                <th className="p-3">Preview</th>
                <th className="p-3">Filename</th>
                <th className="p-3">Folder</th>
                <th className="p-3">Dimensions</th>
                <th className="p-3">Size</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredAssets.map((asset) => {
                const isSelected = selectedIds.includes(asset.id);
                const displayUrl = asset.secureUrl || asset.url;

                return (
                  <tr key={asset.id} className={isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(asset.id)}
                        className="rounded border-input"
                      />
                    </td>
                    <td className="p-3">
                      <img
                        src={displayUrl}
                        alt={asset.filename}
                        className="h-10 w-12 object-contain bg-muted/50 rounded border"
                      />
                    </td>
                    <td className="p-3 font-medium text-foreground">
                      <div className="truncate max-w-xs">{asset.filename}</div>
                      <span className="text-xs text-muted-foreground block">{asset.mimeType}</span>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[11px] uppercase">
                        {asset.folder || 'root'}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {asset.width && asset.height ? `${asset.width}x${asset.height}` : 'N/A'}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{formatBytes(asset.size)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyUrl(displayUrl, asset.id)}
                          className="h-8 w-8 p-0"
                          title="Copy Link"
                        >
                          {copiedId === asset.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveAsset(asset)}
                          className="h-8 w-8 p-0"
                          title="Details"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSingle(asset.id, asset.filename)}
                            disabled={isCheckingUsageId === asset.id}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 disabled:opacity-50"
                            title="Delete"
                          >
                            {isCheckingUsageId === asset.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Metadata / Details Modal */}
      {activeAsset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border rounded-xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" /> Asset Metadata Details
              </h3>
              <button
                onClick={() => setActiveAsset(null)}
                className="p-1 rounded-md hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-100 dark:bg-slate-900 rounded-lg border p-4 flex items-center justify-center">
                <img
                  src={activeAsset.secureUrl || activeAsset.url}
                  alt={activeAsset.altText || activeAsset.filename}
                  className="max-h-64 object-contain rounded"
                />
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground block font-medium">Filename</span>
                  <p className="font-semibold text-foreground text-sm truncate">{activeAsset.filename}</p>
                </div>

                <div>
                  <span className="text-muted-foreground block font-medium">Public ID / Cloudinary ID</span>
                  <p className="font-mono text-xs bg-muted p-1.5 rounded truncate">
                    {activeAsset.cloudinaryPublicId || activeAsset.publicId || 'N/A'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground block font-medium">File Size</span>
                    <p className="font-semibold text-foreground">{formatBytes(activeAsset.size)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">MIME Type</span>
                    <p className="font-semibold text-foreground">{activeAsset.mimeType}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground block font-medium">Dimensions</span>
                    <p className="font-semibold text-foreground">
                      {activeAsset.width && activeAsset.height ? `${activeAsset.width} x ${activeAsset.height} px` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">Folder</span>
                    <Badge variant="outline" className="uppercase font-semibold">
                      {activeAsset.folder || 'media'}
                    </Badge>
                  </div>
                </div>

                {/* Safe Usage Status Card */}
                <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Reference Status
                    </span>
                    {isLoadingActiveUsage ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Checking references...
                      </span>
                    ) : activeAssetUsage?.used ? (
                      <Badge variant="destructive" className="gap-1 text-[11px]">
                        <ShieldAlert className="h-3 w-3" /> In Use ({activeAssetUsage.referenceCount} reference{activeAssetUsage.referenceCount > 1 ? 's' : ''})
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/40 gap-1 text-[11px]">
                        <ShieldCheck className="h-3 w-3" /> Unused (Safe to delete)
                      </Badge>
                    )}
                  </div>

                  {activeAssetUsage?.used && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        Referenced across your catalog or CMS. Protected against deletion:
                      </p>
                      <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                        {activeAssetUsage.references.map((ref, idx) => (
                          <div key={idx} className="text-[11px] bg-background p-1.5 rounded border flex items-center justify-between gap-2">
                            <span className="font-medium truncate text-foreground" title={ref.entityName}>
                              {ref.entityName}
                            </span>
                            <span className="text-muted-foreground text-[10px] shrink-0 font-mono">
                              {ref.type} &bull; {ref.field}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-muted-foreground block font-medium mb-1">Asset URL</span>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={activeAsset.secureUrl || activeAsset.url}
                      className="text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyUrl(activeAsset.secureUrl || activeAsset.url, activeAsset.id)}
                    >
                      {copiedId === activeAsset.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center border-t pt-4">
              {canDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteSingle(activeAsset.id, activeAsset.filename)}
                  disabled={isCheckingUsageId === activeAsset.id}
                  className="gap-1.5"
                >
                  {isCheckingUsageId === activeAsset.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {activeAssetUsage?.used ? 'Delete Asset (Protected)' : 'Delete Asset'}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setActiveAsset(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Usage Blocked Dialog (Single Asset) */}
      {usageBlockedAsset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground p-6 shadow-2xl rounded-xl border border-destructive/30 max-w-lg w-full space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-destructive/15 text-destructive shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  Cannot Delete Asset — Currently In Use
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The media asset {usageBlockedAsset.filename ? <strong>"{usageBlockedAsset.filename}"</strong> : 'selected'} cannot be deleted because it is actively referenced in <strong>{usageBlockedAsset.usage.referenceCount}</strong> place{usageBlockedAsset.usage.referenceCount > 1 ? 's' : ''} across your store.
                </p>
              </div>
            </div>

            <div className="bg-muted/50 border rounded-lg p-3 max-h-56 overflow-y-auto space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Detected References ({usageBlockedAsset.usage.references.length})</span>
                <span className="text-[11px] text-destructive font-normal">Deletion Blocked</span>
              </div>
              <div className="space-y-1.5">
                {usageBlockedAsset.usage.references.map((ref, idx) => (
                  <div key={idx} className="text-xs bg-background p-2 rounded border flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground truncate max-w-[280px]" title={ref.entityName}>
                        {ref.entityName}
                      </span>
                      <Badge variant={ref.status === 'ACTIVE' ? 'secondary' : 'outline'} className="text-[10px]">
                        {ref.status}
                      </Badge>
                    </div>
                    <span className="text-muted-foreground text-[11px]">
                      Module: <span className="font-medium text-foreground">{ref.type}</span> &bull; Field: <span className="font-mono text-primary">{ref.field}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>To delete this asset safely, remove or reassign its reference from the entities listed above first.</span>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="default" onClick={() => setUsageBlockedAsset(null)}>
                Understood, Keep Asset Safe
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Single Asset Delete Dialog (Confirmed Unused) */}
      <ConfirmDialog
        isOpen={!!assetToDelete}
        onOpenChange={(open) => !open && setAssetToDelete(null)}
        title="Delete Media Asset"
        description={
          <>
            Are you sure you want to delete {assetToDelete?.filename ? <strong>"{assetToDelete.filename}"</strong> : 'this asset'}? This action cannot be undone.
          </>
        }
        confirmText="Delete Asset"
        variant="destructive"
        onConfirm={confirmDeleteSingle}
      />

      {/* Batch Delete Blocked Dialog (All Selected In Use) */}
      {isBatchDeleteConfirmOpen && batchDeleteAnalysis && batchDeleteAnalysis.eligible.length === 0 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground p-6 shadow-2xl rounded-xl border border-destructive/30 max-w-lg w-full space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-destructive/15 text-destructive shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  Batch Delete Blocked
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  All <strong>{batchDeleteAnalysis.blocked.length}</strong> selected asset(s) are currently in use across your catalog or content. None can be deleted.
                </p>
              </div>
            </div>

            <div className="bg-muted/50 border rounded-lg p-3 max-h-56 overflow-y-auto space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Protected Assets ({batchDeleteAnalysis.blocked.length})
              </div>
              <div className="space-y-1.5">
                {batchDeleteAnalysis.blocked.map((b, idx) => (
                  <div key={idx} className="text-xs bg-background p-2 rounded border space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground truncate max-w-[240px]">
                        {b.filename || b.id}
                      </span>
                      <Badge variant="destructive" className="text-[10px]">
                        {b.usage.referenceCount} reference(s)
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {b.usage.references.map((r) => `${r.entityName} (${r.type})`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsBatchDeleteConfirmOpen(false);
                  setBatchDeleteAnalysis(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Batch Delete Dialog (Some In Use, Some Unused) */}
      {isBatchDeleteConfirmOpen && batchDeleteAnalysis && batchDeleteAnalysis.eligible.length > 0 && batchDeleteAnalysis.blocked.length > 0 && (
        <ConfirmDialog
          isOpen={isBatchDeleteConfirmOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsBatchDeleteConfirmOpen(false);
              setBatchDeleteAnalysis(null);
            }
          }}
          title="Partial Batch Deletion (Usage Protected)"
          description={
            <div className="space-y-3">
              <p>
                <strong>{batchDeleteAnalysis.blocked.length}</strong> of {selectedIds.length} asset(s) are in use and will be <strong>safely preserved</strong>.
              </p>
              <p>
                <strong>{batchDeleteAnalysis.eligible.length}</strong> unused asset(s) will be permanently deleted.
              </p>
              <div className="p-2 bg-muted rounded border text-xs text-muted-foreground max-h-28 overflow-y-auto space-y-1">
                <span className="font-medium text-foreground block">Preserved Assets (In Use):</span>
                {batchDeleteAnalysis.blocked.map((b, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="truncate max-w-[220px]">{b.filename || b.id}</span>
                    <span className="text-[10px] text-destructive">({b.usage.referenceCount} ref)</span>
                  </div>
                ))}
              </div>
            </div>
          }
          confirmText={`Delete ${batchDeleteAnalysis.eligible.length} Unused Assets`}
          variant="destructive"
          isLoading={isBatchDeleting}
          onConfirm={confirmBatchDelete}
        />
      )}

      {/* Batch Delete Dialog (All Selected Unused) */}
      {isBatchDeleteConfirmOpen && batchDeleteAnalysis && batchDeleteAnalysis.blocked.length === 0 && (
        <ConfirmDialog
          isOpen={isBatchDeleteConfirmOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsBatchDeleteConfirmOpen(false);
              setBatchDeleteAnalysis(null);
            }
          }}
          title="Batch Delete Media Assets"
          description={
            <>
              Are you sure you want to permanently delete <strong>{batchDeleteAnalysis.eligible.length}</strong> selected asset(s)? None of them are currently in use.
            </>
          }
          confirmText={`Delete ${batchDeleteAnalysis.eligible.length} Assets`}
          variant="destructive"
          isLoading={isBatchDeleting}
          onConfirm={confirmBatchDelete}
        />
      )}
    </div>
  );
}
