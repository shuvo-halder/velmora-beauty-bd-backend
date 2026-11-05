import React from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { useGA4 } from '@/src/hooks/useGA4';
import { GA4Item } from '@/src/lib/ga4-ecommerce';

const sampleProduct: GA4Item = {
  item_id: 'SKU_12345',
  item_name: 'Premium Wireless Headphones',
  affiliation: 'Google Merchandise Store',
  coupon: 'SUMMER_FUN',
  discount: 2.22,
  index: 0,
  item_brand: 'Google',
  item_category: 'Electronics',
  item_category2: 'Audio',
  item_variant: 'Black',
  location_id: 'ChIJIQBpAG2ahYAR_6128GcTUEo',
  price: 9.99,
  quantity: 1
};

export function GA4Example() {
  const { trackViewItem, trackAddToCart, trackBeginCheckout, trackPurchase } = useGA4();

  const handleViewItem = () => {
    trackViewItem({
      currency: 'BDT',
      value: 9.99,
      items: [sampleProduct]
    });
    console.log('view_item event sent to dataLayer');
  };

  const handleAddToCart = () => {
    trackAddToCart({
      currency: 'BDT',
      value: 9.99,
      items: [sampleProduct]
    });
    console.log('add_to_cart event sent to dataLayer');
  };

  const handleBeginCheckout = () => {
    trackBeginCheckout({
      currency: 'BDT',
      value: 9.99,
      coupon: 'SUMMER_FUN',
      items: [sampleProduct]
    });
    console.log('begin_checkout event sent to dataLayer');
  };

  const handlePurchase = () => {
    trackPurchase({
      transaction_id: 'T_12345_' + Math.floor(Math.random() * 1000),
      affiliation: 'Google Merchandise Store',
      value: 25.42,
      tax: 4.90,
      shipping: 5.99,
      currency: 'BDT',
      coupon: 'SUMMER_SALE',
      items: [sampleProduct]
    });
    console.log('purchase event sent to dataLayer');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">GA4 Ecommerce Tracking</h2>
      <p className="text-muted-foreground">
        Open your browser console to see the dataLayer updates when interacting with these buttons.
        Make sure you have configured your GTM container ID in index.html.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>View Item</CardTitle>
            <CardDescription>Triggers when a user views a product details page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleViewItem}>Trigger view_item</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add to Cart</CardTitle>
            <CardDescription>Triggers when a user adds a product to their cart.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleAddToCart}>Trigger add_to_cart</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Begin Checkout</CardTitle>
            <CardDescription>Triggers when a user starts the checkout process.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBeginCheckout}>Trigger begin_checkout</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase</CardTitle>
            <CardDescription>Triggers when a user completes an order.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="default" onClick={handlePurchase}>Trigger purchase</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
