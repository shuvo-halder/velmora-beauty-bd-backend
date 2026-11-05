import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pageService, Page } from '../../../services/page.service';
import { useAuth } from '../../../context/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
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
  FileText,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Globe,
  CheckCircle2,
  FileEdit,
} from 'lucide-react';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { notify } from '../../../lib/notify';

export function CmsPagesList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  // Permissions
  const canWrite = hasPermission('CMS', 'write');
  const canDelete = hasPermission('CMS', 'delete');

  // Filters and Pagination State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Delete Dialog State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteTitle, setConfirmDeleteTitle] = useState<string>('');

  // Fetch all CMS pages
  const { data: pages = [], isLoading, error, refetch } = useQuery({
    queryKey: ['cms-pages'],
    queryFn: pageService.getPages,
  });

  const deleteMutation = useMutation({
    mutationFn: pageService.deletePage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-pages'] });
      notify.success('Page Deleted', `CMS page "${confirmDeleteTitle}" has been removed.`);
      setConfirmDeleteId(null);
    },
    onError: (err: any) => {
      notify.apiError(err, 'Failed to delete CMS page.');
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
  const filteredPages = pages.filter((page) => {
    const matchesSearch =
      page.title.toLowerCase().includes(search.toLowerCase()) ||
      page.slug.toLowerCase().includes(search.toLowerCase()) ||
      (page.content && page.content.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || page.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || page.pageType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredPages.length / itemsPerPage);
  const paginatedPages = filteredPages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getStatusBadge = (status: Page['status']) => {
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

  const getClassificationBadge = (type: Page['pageType']) => {
    switch (type) {
      case 'HOME':
        return <Badge variant="default">Homepage</Badge>;
      case 'ABOUT':
        return <Badge variant="outline">About Us</Badge>;
      case 'CONTACT':
        return <Badge variant="outline">Contact</Badge>;
      case 'POLICY':
        return <Badge variant="secondary">Legal / Policy</Badge>;
      case 'CUSTOM':
      default:
        return <Badge variant="outline">Custom</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" /> Pages Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage static and standard content pages like Homepage, Contact, and Legal Policies.
          </p>
        </div>
        {canWrite && (
          <Button id="add-page-btn" onClick={() => navigate('/admin/cms/new')}>
            <Plus className="mr-2 h-4 w-4" /> Add CMS Page
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <Card id="filter-bar-card">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-input"
              placeholder="Search by title, slug or content..."
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
                id="status-filter-select"
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

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Page Classification:</span>
              <select
                id="type-filter-select"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="ALL">All Classifications</option>
                <option value="CUSTOM">Custom Page</option>
                <option value="HOME">Homepage</option>
                <option value="ABOUT">About Us</option>
                <option value="CONTACT">Contact Page</option>
                <option value="POLICY">Legal / Policy</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pages List View */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading CMS pages...</p>
        </div>
      ) : error ? (
        <Card id="error-card" className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <h3 className="text-lg font-semibold text-destructive">Error Fetching Pages</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              There was an error communicating with the API. Please refresh the page or try again.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : filteredPages.length === 0 ? (
        <Card id="empty-card" className="border-dashed">
          <CardContent className="p-12 text-center space-y-4">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto opacity-60" />
            <h3 className="text-lg font-semibold">No Pages Found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {search || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                ? 'No pages match your search criteria or filter options. Try adjusting filters.'
                : 'Get started by creating your very first CMS static or legal page.'}
            </p>
            {canWrite && (
              <Button onClick={() => navigate('/admin/cms/new')} variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Create New Page
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card id="table-card">
            <CardContent className="p-0">
              <Table id="pages-list-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Page Title</TableHead>
                    <TableHead>URL Path</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPages.map((page) => (
                    <TableRow key={page.id} className="hover:bg-muted/50">
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          <FileEdit className="h-4 w-4 text-primary" />
                          <span>{page.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        /pages/{page.slug}
                      </TableCell>
                      <TableCell>{getClassificationBadge(page.pageType)}</TableCell>
                      <TableCell>{getStatusBadge(page.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(page.updatedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button id={`actions-trigger-${page.id}`} variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canWrite && (
                              <DropdownMenuItem
                                id={`edit-item-${page.id}`}
                                onClick={() => navigate(`/admin/cms/${page.id}/edit`)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Page
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                id={`delete-item-${page.id}`}
                                onClick={() => handleDelete(page.id, page.title)}
                                className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Page
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <span className="text-xs text-muted-foreground">
                Showing {Math.min(filteredPages.length, (currentPage - 1) * itemsPerPage + 1)}-
                {Math.min(filteredPages.length, currentPage * itemsPerPage)} of{' '}
                {filteredPages.length} pages
              </span>
              <div className="flex items-center gap-2">
                <Button
                  id="prev-page-btn"
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
                  id="next-page-btn"
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
        title="Confirm Page Deletion"
        description={
          <>
            Are you sure you want to delete the CMS page <strong>"{confirmDeleteTitle}"</strong>? This will immediately take the page offline.
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
