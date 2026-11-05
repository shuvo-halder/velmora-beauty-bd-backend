declare global {
  interface Window {
    dataLayer: any[];
  }
}

export interface GA4Item {
  item_id: string;
  item_name: string;
  affiliation?: string;
  coupon?: string;
  discount?: number;
  index?: number;
  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  item_category3?: string;
  item_category4?: string;
  item_category5?: string;
  item_list_id?: string;
  item_list_name?: string;
  item_variant?: string;
  location_id?: string;
  price?: number;
  quantity?: number;
}

export const pushToDataLayer = (event: string, ecommerceData: any) => {
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer || [];
    // Clear the previous ecommerce object to prevent data bleeding
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event,
      ecommerce: ecommerceData,
    });
  }
};

// --- Product Events ---

export const trackViewItemList = (items: GA4Item[], listId?: string, listName?: string) => {
  pushToDataLayer("view_item_list", {
    item_list_id: listId,
    item_list_name: listName,
    items,
  });
};

export const trackViewItem = (item: GA4Item, value: number, currency = "BDT") => {
  pushToDataLayer("view_item", {
    currency,
    value,
    items: [item],
  });
};

export const trackSelectItem = (item: GA4Item, listId?: string, listName?: string) => {
  pushToDataLayer("select_item", {
    item_list_id: listId,
    item_list_name: listName,
    items: [item],
  });
};

// --- Cart Events ---

export const trackAddToCart = (item: GA4Item, value: number, currency = "BDT") => {
  pushToDataLayer("add_to_cart", {
    currency,
    value,
    items: [item],
  });
};

export const trackRemoveFromCart = (item: GA4Item, value: number, currency = "BDT") => {
  pushToDataLayer("remove_from_cart", {
    currency,
    value,
    items: [item],
  });
};

export const trackViewCart = (items: GA4Item[], value: number, currency = "BDT") => {
  pushToDataLayer("view_cart", {
    currency,
    value,
    items,
  });
};

// --- Checkout Events ---

export const trackBeginCheckout = (items: GA4Item[], value: number, currency = "BDT") => {
  pushToDataLayer("begin_checkout", {
    currency,
    value,
    items,
  });
};

export const trackAddShippingInfo = (items: GA4Item[], value: number, shippingTier: string, currency = "BDT") => {
  pushToDataLayer("add_shipping_info", {
    currency,
    value,
    shipping_tier: shippingTier,
    items,
  });
};

export const trackAddPaymentInfo = (items: GA4Item[], value: number, paymentType: string, currency = "BDT") => {
  pushToDataLayer("add_payment_info", {
    currency,
    value,
    payment_type: paymentType,
    items,
  });
};

// --- Purchase Events ---

export interface PurchaseData {
  transaction_id: string;
  affiliation?: string;
  value: number;
  tax?: number;
  shipping?: number;
  currency?: string;
  coupon?: string;
  items: GA4Item[];
}

export const trackPurchase = (data: PurchaseData) => {
  pushToDataLayer("purchase", {
    currency: data.currency || "BDT",
    transaction_id: data.transaction_id,
    affiliation: data.affiliation,
    value: data.value,
    tax: data.tax,
    shipping: data.shipping,
    coupon: data.coupon,
    items: data.items,
  });
};

export const trackRefund = (data: PurchaseData) => {
  pushToDataLayer("refund", {
    currency: data.currency || "BDT",
    transaction_id: data.transaction_id,
    affiliation: data.affiliation,
    value: data.value,
    tax: data.tax,
    shipping: data.shipping,
    coupon: data.coupon,
    items: data.items,
  });
};
