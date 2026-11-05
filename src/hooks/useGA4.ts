import { useCallback } from 'react';
import { ga4 } from '../lib/ga4';
import { GA4EcommerceEventParams, GA4Item } from '../lib/ga4-ecommerce';

export function useGA4() {
  const trackViewItem = useCallback((params: GA4EcommerceEventParams) => {
    ga4.viewItem(params);
  }, []);

  const trackViewItemList = useCallback((params: { item_list_id?: string; item_list_name?: string; items: GA4Item[] }) => {
    ga4.viewItemList(params);
  }, []);

  const trackSelectItem = useCallback((params: { item_list_id?: string; item_list_name?: string; items: GA4Item[] }) => {
    ga4.selectItem(params);
  }, []);

  const trackAddToCart = useCallback((params: GA4EcommerceEventParams) => {
    ga4.addToCart(params);
  }, []);

  const trackRemoveFromCart = useCallback((params: GA4EcommerceEventParams) => {
    ga4.removeFromCart(params);
  }, []);

  const trackViewCart = useCallback((params: GA4EcommerceEventParams) => {
    ga4.viewCart(params);
  }, []);

  const trackBeginCheckout = useCallback((params: GA4EcommerceEventParams) => {
    ga4.beginCheckout(params);
  }, []);

  const trackAddShippingInfo = useCallback((params: GA4EcommerceEventParams & { shipping_tier?: string }) => {
    ga4.addShippingInfo(params);
  }, []);

  const trackAddPaymentInfo = useCallback((params: GA4EcommerceEventParams & { payment_type?: string }) => {
    ga4.addPaymentInfo(params);
  }, []);

  const trackPurchase = useCallback((params: GA4EcommerceEventParams & { transaction_id: string; affiliation?: string }) => {
    ga4.purchase(params);
  }, []);

  const trackRefund = useCallback((params: GA4EcommerceEventParams & { transaction_id: string; affiliation?: string }) => {
    ga4.refund(params);
  }, []);

  return {
    trackViewItem,
    trackViewItemList,
    trackSelectItem,
    trackAddToCart,
    trackRemoveFromCart,
    trackViewCart,
    trackBeginCheckout,
    trackAddShippingInfo,
    trackAddPaymentInfo,
    trackPurchase,
    trackRefund
  };
}
