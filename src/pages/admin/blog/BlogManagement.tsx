import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blogService } from '../../../services/blog.service';
import { useAuth } from '../../../context/AuthContext';
import { mediaService } from '../../../services/media.service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  PenTool,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Globe,
  FileEdit,
  Image as ImageIcon,
  User as UserIcon,
} from 'lucide-react';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { notify } from '../../../lib/notify';

export function BlogManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  // Permissions
  const canWrite = hasPermission('Blog', 'write');
  const canDelete = hasPermission('Blog', 'delete');

  // Filters and Pagination State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Delete Dialog State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteTitle, setConfirmDeleteTitle] = useState<string>('');

  // Fetch all Blog posts
  const { data: posts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: blogService.getPosts,
  });

  // Fetch media library assets to resolve post image previews
  const { data: mediaAssets = [] } = useQuery({
    queryKey: ['media-assets'],
    queryFn: () => mediaService.getAssets(),
  });

  const deleteMutation = useMutation({
    mutationFn: blogService.deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      notify.success('Blog Post Deleted', `Post "${confirmDeleteTitle}" has been removed.`);
      setConfirmDeleteId(null);
    },
    onError: (err: any) => {
      notify.apiError(err, 'Failed to delete blog post.');
      setConfirmDeleteId(null);
    },
  });

  const handleDelete = (id: string, title: string) => {
    setConfirmDeleteTitle(title);
    setConfirmDeleteId(id);
  };

  const confirmDelete = () => {
    if (confirmDeleteId) {
      deleteMutation.mutate(confirmDeleteId);
    }
  };

  // Filter and search computation
  const filteredPosts = posts.filter((post: any) => {
    const matchesSearch =
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.slug.toLowerCase().includes(search.toLowerCase()) ||
      (post.excerpt && post.excerpt.toLowerCase().includes(search.toLowerCase())) ||
      (post.content && post.content.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || post.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge variant="success">Published</Badge>;
      case 'SCHEDULED':
        return <Badge variant="warning">Scheduled</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <PenTool className="h-8 w-8 text-primary" /> Blog Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your store's blog posts, announcements, articles, and scheduled updates.
          </p>
        </div>
        {canWrite && (
          <Button id="add-post-btn" onClick={() => navigate('/admin/blog/new')}>
            <Plus className="mr-2 h-4 w-4" /> Add Blog Post
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <Card id="blog-filter-bar-card">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="blog-search-input"
              placeholder="Search by title, slug, excerpt or content..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 w-full"
            />
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Status:</span>
              <select
                id="blog-status-filter-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="SCHEDULED">Scheduled</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts List View */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading blog posts...</p>
        </div>
      ) : error ? (
        <Card id="blog-error-card" className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <h3 className="text-lg font-semibold text-destructive">Error Fetching Blog Posts</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              There was an error communicating with the API. Please refresh the page or try again.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : filteredPosts.length === 0 ? (
        <Card id="blog-empty-card" className="border-dashed">
          <CardContent className="p-12 text-center space-y-4">
            <PenTool className="h-12 w-12 text-muted-foreground mx-auto opacity-60" />
            <h3 className="text-lg font-semibold">No Blog Posts Found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {search || statusFilter !== 'ALL'
                ? 'No posts match your search or filter options. Try adjusting filters.'
                : 'Share news, marketing updates, or educational stories by creating your first article.'}
            </p>
            {canWrite && (
              <Button onClick={() => navigate('/admin/blog/new')} variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Create New Post
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card id="blog-table-card">
            <CardContent className="p-0">
              <Table id="blog-posts-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Cover</TableHead>
                    <TableHead>Post Details</TableHead>
                    <TableHead>URL Path</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPosts.map((post: any) => {
                    // Resolve featured image URL
                    const resolvedImage = mediaAssets.find((asset: any) => asset.id === post.featuredImageId);
                    
                    return (
                      <TableRow key={post.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="h-12 w-12 rounded border bg-muted/30 flex items-center justify-center overflow-hidden">
                            {resolvedImage ? (
                              <img
                                src={resolvedImage.url}
                                alt={resolvedImage.altText || post.title}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover animate-fade-in"
                              />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          <div className="flex flex-col gap-0.5">
                            <span className="line-clamp-1 text-foreground">{post.title}</span>
                            {post.excerpt && (
                              <span className="text-xs text-muted-foreground line-clamp-1 font-normal">
                                {post.excerpt.replace(/<[^>]*>/g, '')}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">
                          /blog/{post.slug}
                        </TableCell>
                        <TableCell>{getStatusBadge(post.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(post.updatedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button id={`blog-actions-trigger-${post.id}`} variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canWrite && (
                                <DropdownMenuItem
                                  id={`blog-edit-item-${post.id}`}
                                  onClick={() => navigate(`/admin/blog/${post.id}/edit`)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Post
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem
                                  id={`blog-delete-item-${post.id}`}
                                  onClick={() => handleDelete(post.id, post.title)}
                                  className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Post
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <span className="text-xs text-muted-foreground">
                Showing {Math.min(filteredPosts.length, (currentPage - 1) * itemsPerPage + 1)}-
                {Math.min(filteredPosts.length, currentPage * itemsPerPage)} of{' '}
                {filteredPosts.length} posts
              </span>
              <div className="flex items-center gap-2">
                <Button
                  id="blog-prev-page-btn"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  id="blog-next-page-btn"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
        title="Confirm Blog Post Deletion"
        description={
          <>
            Are you sure you want to delete the blog post <strong>"{confirmDeleteTitle}"</strong>? This will immediately remove it from your store blog feed.
          </>
        }
        confirmText="Delete Permanently"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
