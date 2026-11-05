import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Badge } from '@/src/components/ui/badge';
import { AlertTriangle, DollarSign, PackageX, Boxes } from 'lucide-react';
import { getLowStock, getOutOfStock, getInventoryValue, getAllInventory } from '../services/inventory.service';

export function Inventory() {
  const { data: lowStock = [] } = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: getLowStock,
  });

  const { data: outOfStock = [] } = useQuery({
    queryKey: ['inventory', 'out-of-stock'],
    queryFn: getOutOfStock,
  });

  const { data: inventoryValue = { totalValue: 0 } } = useQuery({
    queryKey: ['inventory', 'value'],
    queryFn: getInventoryValue,
  });

  const { data: allInventory = [] } = useQuery({
    queryKey: ['inventory', 'all'],
    queryFn: getAllInventory,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ৳{(inventoryValue.totalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated inventory value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{lowStock.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Items below threshold
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <PackageX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{outOfStock.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Items with 0 quantity
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tracked Items</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allInventory.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Variants and products
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-amber-500">
              <AlertTriangle className="mr-2 h-5 w-5" /> Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Threshold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      No low stock items.
                    </TableCell>
                  </TableRow>
                ) : (
                  lowStock.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.variant ? `${item.variant.product?.name} - ${item.variant.sku}` : item.product?.name}
                      </TableCell>
                      <TableCell className="text-amber-500 font-bold">{item.quantityAvailable}</TableCell>
                      <TableCell>{item.lowStockThreshold}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <PackageX className="mr-2 h-5 w-5" /> Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outOfStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      No out of stock items.
                    </TableCell>
                  </TableRow>
                ) : (
                  outOfStock.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.variant ? item.variant.product?.name : item.product?.name}
                      </TableCell>
                      <TableCell>{item.variant ? item.variant.sku : item.product?.sku}</TableCell>
                      <TableCell><Badge variant="destructive">Out of Stock</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item / Variant</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Reserved</TableHead>
                <TableHead>Total Quantity</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allInventory.map((item: any) => {
                let price = 0;
                if (item.variant && item.variant.price) {
                  price = Number(item.variant.price);
                } else if (item.product && item.product.price) {
                  price = Number(item.product.price);
                }
                const value = price * item.quantityAvailable;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.variant ? item.variant.product?.name : item.product?.name}
                    </TableCell>
                    <TableCell>{item.variant ? item.variant.sku : item.product?.sku}</TableCell>
                    <TableCell>{item.warehouse?.name || 'Main Warehouse'}</TableCell>
                    <TableCell>
                      <span className={item.quantityAvailable <= 0 ? 'text-destructive font-bold' : item.quantityAvailable <= item.lowStockThreshold ? 'text-amber-500 font-bold' : ''}>
                        {item.quantityAvailable}
                      </span>
                    </TableCell>
                    <TableCell>{item.quantityReserved}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>৳{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
