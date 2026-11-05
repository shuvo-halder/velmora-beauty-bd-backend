

import { prisma } from "../../config/db";

export interface FeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  image_link?: string;
  availability: string;
  price?: string;
  brand?: string;
  condition: string;
  gtin?: string;
  mpn?: string;
  sku?: string;
  googleProductCategory?: string;
}

export const merchantService = {
  async getFeedData(host: string): Promise<FeedItem[]> {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        status: "Active",
        deletedAt: null
      },
      include: {
        category: true,
        brand: true,
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 1
        },
        inventory: true,
        variants: {
          include: {
            inventories: true
          }
        }
      }
    });

    return products.map(product => {
      let inStock = false;
      if (product.inventory && (product.inventory.quantityAvailable > 0 || (product.inventory as any).quantity > 0)) {
        inStock = true;
      } else if (product.variants && product.variants.some((v: any) => v.inventories && v.inventories.some((i: any) => i.quantityAvailable > 0 || i.quantity > 0))) {
        inStock = true;
      }

      const primaryImage = product.images?.[0]?.url;

      return {
        id: product.id,
        title: product.name,
        description: product.description || product.shortDescription || product.name,
        link: `https://${host}/products/${product.slug}`,
        image_link: primaryImage,
        availability: inStock ? 'in stock' : 'out of stock',
        price: product.price ? `${Number(product.price).toFixed(2)} BDT` : undefined,
        brand: product.brand?.name,
        condition: product.condition || 'new',
        gtin: product.gtin || undefined,
        mpn: product.mpn || undefined,
        sku: product.sku || undefined,
        googleProductCategory: product.category?.name
      };
    });
  },

  generateXmlFeed(items: FeedItem[], host: string): string {
    const escapeXml = (unsafe: string) => {
      if (!unsafe) return '';
      return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });
    };

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n`;
    xml += `  <channel>\n`;
    xml += `    <title>Storefront Feed</title>\n`;
    xml += `    <link>https://${host}</link>\n`;
    xml += `    <description>Product feed for Google Merchant Center</description>\n`;

    for (const item of items) {
      xml += `    <item>\n`;
      xml += `      <g:id>${escapeXml(item.id)}</g:id>\n`;
      xml += `      <title>${escapeXml(item.title)}</title>\n`;
      xml += `      <description>${escapeXml(item.description)}</description>\n`;
      xml += `      <link>${escapeXml(item.link)}</link>\n`;
      if (item.image_link) xml += `      <g:image_link>${escapeXml(item.image_link)}</g:image_link>\n`;
      xml += `      <g:availability>${item.availability}</g:availability>\n`;
      if (item.price) xml += `      <g:price>${item.price}</g:price>\n`;
      if (item.brand) xml += `      <g:brand>${escapeXml(item.brand)}</g:brand>\n`;
      if (item.condition) xml += `      <g:condition>${item.condition}</g:condition>\n`;
      if (item.gtin) xml += `      <g:gtin>${escapeXml(item.gtin)}</g:gtin>\n`;
      if (item.mpn) xml += `      <g:mpn>${escapeXml(item.mpn)}</g:mpn>\n`;
      if (item.sku) xml += `      <g:sku>${escapeXml(item.sku)}</g:sku>\n`;
      if (item.googleProductCategory) xml += `      <g:google_product_category>${escapeXml(item.googleProductCategory)}</g:google_product_category>\n`;
      xml += `    </item>\n`;
    }

    xml += `  </channel>\n`;
    xml += `</rss>`;
    return xml;
  }
};
