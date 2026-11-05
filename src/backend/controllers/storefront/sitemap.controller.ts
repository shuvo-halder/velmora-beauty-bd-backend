console.log("Sitemap controller loaded");
import { Request, Response } from "express";
import { prisma } from "../../config/db";

const getBaseUrl = (req: Request) => {
  const envUrl = process.env.STOREFRONT_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }
  return `https://${req.get("host") || "domain.com"}`;
};

export const getSitemap = async (req: Request, res: Response, next: any) => {
  try {
    console.log("getSitemap executed");
    const baseUrl = getBaseUrl(req);
    
    // Fetch products
    const products = await prisma.product.findMany({
      where: { deletedAt: null, isActive: true, status: "Active" },
      select: { slug: true, updatedAt: true, canonicalUrl: true }
    });
    
    // Fetch categories
    const categories = await prisma.category.findMany({
      where: { deletedAt: null, isActive: true },
      select: { slug: true, updatedAt: true, canonicalUrl: true }
    });

    // Fetch CMS Pages
    const pages = await prisma.page.findMany({
      where: { deletedAt: null, status: "PUBLISHED" },
      select: { slug: true, updatedAt: true }
    });

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Add home
    sitemap += `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

    products.forEach(p => {
      const url = p.canonicalUrl || `${baseUrl}/products/${p.slug}`;
      sitemap += `  <url>\n    <loc>${url}</loc>\n    <lastmod>${p.updatedAt.toISOString()}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });

    categories.forEach(c => {
      const url = c.canonicalUrl || `${baseUrl}/categories/${c.slug}`;
      sitemap += `  <url>\n    <loc>${url}</loc>\n    <lastmod>${c.updatedAt.toISOString()}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    });
    
    pages.forEach(p => {
      const url = `${baseUrl}/pages/${p.slug}`;
      sitemap += `  <url>\n    <loc>${url}</loc>\n    <lastmod>${p.updatedAt.toISOString()}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
    });

    sitemap += "</urlset>";

    res.header("Content-Type", "application/xml");
    res.send(sitemap);
  } catch (err) {
    next(err);
  }
};

export const getRobotsTxt = async (req: Request, res: Response, next: any) => {
  try {
    console.log("getRobotsTxt executed");
    const baseUrl = getBaseUrl(req);
    const robots = `User-agent: *
Allow: /
Disallow: /checkout/
Disallow: /account/
Disallow: /cart/

Sitemap: ${baseUrl}/api/storefront/v1/sitemap
`;
    res.header("Content-Type", "text/plain");
    res.send(robots);
  } catch (err) {
    next(err);
  }
};
