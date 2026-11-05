import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import CharacterCount from '@tiptap/extension-character-count';
import Image from '@tiptap/extension-image';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Unlink,
  Image as ImageIcon,
  Minus,
  Undo,
  Redo,
  RemoveFormatting,
  SquareCode,
  Highlighter,
  Palette,
  Check,
  X,
  Upload,
  AlertCircle,
  RefreshCw,
  Loader2,
  FileImage,
  Table as TableIcon,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { api } from '@/src/lib/api';
import { notify } from '@/src/lib/notify';

export interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string | boolean;
  helperText?: string;
  minHeight?: string;
  maxHeight?: string;
  maxLength?: number;
  className?: string;
  id?: string;
  folder?: string;
  onImageUploadClick?: () => void;
}

const COLOR_PRESETS = [
  { label: 'Default', value: '' },
  { label: 'Primary', value: '#2563eb' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Rose', value: '#e11d48' },
  { label: 'Purple', value: '#9333ea' },
  { label: 'Muted', value: '#64748b' },
];

const HIGHLIGHT_PRESETS = [
  { label: 'None', value: '' },
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bfdbfe' },
  { label: 'Pink', value: '#fbcfe8' },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const validateImageFile = (file: File): string | null => {
  if (!file) return 'No file selected';

  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  const mime = file.type.toLowerCase();

  if (mime === 'image/svg+xml' || ext === '.svg') {
    return 'SVG vector format is not allowed for rich text images. Allowed formats: JPG, PNG, WEBP, GIF.';
  }

  if (mime && !ALLOWED_MIME_TYPES.includes(mime)) {
    return `Unsupported image format (${file.type || 'unknown'}). Allowed formats: JPG, PNG, WEBP, GIF.`;
  }

  if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
    return `Unsupported file extension (${ext}). Allowed extensions: .jpg, .jpeg, .png, .webp, .gif.`;
  }

  if (file.size > MAX_FILE_SIZE) {
    return `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum 10MB limit.`;
  }

  return null;
};

// Custom Tiptap Image node extending standard Image with alignment, width, and responsive attributes
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      alt: {
        default: '',
        parseHTML: (element) => element.getAttribute('alt') || '',
        renderHTML: (attributes) => ({ alt: attributes.alt }),
      },
      title: {
        default: '',
        parseHTML: (element) => element.getAttribute('title') || '',
        renderHTML: (attributes) => ({ title: attributes.title }),
      },
      width: {
        default: '100%',
        parseHTML: (element) => element.getAttribute('width') || element.style.width || '100%',
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { style: `width: ${attributes.width}; max-width: 100%; height: auto;` };
        },
      },
      alignment: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-alignment') || 'center',
        renderHTML: (attributes) => {
          const align = attributes.alignment || 'center';
          let alignClass = 'block mx-auto my-3 rounded-md max-w-full h-auto';
          if (align === 'left') {
            alignClass = 'float-left mr-4 mb-3 my-1 rounded-md max-w-full h-auto';
          } else if (align === 'right') {
            alignClass = 'float-right ml-4 mb-3 my-1 rounded-md max-w-full h-auto';
          }
          return {
            'data-alignment': align,
            class: alignClass,
          };
        },
      },
    };
  },
});

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  label,
  placeholder = 'Start typing content...',
  disabled = false,
  readOnly = false,
  error,
  helperText,
  minHeight = '180px',
  maxHeight = '500px',
  maxLength,
  className,
  id,
  folder = 'rich-text',
  onImageUploadClick,
}) => {
  const isEditable = !disabled && !readOnly;
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  // Image Upload State
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalTab, setImageModalTab] = useState<'upload' | 'url'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageAltInput, setImageAltInput] = useState('');
  const [imageAlignment, setImageAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [imageWidth, setImageWidth] = useState<'100%' | '75%' | '50%' | '25%'>('100%');

  // Upload progress & error tracking
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState('');
  const [uploadError, setUploadError] = useState<{ message: string; file: File | null; retryFn?: () => void } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadsSet = useRef<Set<string>>(new Set());

  // Function to upload a single image file to Cloudinary via secure backend
  const uploadFileToBackend = useCallback(
    async (
      file: File,
      altText?: string,
      alignment: 'left' | 'center' | 'right' = 'center',
      width: string = '100%'
    ) => {
      const fileKey = `${file.name}_${file.size}_${file.lastModified}`;
      if (activeUploadsSet.current.has(fileKey)) {
        notify.warning('Duplicate Upload', 'This file is already being uploaded.');
        return null;
      }

      // 1. Frontend validation
      const valError = validateImageFile(file);
      if (valError) {
        setUploadError({ message: valError, file, retryFn: () => uploadFileToBackend(file, altText, alignment, width) });
        notify.error('Image Validation Failed', valError);
        return null;
      }

      activeUploadsSet.current.add(fileKey);
      setIsUploading(true);
      setUploadProgress(0);
      setUploadingFileName(file.name);
      setUploadError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);
        if (altText) {
          formData.append('altText', altText);
        } else {
          formData.append('altText', file.name.replace(/\.[^/.]+$/, ''));
        }

        const res = await api.post('/media/rich-text-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
            }
          },
        });

        const returnedUrl =
          res.data?.secureUrl ||
          res.data?.url ||
          res.data?.data?.secureUrl ||
          res.data?.data?.url;

        if (!returnedUrl) {
          throw new Error('Upload succeeded but server did not return a valid secure URL');
        }

        notify.success('Image Uploaded', `${file.name} uploaded to Cloudinary successfully.`);
        return {
          url: returnedUrl,
          alt: altText || file.name.replace(/\.[^/.]+$/, ''),
          alignment,
          width,
        };
      } catch (err: any) {
        const message =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          'Failed to upload image to Cloudinary';

        setUploadError({
          message,
          file,
          retryFn: () => uploadFileToBackend(file, altText, alignment, width),
        });
        notify.error('Upload Failed', message);
        return null;
      } finally {
        activeUploadsSet.current.delete(fileKey);
        setIsUploading(false);
        setUploadProgress(0);
        setUploadingFileName('');
      }
    },
    [folder]
  );

  // Tiptap Editor Initialization
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      CustomImage.configure({
        allowBase64: false, // Disallow base64 strings to enforce Cloudinary URLs only
        HTMLAttributes: {
          class: 'rounded-md max-w-full my-2',
        },
      }),
      CharacterCount.configure({
        limit: maxLength,
      }),
    ],
    content: value,
    editable: isEditable,
    editorProps: {
      // Handle drag & drop images
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const files = Array.from(event.dataTransfer.files);
          const imageFiles = files.filter(
            (f) => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name)
          );

          if (imageFiles.length > 0) {
            event.preventDefault();

            // Process image uploads asynchronously
            (async () => {
              for (const file of imageFiles) {
                const res = await uploadFileToBackend(file);
                if (res && view && !view.isDestroyed) {
                  const { state, dispatch } = view;
                  const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                  const pos = coordinates ? coordinates.pos : state.selection.anchor;

                  const node = state.schema.nodes.image.create({
                    src: res.url,
                    alt: res.alt,
                    title: res.alt,
                    alignment: res.alignment,
                    width: res.width,
                  });

                  const transaction = state.tr.insert(pos, node);
                  dispatch(transaction);
                }
              }
            })();
            return true;
          }
        }
        return false;
      },
      // Handle paste images from clipboard
      handlePaste: (view, event) => {
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files.length > 0) {
          const files = Array.from(event.clipboardData.files);
          const imageFiles = files.filter(
            (f) => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name)
          );

          if (imageFiles.length > 0) {
            event.preventDefault();

            (async () => {
              for (const file of imageFiles) {
                const res = await uploadFileToBackend(file);
                if (res && view && !view.isDestroyed) {
                  const { state, dispatch } = view;
                  const pos = state.selection.anchor;

                  const node = state.schema.nodes.image.create({
                    src: res.url,
                    alt: res.alt,
                    title: res.alt,
                    alignment: res.alignment,
                    width: res.width,
                  });

                  const transaction = state.tr.insert(pos, node);
                  dispatch(transaction);
                }
              }
            })();
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (onChange) {
        onChange(html);
      }
    },
  });

  // Keep editor content in sync with external value prop without breaking focus/cursor
  useEffect(() => {
    if (editor && value !== undefined) {
      const currentHTML = editor.getHTML();
      if (currentHTML !== value) {
        editor.commands.setContent(value || '');
      }
    }
  }, [value, editor]);

  // Sync editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditable && !isUploading);
    }
  }, [isEditable, isUploading, editor]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  const setLink = useCallback(() => {
    if (!editor) return;
    if (!linkUrl) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setIsLinkDialogOpen(false);
      return;
    }

    const formattedUrl =
      linkUrl.startsWith('http://') || linkUrl.startsWith('https://') || linkUrl.startsWith('mailto:')
        ? linkUrl
        : `https://${linkUrl}`;

    editor.chain().focus().extendMarkRange('link').setLink({ href: formattedUrl }).run();
    setIsLinkDialogOpen(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    setIsLinkDialogOpen(false);
    setLinkUrl('');
  }, [editor]);

  const openLinkModal = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setIsLinkDialogOpen(true);
  }, [editor]);

  // Toolbar Image click handler
  const handleToolbarImageClick = useCallback(() => {
    if (onImageUploadClick) {
      onImageUploadClick();
      return;
    }
    // Open internal upload modal
    setSelectedFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    setImageUrlInput('');
    setImageAltInput('');
    setImageAlignment('center');
    setImageWidth('100%');
    setUploadError(null);
    setIsImageModalOpen(true);
  }, [onImageUploadClick, filePreviewUrl]);

  // File selection change inside modal
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const valError = validateImageFile(file);
      if (valError) {
        setUploadError({ message: valError, file });
        notify.error('Invalid File', valError);
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(URL.createObjectURL(file));
      if (!imageAltInput) {
        setImageAltInput(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  // Submit handler inside modal
  const handleInsertImageFromModal = async () => {
    if (!editor) return;

    if (imageModalTab === 'upload') {
      if (!selectedFile) {
        notify.error('No File Selected', 'Please select an image file to upload.');
        return;
      }

      const res = await uploadFileToBackend(selectedFile, imageAltInput, imageAlignment, imageWidth);
      if (res) {
        editor.chain().focus().setImage({
          src: res.url,
          alt: res.alt,
          title: res.alt,
          alignment: res.alignment,
          width: res.width as any,
        } as any).run();

        setIsImageModalOpen(false);
        setSelectedFile(null);
        if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
        setFilePreviewUrl(null);
      }
    } else {
      // URL tab
      if (!imageUrlInput || !imageUrlInput.trim()) {
        notify.error('Missing URL', 'Please enter a valid image URL.');
        return;
      }

      editor.chain().focus().setImage({
        src: imageUrlInput.trim(),
        alt: imageAltInput || 'Image',
        title: imageAltInput || 'Image',
        alignment: imageAlignment,
        width: imageWidth as any,
      } as any).run();

      setIsImageModalOpen(false);
      setImageUrlInput('');
    }
  };

  if (!editor) {
    return (
      <div className="w-full border rounded-md p-4 min-h-[200px] bg-muted/20 animate-pulse flex items-center justify-center text-sm text-muted-foreground">
        Loading Rich Text Editor...
      </div>
    );
  }

  const characterCount = editor.storage.characterCount.characters();
  const wordCount = editor.storage.characterCount.words();
  const errorMessage = typeof error === 'string' ? error : null;

  return (
    <div className={cn('flex flex-col w-full', className)} id={id}>
      {label && (
        <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center justify-between">
          <span>{label}</span>
          <span className="text-xs text-muted-foreground font-normal">
            Drag & drop or paste images directly
          </span>
        </label>
      )}

      <div
        className={cn(
          'flex flex-col border rounded-lg bg-background overflow-hidden transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 relative',
          error
            ? 'border-destructive focus-within:ring-destructive'
            : 'border-input hover:border-accent-foreground/20',
          (disabled || isUploading) && 'opacity-80 cursor-wait bg-muted/20'
        )}
      >
        {/* Upload Progress Bar Overlay */}
        {isUploading && (
          <div className="w-full bg-primary/10 border-b border-primary/20 px-3 py-2 flex items-center justify-between text-xs text-primary font-medium animate-pulse z-20">
            <div className="flex items-center gap-2 overflow-hidden mr-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-primary" />
              <span className="truncate">
                Uploading {uploadingFileName || 'image'} to Cloudinary... ({uploadProgress}%)
              </span>
            </div>
            <div className="w-24 bg-primary/20 h-2 rounded-full overflow-hidden shrink-0">
              <div
                className="bg-primary h-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Global Editor Upload Error Banner with Retry */}
        {uploadError && !isImageModalOpen && (
          <div className="w-full bg-destructive/10 border-b border-destructive/20 px-3 py-2 flex items-center justify-between text-xs text-destructive z-20">
            <div className="flex items-center gap-2 overflow-hidden mr-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-destructive" />
              <span className="truncate font-medium">{uploadError.message}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {uploadError.retryFn && (
                <button
                  type="button"
                  onClick={() => uploadError.retryFn && uploadError.retryFn()}
                  className="px-2 py-0.5 bg-destructive text-destructive-foreground rounded text-[11px] font-semibold hover:bg-destructive/90 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              )}
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="p-0.5 hover:bg-destructive/20 rounded text-destructive"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        {isEditable && (
          <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-border bg-muted/30 text-foreground">
            {/* Heading dropdown */}
            <select
              value={
                editor.isActive('heading', { level: 1 })
                  ? 'h1'
                  : editor.isActive('heading', { level: 2 })
                  ? 'h2'
                  : editor.isActive('heading', { level: 3 })
                  ? 'h3'
                  : editor.isActive('heading', { level: 4 })
                  ? 'h4'
                  : 'p'
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'p') editor.chain().focus().setParagraph().run();
                else if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
                else if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
                else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
                else if (val === 'h4') editor.chain().focus().toggleHeading({ level: 4 }).run();
              }}
              disabled={isUploading}
              title="Text Format / Heading"
              className="h-8 text-xs font-medium bg-background border border-input rounded px-2 py-1 mr-1 focus:outline-none disabled:opacity-50"
            >
              <option value="p">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="h4">Heading 4</option>
            </select>

            <div className="h-4 w-px bg-border mx-1" />

            {/* Formatting */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={isUploading}
              aria-label="Bold (Ctrl+B)"
              title="Bold (Ctrl+B)"
              className={cn(
                'p-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-50',
                editor.isActive('bold') && 'bg-accent text-accent-foreground font-bold'
              )}
            >
              <Bold className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={isUploading}
              aria-label="Italic (Ctrl+I)"
              title="Italic (Ctrl+I)"
              className={cn(
                'p-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-50',
                editor.isActive('italic') && 'bg-accent text-accent-foreground font-bold'
              )}
            >
              <Italic className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              disabled={isUploading}
              aria-label="Underline (Ctrl+U)"
              title="Underline (Ctrl+U)"
              className={cn(
                'p-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-50',
                editor.isActive('underline') && 'bg-accent text-accent-foreground font-bold'
              )}
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              disabled={isUploading}
              aria-label="Strikethrough"
              title="Strikethrough"
              className={cn(
                'p-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-50',
                editor.isActive('strike') && 'bg-accent text-accent-foreground font-bold'
              )}
            >
              <Strikethrough className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCode().run()}
              disabled={isUploading}
              aria-label="Inline Code"
              title="Inline Code"
              className={cn(
                'p-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-50',
                editor.isActive('code') && 'bg-accent text-accent-foreground font-bold'
              )}
            >
              <Code className="w-4 h-4" />
            </button>

            {/* Text Color Picker Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowColorPicker(!showColorPicker);
                  setShowHighlightPicker(false);
                }}
                disabled={isUploading}
                aria-label="Text Color"
                title="Text Color"
                className={cn(
                  'p-1.5 rounded text-sm hover:bg-muted transition-colors flex items-center gap-1 disabled:opacity-50',
                  showColorPicker && 'bg-accent text-accent-foreground'
                )}
              >
                <Palette className="w-4 h-4" />
              </button>
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 z-30 p-2 bg-popover border border-border rounded-md shadow-md flex items-center gap-1.5">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        if (preset.value) {
                          editor.chain().focus().setColor(preset.value).run();
                        } else {
                          editor.chain().focus().unsetColor().run();
                        }
                        setShowColorPicker(false);
                      }}
                      title={preset.label}
                      className="w-5 h-5 rounded-full border border-border flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: preset.value || 'hsl(var(--foreground))' }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Highlight Picker Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowHighlightPicker(!showHighlightPicker);
                  setShowColorPicker(false);
                }}
                disabled={isUploading}
                aria-label="Highlight Text"
                title="Highlight Text"
                className={cn(
                  'p-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-50',
                  editor.isActive('highlight') && 'bg-accent text-accent-foreground'
                )}
              >
                <Highlighter className="w-4 h-4" />
              </button>
              {showHighlightPicker && (
                <div className="absolute top-full left-0 mt-1 z-30 p-2 bg-popover border border-border rounded-md shadow-md flex items-center gap-1.5">
                  {HIGHLIGHT_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        if (preset.value) {
                          editor.chain().focus().setHighlight({ color: preset.value }).run();
                        } else {
                          editor.chain().focus().unsetHighlight().run();
                        }
                        setShowHighlightPicker(false);
                      }}
                      title={preset.label}
                      className="w-5 h-5 rounded-full border border-border flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: preset.value || 'transparent' }}
                    >
                      {!preset.value && <X className="w-3 h-3 text-muted-foreground" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
              disabled={isUploading}
              aria-label="Clear Formatting"
              title="Clear Formatting"
              className="p-1.5 rounded text-sm hover:bg-muted transition-colors text-muted-foreground disabled:opacity-50"
            >
              <RemoveFormatting className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-border mx-1" />

            {/* Lists & Blocks */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              disabled={isUploading}
              aria-label="Bullet List"
              title="Bullet List"
              className={cn(
                'p-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-50',
                editor.isActive('bulletList') && 'bg-accent text-accent-foreground font-bold'
              )}
            >
              <List className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              disabled={isUploading}
              aria-label="Ordered List"
              title="Ordered List"
              className={cn(
                'p-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-50',
                editor.isActive('orderedList') && 'bg-accent text-accent-foreground font-bold'
              )}
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              disabled={isUploading}
              aria-label="Blockquote"
              title="Blockquote"
              className={cn(
                'p-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-50',
                editor.isActive('blockquote') && 'bg-accent text-accent-foreground font-bold'
              )}
            >
              <Quote className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              disabled={isUploading}
              aria-label="Code Block"
              title="Code Block"
              className={cn(
                'p-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-50',
                editor.isActive('codeBlock') && 'bg-accent text-accent-foreground font-bold'
              )}
            >
              <SquareCode className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              disabled={isUploading}
              aria-label="Horizontal Line"
              title="Horizontal Line"
              className="p-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Minus className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              disabled={isUploading}
              aria-label="Insert Table"
              title="Insert Table"
              className="p-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-50"
            >
              <TableIcon className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-border mx-1" />

            {/* Alignments */}
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              disabled={isUploading}
              aria-label="Align Left"
              title="Align Left"
              className={cn(
                'p-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-50',
                editor.isActive({ textAlign: 'left' }) && 'bg-accent text-accent-foreground'
              )}
            >
              <AlignLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              disabled={isUploading}
              aria-label="Align Center"
              title="Align Center"
              className={cn(
                'p-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-50',
                editor.isActive({ textAlign: 'center' }) && 'bg-accent text-accent-foreground'
              )}
            >
              <AlignCenter className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              disabled={isUploading}
              aria-label="Align Right"
              title="Align Right"
              className={cn(
                'p-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-50',
                editor.isActive({ textAlign: 'right' }) && 'bg-accent text-accent-foreground'
              )}
            >
              <AlignRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              disabled={isUploading}
              aria-label="Align Justify"
              title="Align Justify"
              className={cn(
                'p-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-50',
                editor.isActive({ textAlign: 'justify' }) && 'bg-accent text-accent-foreground'
              )}
            >
              <AlignJustify className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-border mx-1" />

            {/* Links & Secure Cloudinary Images */}
            <button
              type="button"
              onClick={openLinkModal}
              disabled={isUploading}
              aria-label="Insert Link"
              title="Insert Link"
              className={cn(
                'p-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-50',
                editor.isActive('link') && 'bg-accent text-accent-foreground'
              )}
            >
              <LinkIcon className="w-4 h-4" />
            </button>

            {editor.isActive('link') && (
              <button
                type="button"
                onClick={removeLink}
                disabled={isUploading}
                aria-label="Remove Link"
                title="Remove Link"
                className="p-1.5 rounded text-sm hover:bg-muted transition-colors text-destructive disabled:opacity-50"
              >
                <Unlink className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleToolbarImageClick}
              disabled={isUploading}
              aria-label="Insert Image (Upload to Cloudinary)"
              title="Insert Image (Upload to Cloudinary)"
              className="p-1.5 rounded text-sm hover:bg-muted transition-colors text-primary font-medium flex items-center gap-1 disabled:opacity-50"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-border mx-1" />

            {/* Undo / Redo */}
            <button
              type="button"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo() || isUploading}
              aria-label="Undo (Ctrl+Z)"
              title="Undo (Ctrl+Z)"
              className="p-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-40"
            >
              <Undo className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo() || isUploading}
              aria-label="Redo (Ctrl+Y)"
              title="Redo (Ctrl+Y)"
              className="p-1.5 rounded text-sm hover:bg-muted transition-colors disabled:opacity-40"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Inline Link Modal Dialog */}
        {isLinkDialogOpen && (
          <div className="flex items-center gap-2 p-2 bg-accent/40 border-b border-border text-xs">
            <span className="font-medium">URL:</span>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 h-7 px-2 border rounded bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setLink();
                } else if (e.key === 'Escape') {
                  setIsLinkDialogOpen(false);
                }
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={setLink}
              className="h-7 px-2.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Apply
            </button>
            <button
              type="button"
              onClick={() => setIsLinkDialogOpen(false)}
              className="h-7 px-2 bg-muted text-muted-foreground rounded text-xs hover:bg-muted/80"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Content Editable Body */}
        <div className="overflow-y-auto" style={{ minHeight, maxHeight }}>
          <EditorContent editor={editor} />
        </div>

        {/* Footer / Word Count Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>{wordCount} words</span>
            <span>
              {characterCount} {maxLength ? `/ ${maxLength}` : ''} characters
            </span>
          </div>

          {maxLength && (
            <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all',
                  characterCount > maxLength * 0.9 ? 'bg-destructive' : 'bg-primary'
                )}
                style={{ width: `${Math.min(100, (characterCount / maxLength) * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Image Upload Modal Dialog */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg p-5 flex flex-col gap-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileImage className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-base text-foreground">Insert Image into Rich Text</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                disabled={isUploading}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-border gap-2">
              <button
                type="button"
                onClick={() => setImageModalTab('upload')}
                className={cn(
                  'pb-2 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5',
                  imageModalTab === 'upload'
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Upload className="w-3.5 h-3.5" /> Upload File (Cloudinary)
              </button>
              <button
                type="button"
                onClick={() => setImageModalTab('url')}
                className={cn(
                  'pb-2 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5',
                  imageModalTab === 'url'
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <LinkIcon className="w-3.5 h-3.5" /> Image URL
              </button>
            </div>

            {/* Modal Error Banner */}
            {uploadError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2.5 text-xs text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-destructive" />
                <div className="flex-1">
                  <p className="font-semibold">Upload Error</p>
                  <p className="mt-0.5">{uploadError.message}</p>
                </div>
                {uploadError.retryFn && (
                  <button
                    type="button"
                    onClick={() => uploadError.retryFn && uploadError.retryFn()}
                    className="px-2 py-1 bg-destructive text-destructive-foreground rounded text-xs font-medium hover:bg-destructive/90 shrink-0 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                )}
              </div>
            )}

            {/* Tab Content: Upload File */}
            {imageModalTab === 'upload' ? (
              <div className="flex flex-col gap-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) {
                      const file = e.dataTransfer.files[0];
                      const valErr = validateImageFile(file);
                      if (valErr) {
                        setUploadError({ message: valErr, file });
                        notify.error('Invalid File', valErr);
                        return;
                      }
                      setSelectedFile(file);
                      setUploadError(null);
                      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
                      setFilePreviewUrl(URL.createObjectURL(file));
                      if (!imageAltInput) setImageAltInput(file.name.replace(/\.[^/.]+$/, ''));
                    }
                  }}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors',
                    selectedFile ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50 bg-muted/20'
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {filePreviewUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={filePreviewUrl}
                        alt="Preview"
                        className="max-h-32 rounded-md object-contain border border-border shadow-sm"
                      />
                      <span className="text-xs text-foreground font-medium truncate max-w-xs">
                        {selectedFile?.name} ({(selectedFile ? selectedFile.size / (1024 * 1024) : 0).toFixed(2)} MB)
                      </span>
                      <span className="text-[11px] text-muted-foreground">Click or drop another file to change</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <Upload className="w-8 h-8 text-muted-foreground mb-1" />
                      <p className="text-xs font-medium text-foreground">
                        Drag & drop image here or <span className="text-primary underline">browse</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Supports JPG, PNG, WEBP, GIF up to 10MB (SVGs disallowed)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Tab Content: URL */
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-foreground">Direct Image URL:</label>
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="https://res.cloudinary.com/example/image.jpg"
                  className="h-9 px-3 border border-input rounded-md text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}

            {/* Shared Image Properties: Alt Text, Alignment & Width */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">Alt Text / Description (SEO):</label>
                <input
                  type="text"
                  value={imageAltInput}
                  onChange={(e) => setImageAltInput(e.target.value)}
                  placeholder="e.g. Organic Cotton T-Shirt front view"
                  className="h-8 px-2.5 border border-input rounded-md text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">Alignment:</label>
                <div className="flex border border-input rounded-md overflow-hidden bg-background">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => setImageAlignment(align)}
                      className={cn(
                        'flex-1 py-1 text-xs capitalize transition-colors',
                        imageAlignment === align
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : 'hover:bg-muted text-muted-foreground'
                      )}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">Display Width:</label>
                <select
                  value={imageWidth}
                  onChange={(e) => setImageWidth(e.target.value as any)}
                  className="h-8 px-2 border border-input rounded-md text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="100%">100% (Full Width)</option>
                  <option value="75%">75% (Large)</option>
                  <option value="50%">50% (Medium)</option>
                  <option value="25%">25% (Small)</option>
                </select>
              </div>
            </div>

            {/* Progress bar inside modal if uploading */}
            {isUploading && (
              <div className="flex flex-col gap-1 pt-2">
                <div className="flex justify-between text-xs text-primary font-medium">
                  <span>Uploading to Cloudinary...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-primary/20 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                disabled={isUploading}
                className="px-3 py-1.5 border border-input rounded-md text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertImageFromModal}
                disabled={
                  isUploading ||
                  (imageModalTab === 'upload' && !selectedFile) ||
                  (imageModalTab === 'url' && !imageUrlInput.trim())
                }
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Insert Image
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Helper text or error message */}
      {(errorMessage || helperText) && (
        <p className={cn('text-xs mt-1.5', errorMessage ? 'text-destructive font-medium' : 'text-muted-foreground')}>
          {errorMessage || helperText}
        </p>
      )}
    </div>
  );
};
