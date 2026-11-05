import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProductById } from '../../services/product.service';
import { ArrowLeft, Edit, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { ProductVariants } from './ProductVariants';

export function ProductView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProductById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (!product) {
    return <div className="p-8 text-center text-destructive">Product not found</div>;
  }
  
  const primaryImage = product.images?.find(i => i.isPrimary)?.url;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/products')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Product Details</h2>
        </div>
        <Button onClick={() => navigate(`/products/${product.id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" /> Edit Product
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">{product.name}</CardTitle>
                <Badge variant={product.status === 'Active' ? 'success' : 'secondary'} className="text-sm px-3 py-1">
                  {product.status || 'Draft'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">SKU</h3>
                    <p className="text-lg">{product.sku || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Price</h3>
                    <p className="text-lg">{product.price ? `৳${Number(product.price).toFixed(2)}` : 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Category</h3>
                    <p className="text-lg">{product.category?.name || 'Uncategorized'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Brand</h3>
                    <p className="text-lg">{product.brand?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Barcode</h3>
                    <p className="text-lg">{product.barcode || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">GTIN</h3>
                    <p className="text-lg">{product.gtin || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">MPN</h3>
                    <p className="text-lg">{product.mpn || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Condition</h3>
                    <p className="text-lg capitalize">{product.condition || 'New'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Stock</h3>
                    <p className="text-lg">
                      {product.trackInventory ? (product.inventory?.quantity || 0) : 'Not Tracked'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Short Description</h3>
                {product.shortDescription ? (
                  <div 
                    className="prose prose-sm max-w-none text-foreground dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: product.shortDescription }}
                  />
                ) : (
                  <p className="text-base text-muted-foreground">No short description provided.</p>
                )}
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                {product.description ? (
                  <div 
                    className="prose prose-sm max-w-none text-foreground dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                ) : (
                  <p className="text-base text-muted-foreground">No description provided.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Product Media</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Primary Image / Thumbnail */}
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Primary Thumbnail
                </span>
                {product.thumbnail || (typeof product.primaryImage === 'string' ? product.primaryImage : product.primaryImage?.imageUrl || product.primaryImage?.url) || product.images?.find((i: any) => i.isPrimary)?.url ? (
                  <div className="aspect-square w-full overflow-hidden rounded-xl border bg-muted shadow-sm">
                    <img 
                      src={
                        product.thumbnail || 
                        (typeof product.primaryImage === 'string' ? product.primaryImage : product.primaryImage?.imageUrl || product.primaryImage?.url) || 
                        product.images?.find((i: any) => i.isPrimary)?.url ||
                        product.images?.[0]?.url
                      } 
                      alt={product.name} 
                      className="object-cover w-full h-full" 
                    />
                  </div>
                ) : (
                  <div className="aspect-square w-full rounded-xl border bg-muted flex flex-col items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
                    <span className="text-sm">No primary image</span>
                  </div>
                )}
              </div>

              {/* Gallery Images */}
              {product.images && product.images.length > 1 && (
                <div className="pt-2 border-t">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                    Media Gallery ({product.images.length})
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {product.images.map((img: any, idx: number) => {
                      const src = img.imageUrl || img.url;
                      return (
                        <div key={img.id || idx} className="aspect-square rounded-lg border overflow-hidden bg-muted relative group">
                          <img src={src} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                          {img.isPrimary && (
                            <span className="absolute bottom-1 left-1 bg-amber-500 text-white text-[9px] font-bold px-1 rounded shadow">
                              Primary
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>SEO Meta</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Meta Title</h3>
                <p className="text-sm mt-1">{product.metaTitle || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Meta Description</h3>
                <p className="text-sm mt-1 text-muted-foreground">{product.metaDescription || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ProductVariants productId={product.id} />
    </div>
  );
}
