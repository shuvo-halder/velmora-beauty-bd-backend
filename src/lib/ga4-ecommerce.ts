import { z, ZodError } from 'zod';

// GA4 Item Interface
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
  currency?: string;
}

// Zod Validation Schema for GA4 Item
export const GA4ItemSchema = z.object({
  item_id: z.string().min(1, "item_id is required"),
  item_name: z.string().min(1, "item_name is required"),
  affiliation: z.string().optional(),
  coupon: z.string().optional(),
  discount: z.number().optional(),
  index: z.number().optional(),
  item_brand: z.string().optional(),
  item_category: z.string().optional(),
  item_category2: z.string().optional(),
  item_category3: z.string().optional(),
  item_category4: z.string().optional(),
  item_category5: z.string().optional(),
  item_list_id: z.string().optional(),
  item_list_name: z.string().optional(),
  item_variant: z.string().optional(),
  location_id: z.string().optional(),
  price: z.number().optional(),
  quantity: z.number().optional(),
  currency: z.string().default("BDT").optional(),
});

// GA4 Ecommerce Event Parameters
export interface GA4EcommerceEventParams {
  currency?: string;
  value?: number;
  transaction_id?: string;
  coupon?: string;
  shipping?: number;
  tax?: number;
  items: GA4Item[];
}

export const GA4EventParamsSchema = z.object({
  currency: z.string().default("BDT").optional(),
  value: z.number().optional(),
  transaction_id: z.string().optional(),
  coupon: z.string().optional(),
  shipping: z.number().optional(),
  tax: z.number().optional(),
  items: z.array(GA4ItemSchema).min(1, "At least one item is required")
});

/**
 * Validates a GA4 item object against the official schema
 * @param item GA4Item object
 * @returns Object with isValid boolean and any errors
 */
export const validateGA4Item = (item: any): { isValid: boolean; errors?: any; data?: GA4Item } => {
  try {
    const validData = GA4ItemSchema.parse(item);
    return { isValid: true, data: validData };
  } catch (error: any) {
    if (error instanceof ZodError) {
      return { isValid: false, errors: (error as ZodError<any>).issues };
    }
    return { isValid: false, errors: error };
  }
};

/**
 * Validates a GA4 ecommerce event parameters object
 * @param params GA4EcommerceEventParams object
 * @returns Object with isValid boolean and any errors
 */
export const validateGA4EventParams = (params: any): { isValid: boolean; errors?: any; data?: GA4EcommerceEventParams } => {
  try {
    const validData = GA4EventParamsSchema.parse(params);
    return { isValid: true, data: validData as GA4EcommerceEventParams };
  } catch (error: any) {
    if (error instanceof ZodError) {
      return { isValid: false, errors: (error as ZodError<any>).issues };
    }
    return { isValid: false, errors: error };
  }
};
