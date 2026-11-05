import { z } from "zod";

export const SeoSlugSchema = z.object({
  slug: z.string().min(1).max(255)
});

export const SeoSearchQuerySchema = z.object({
  q: z.string().min(1)
});

export interface SeoResponse {
  seo: {
    title: string;
    description: string;
    canonicalUrl: string;
  };
  openGraph: {
    ogTitle: string;
    ogDescription: string;
    ogImage: string | null;
    ogUrl: string;
    ogType: string;
  };
  twitter: {
    twitterTitle: string;
    twitterDescription: string;
    twitterImage: string | null;
    twitterCard: string;
  };
  structuredData: Record<string, any>;
}
