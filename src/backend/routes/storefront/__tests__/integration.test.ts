import test from "node:test";
import assert from "node:assert";
import request from "supertest";
import express from "express";

import storefrontProductRouter from "../product.routes";
import storefrontCategoryRouter from "../category.routes";
import storefrontBrandRouter from "../brand.routes";
import { errorHandler } from "../../../middlewares/errorHandler";

import { prisma } from "../../../config/db";
const app = express();
app.use(express.json());

const storefrontRouter = express.Router();
storefrontRouter.use("/products", storefrontProductRouter);
storefrontRouter.use("/categories", storefrontCategoryRouter);
storefrontRouter.use("/brands", storefrontBrandRouter);
app.use("/api/storefront/v1", storefrontRouter);

app.use(errorHandler);

const TEST_PREFIX = "test-int-";

test("Storefront Route Integration Tests", async (t) => {
  // Setup data
  t.before(async () => {
    // Clean up just in case previous run failed
    await prisma.product.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.brand.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });

    // Categories
    const activeCat = await prisma.category.create({
      data: { name: "Active Cat", slug: `${TEST_PREFIX}cat-active`, isActive: true }
    });
    await prisma.category.create({
      data: { name: "Inactive Cat", slug: `${TEST_PREFIX}cat-inactive`, isActive: false }
    });
    await prisma.category.create({
      data: { name: "Deleted Cat", slug: `${TEST_PREFIX}cat-deleted`, isActive: true, deletedAt: new Date() }
    });

    // Brands
    const activeBrand = await prisma.brand.create({
      data: { name: "Active Brand", slug: `${TEST_PREFIX}brand-active`, isActive: true }
    });
    await prisma.brand.create({
      data: { name: "Inactive Brand", slug: `${TEST_PREFIX}brand-inactive`, isActive: false }
    });
    await prisma.brand.create({
      data: { name: "Deleted Brand", slug: `${TEST_PREFIX}brand-deleted`, isActive: true, deletedAt: new Date() }
    });

    // Products
    await prisma.product.create({
      data: {
        name: "Active Product",
        slug: `${TEST_PREFIX}prod-active`,
        categoryId: activeCat.id,
        brandId: activeBrand.id,
        isActive: true,
        status: "Active",
        price: 10.00
      }
    });
    await prisma.product.create({
      data: {
        name: "Inactive Product",
        slug: `${TEST_PREFIX}prod-inactive`,
        categoryId: activeCat.id,
        isActive: false,
        status: "Active"
      }
    });
    await prisma.product.create({
      data: {
        name: "Deleted Product",
        slug: `${TEST_PREFIX}prod-deleted`,
        categoryId: activeCat.id,
        isActive: true,
        status: "Active",
        deletedAt: new Date()
      }
    });
    await prisma.product.create({
      data: {
        name: "Draft Product",
        slug: `${TEST_PREFIX}prod-draft`,
        categoryId: activeCat.id,
        isActive: true,
        status: "Draft"
      }
    });
    await prisma.product.create({
      data: {
        name: "Archived Product",
        slug: `${TEST_PREFIX}prod-archived`,
        categoryId: activeCat.id,
        isActive: true,
        status: "Archived"
      }
    });
    
    // extra products for testing pagination/sorting
    await prisma.product.create({
      data: { name: "Active Product 2", slug: `${TEST_PREFIX}prod-active2`, categoryId: activeCat.id, isActive: true, status: "Active", price: 20.00 }
    });
    await prisma.product.create({
      data: { name: "Active Product 3", slug: `${TEST_PREFIX}prod-active3`, categoryId: activeCat.id, isActive: true, status: "Active", price: 5.00 }
    });
  });

  t.after(async () => {
    // Cleanup
    await prisma.product.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.brand.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.$disconnect();
  });

  await t.test("GET /categories returns only active categories", async () => {
    const res = await request(app).get("/api/storefront/v1/categories?tree=false");
    assert.strictEqual(res.status, 200);
    const slugs = res.body.data.map((c: any) => c.slug);
    assert.ok(slugs.includes(`${TEST_PREFIX}cat-active`));
    assert.ok(!slugs.includes(`${TEST_PREFIX}cat-inactive`));
    assert.ok(!slugs.includes(`${TEST_PREFIX}cat-deleted`));
  });

  await t.test("GET /categories/:slug lookup", async () => {
    const resActive = await request(app).get(`/api/storefront/v1/categories/${TEST_PREFIX}cat-active`);
    assert.strictEqual(resActive.status, 200);
    assert.strictEqual(resActive.body.data.slug, `${TEST_PREFIX}cat-active`);

    const resInactive = await request(app).get(`/api/storefront/v1/categories/${TEST_PREFIX}cat-inactive`);
    assert.strictEqual(resInactive.status, 404);

    const resDeleted = await request(app).get(`/api/storefront/v1/categories/${TEST_PREFIX}cat-deleted`);
    assert.strictEqual(resDeleted.status, 404);
  });

  await t.test("GET /brands returns only active brands", async () => {
    const res = await request(app).get("/api/storefront/v1/brands");
    assert.strictEqual(res.status, 200);
    const slugs = res.body.data.map((b: any) => b.slug);
    assert.ok(slugs.includes(`${TEST_PREFIX}brand-active`));
    assert.ok(!slugs.includes(`${TEST_PREFIX}brand-inactive`));
    assert.ok(!slugs.includes(`${TEST_PREFIX}brand-deleted`));
  });

  await t.test("GET /brands/:slug lookup", async () => {
    const resActive = await request(app).get(`/api/storefront/v1/brands/${TEST_PREFIX}brand-active`);
    assert.strictEqual(resActive.status, 200);
    assert.strictEqual(resActive.body.data.slug, `${TEST_PREFIX}brand-active`);

    const resInactive = await request(app).get(`/api/storefront/v1/brands/${TEST_PREFIX}brand-inactive`);
    assert.strictEqual(resInactive.status, 404);

    const resDeleted = await request(app).get(`/api/storefront/v1/brands/${TEST_PREFIX}brand-deleted`);
    assert.strictEqual(resDeleted.status, 404);
  });

  await t.test("GET /products filters inactive, deleted, and non-active statuses", async () => {
    const res = await request(app).get("/api/storefront/v1/products");
    assert.strictEqual(res.status, 200);
    const slugs = res.body.data.map((p: any) => p.slug);
    assert.ok(slugs.includes(`${TEST_PREFIX}prod-active`));
    assert.ok(!slugs.includes(`${TEST_PREFIX}prod-inactive`));
    assert.ok(!slugs.includes(`${TEST_PREFIX}prod-deleted`));
    assert.ok(!slugs.includes(`${TEST_PREFIX}prod-draft`));
    assert.ok(!slugs.includes(`${TEST_PREFIX}prod-archived`));
  });

  await t.test("GET /products pagination", async () => {
    const res = await request(app).get(`/api/storefront/v1/products?limit=1&page=1`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.meta.limit, 1);
    assert.strictEqual(res.body.meta.page, 1);
  });

  await t.test("GET /products filtering and sorting", async () => {
    const res = await request(app).get(`/api/storefront/v1/products?sort=price_asc`);
    assert.strictEqual(res.status, 200);
    const testProducts = res.body.data.filter((p: any) => p.slug.startsWith(TEST_PREFIX));
    assert.strictEqual(testProducts[0].price, 5);
    assert.strictEqual(testProducts[1].price, 10);
    assert.strictEqual(testProducts[2].price, 20);
    
    const resDesc = await request(app).get(`/api/storefront/v1/products?sort=price_desc`);
    assert.strictEqual(resDesc.status, 200);
    const testProductsDesc = resDesc.body.data.filter((p: any) => p.slug.startsWith(TEST_PREFIX));
    assert.strictEqual(testProductsDesc[0].price, 20);
  });

  await t.test("GET /products/:slug lookup", async () => {
    const resActive = await request(app).get(`/api/storefront/v1/products/${TEST_PREFIX}prod-active`);
    assert.strictEqual(resActive.status, 200);
    assert.strictEqual(resActive.body.data.slug, `${TEST_PREFIX}prod-active`);

    const resInactive = await request(app).get(`/api/storefront/v1/products/${TEST_PREFIX}prod-inactive`);
    assert.strictEqual(resInactive.status, 404);

    const resDeleted = await request(app).get(`/api/storefront/v1/products/${TEST_PREFIX}prod-deleted`);
    assert.strictEqual(resDeleted.status, 404);

    const resDraft = await request(app).get(`/api/storefront/v1/products/${TEST_PREFIX}prod-draft`);
    assert.strictEqual(resDraft.status, 404);
  });
});
