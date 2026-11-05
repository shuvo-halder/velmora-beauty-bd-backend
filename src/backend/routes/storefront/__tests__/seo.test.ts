import test from "node:test";
import assert from "node:assert";
import request from "supertest";
import express from "express";

import storefrontSeoRouter from "../seo.routes";
import { errorHandler } from "../../../middlewares/errorHandler";
import { storefrontRequestLogger } from "../../../middlewares/storefront/logging.middleware";

import { prisma } from "../../../config/db";
const app = express();
app.use(express.json());

const storefrontRouter = express.Router();
storefrontRouter.use(storefrontRequestLogger);
storefrontRouter.use("/seo", storefrontSeoRouter);
app.use("/api/storefront/v1", storefrontRouter);

app.use(errorHandler);

const TEST_PREFIX = "test-seo-";

test("Storefront SEO Integration Tests", async (t) => {
  let catId = "";
  let brandId = "";
  let p1Id = "";
  let p2Id = "";

  t.before(async () => {
    // Cleanup first
    await prisma.productImage.deleteMany({
      where: {
        product: {
          slug: { startsWith: TEST_PREFIX }
        }
      }
    });
    await prisma.product.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.brand.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });

    // Seed test Category
    const cat = await prisma.category.create({
      data: {
        name: "SEO Cat",
        slug: `${TEST_PREFIX}cat`,
        description: "Cat description text",
        metaTitle: "SEO Cat Meta Title",
        metaDescription: "SEO Cat Meta Desc",
        image: "https://example.com/cat.png",
        isActive: true
      }
    });
    catId = cat.id;

    // Seed test Brand
    const brand = await prisma.brand.create({
      data: {
        name: "SEO Brand",
        slug: `${TEST_PREFIX}brand`,
        description: "Brand description text",
        logoUrl: "https://example.com/brand-logo.png",
        isActive: true
      }
    });
    brandId = brand.id;

    // Seed Product 1: All meta fields + primary image
    const p1 = await prisma.product.create({
      data: {
        name: "SEO Prod 1",
        slug: `${TEST_PREFIX}prod-1`,
        categoryId: catId,
        brandId: brandId,
        isActive: true,
        status: "Active",
        metaTitle: "SEO Product 1 Meta Title",
        metaDescription: "SEO Product 1 Meta Description",
        price: 99.99,
        sku: "SEO-SKU-1",
        condition: "new"
      }
    });
    p1Id = p1.id;

    await prisma.productImage.createMany({
      data: [
        { productId: p1Id, url: "https://example.com/fallback-first.png", isPrimary: false, sortOrder: 1 },
        { productId: p1Id, url: "https://example.com/primary.png", isPrimary: true, sortOrder: 0 }
      ]
    });

    // Seed Product 2: Fallbacks (no meta fields, description fallbacks)
    const p2 = await prisma.product.create({
      data: {
        name: "SEO Prod 2",
        slug: `${TEST_PREFIX}prod-2`,
        categoryId: catId,
        isActive: true,
        status: "Active",
        shortDescription: "Short description text 2",
        description: "Full description text 2",
        price: 19.99,
        sku: "SEO-SKU-2"
      }
    });
    p2Id = p2.id;

    await prisma.productImage.create({
      data: { productId: p2Id, url: "https://example.com/first-only.png", isPrimary: false, sortOrder: 0 }
    });

    // Seed Product 3: Inactive (should return 404 for SEO as well)
    await prisma.product.create({
      data: {
        name: "SEO Prod 3",
        slug: `${TEST_PREFIX}prod-3`,
        categoryId: catId,
        isActive: false,
        status: "Active"
      }
    });
  });

  t.after(async () => {
    await prisma.productImage.deleteMany({
      where: {
        product: {
          slug: { startsWith: TEST_PREFIX }
        }
      }
    });
    await prisma.product.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.brand.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.$disconnect();
  });

  await t.test("Product SEO - All Metadata Provided", async () => {
    const res = await request(app).get(`/api/storefront/v1/seo/product/${TEST_PREFIX}prod-1`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    
    const { seo, openGraph, twitter, structuredData } = res.body.data;
    
    // SEO block
    assert.strictEqual(seo.title, "SEO Product 1 Meta Title");
    assert.strictEqual(seo.description, "SEO Product 1 Meta Description");
    assert.ok(seo.canonicalUrl.endsWith(`/products/${TEST_PREFIX}prod-1`));

    // OpenGraph block
    assert.strictEqual(openGraph.ogTitle, "SEO Product 1 Meta Title");
    assert.strictEqual(openGraph.ogDescription, "SEO Product 1 Meta Description");
    assert.strictEqual(openGraph.ogImage, "https://example.com/primary.png");
    assert.strictEqual(openGraph.ogType, "product");

    // Twitter Card block
    assert.strictEqual(twitter.twitterTitle, "SEO Product 1 Meta Title");
    assert.strictEqual(twitter.twitterImage, "https://example.com/primary.png");
    assert.strictEqual(twitter.twitterCard, "summary_large_image");

    // JSON-LD structured data
    assert.strictEqual(structuredData["@context"], "https://schema.org");
    assert.strictEqual(structuredData["@type"], "Product");
    assert.strictEqual(structuredData.name, "SEO Prod 1");
    assert.strictEqual(structuredData.sku, "SEO-SKU-1");
    assert.strictEqual(structuredData.brand.name, "SEO Brand");
    assert.strictEqual(structuredData.offers.price, "99.99");
  });

  await t.test("Product SEO - Fallbacks (No explicit metadata, first image fallback)", async () => {
    const res = await request(app).get(`/api/storefront/v1/seo/product/${TEST_PREFIX}prod-2`);
    assert.strictEqual(res.status, 200);
    
    const { seo, openGraph, twitter, structuredData } = res.body.data;

    // seoTitle fallback: metaTitle -> name
    assert.strictEqual(seo.title, "SEO Prod 2");

    // seoDescription fallback: metaDescription -> shortDescription -> description
    assert.strictEqual(seo.description, "Short description text 2");

    // ogImage fallback: primary image -> first image
    assert.strictEqual(openGraph.ogImage, "https://example.com/first-only.png");
    assert.strictEqual(twitter.twitterImage, "https://example.com/first-only.png");

    assert.strictEqual(structuredData.name, "SEO Prod 2");
    assert.strictEqual(structuredData.offers.price, "19.99");
  });

  await t.test("Product SEO - 404 for Inactive or Missing Product", async () => {
    const resInactive = await request(app).get(`/api/storefront/v1/seo/product/${TEST_PREFIX}prod-3`);
    assert.strictEqual(resInactive.status, 404);

    const resMissing = await request(app).get(`/api/storefront/v1/seo/product/${TEST_PREFIX}non-existent`);
    assert.strictEqual(resMissing.status, 404);
  });

  await t.test("Category SEO", async () => {
    const res = await request(app).get(`/api/storefront/v1/seo/category/${TEST_PREFIX}cat`);
    assert.strictEqual(res.status, 200);

    const { seo, openGraph, twitter, structuredData } = res.body.data;

    // seoTitle fallback: seoTitle -> name
    assert.strictEqual(seo.title, "SEO Cat Meta Title");
    // seoDescription fallback: seoDescription -> description
    assert.strictEqual(seo.description, "SEO Cat Meta Desc");
    assert.strictEqual(openGraph.ogImage, "https://example.com/cat.png");

    assert.strictEqual(structuredData["@context"], "https://schema.org");
    assert.strictEqual(structuredData["@type"], "CollectionPage");
    assert.strictEqual(structuredData.name, "SEO Cat");
  });

  await t.test("Brand SEO", async () => {
    const res = await request(app).get(`/api/storefront/v1/seo/brand/${TEST_PREFIX}brand`);
    assert.strictEqual(res.status, 200);

    const { seo, openGraph, twitter, structuredData } = res.body.data;

    assert.strictEqual(seo.title, "SEO Brand");
    assert.strictEqual(seo.description, "Brand description text");
    assert.strictEqual(openGraph.ogImage, "https://example.com/brand-logo.png");

    assert.strictEqual(structuredData["@context"], "https://schema.org");
    assert.strictEqual(structuredData["@type"], "Brand");
    assert.strictEqual(structuredData.name, "SEO Brand");
  });

  await t.test("Search SEO", async () => {
    const res = await request(app).get("/api/storefront/v1/seo/search?q=laptop");
    assert.strictEqual(res.status, 200);

    const { seo, openGraph, twitter, structuredData } = res.body.data;

    assert.strictEqual(seo.title, 'Search results for "laptop"');
    assert.ok(seo.canonicalUrl.includes("/search?q=laptop"));
    assert.strictEqual(structuredData["@type"], "SearchResultsPage");
  });

  await t.test("Search SEO - 400 Validation Error for missing query", async () => {
    const res = await request(app).get("/api/storefront/v1/seo/search");
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Validation Error");
  });
});
