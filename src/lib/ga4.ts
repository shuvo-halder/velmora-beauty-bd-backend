import { GA4EcommerceEventParams, GA4Item } from './ga4-ecommerce';

// Extend window object for dataLayer
declare global {
  interface Window {
    dataLayer: any[];
  }
}

/**
 * Pushes an event to the Google Tag Manager dataLayer
 */
const pushToDataLayer = (eventName: string, eventParams: any) => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ ecommerce: null }); // Clear previous ecommerce object
    window.dataLayer.push({
      event: eventName,
      ecommerce: eventParams,
    });
  } else {
    console.warn('GA4 Tracking: window is not defined');
  }
};

export const ga4 = {
  viewItem: (params: GA4EcommerceEventParams) => {
    pushToDataLayer('view_item', params);
  },
  
  viewItemList: (params: { item_list_id?: string; item_list_name?: string; items: GA4Item[] }) => {
    pushToDataLayer('view_item_list', params);
  },
  
  selectItem: (params: { item_list_id?: string; item_list_name?: string; items: GA4Item[] }) => {
    pushToDataLayer('select_item', params);
  },
  
  addToCart: (params: GA4EcommerceEventParams) => {
    pushToDataLayer('add_to_cart', params);
  },
  
  removeFromCart: (params: GA4EcommerceEventParams) => {
    pushToDataLayer('remove_from_cart', params);
  },
  
  viewCart: (params: GA4EcommerceEventParams) => {
    pushToDataLayer('view_cart', params);
  },
  
  beginCheckout: (params: GA4EcommerceEventParams) => {
    pushToDataLayer('begin_checkout', params);
  },
  
  addShippingInfo: (params: GA4EcommerceEventParams & { shipping_tier?: string }) => {
    pushToDataLayer('add_shipping_info', params);
  },
  
  addPaymentInfo: (params: GA4EcommerceEventParams & { payment_type?: string }) => {
    pushToDataLayer('add_payment_info', params);
  },
  
  purchase: (params: GA4EcommerceEventParams & { transaction_id: string; affiliation?: string }) => {
    pushToDataLayer('purchase', params);
  },
  
  refund: (params: GA4EcommerceEventParams & { transaction_id: string; affiliation?: string }) => {
    pushToDataLayer('refund', params);
  }
};
