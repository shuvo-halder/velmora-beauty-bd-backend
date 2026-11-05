import test from "node:test";
import assert from "node:assert";
import request from "supertest";
import express from "express";

import storefrontSearchRouter from "../search.routes";
import { errorHandler } from "../../../middlewares/errorHandler";
import { storefrontRequestLogger } from "../../../middlewares/storefront/logging.middleware";

import { prisma } from "../../../config/db";
const app = express();
app.use(express.json());

const storefrontRouter = express.Router();
storefrontRouter.use(storefrontRequestLogger);
storefrontRouter.use("/search", storefrontSearchRouter);
app.use("/api/storefront/v1", storefrontRouter);

app.use(errorHandler);

const TEST_PREFIX = "test-srch-";

test("Storefront Search Integration Tests", async (t) => {
  t.before(async () => {
    await prisma.product.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.brand.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });

    const activeCat = await prisma.category.create({
      data: { name: "Active Search Cat", slug: `${TEST_PREFIX}cat-active`, isActive: true }
    });

    const activeBrand = await prisma.brand.create({
      data: { name: "Active Search Brand", slug: `${TEST_PREFIX}brand-active`, isActive: true }
    });

    // P1: Match name
    await prisma.product.create({
      data: {
        name: "Quantum Keyboard",
        slug: `${TEST_PREFIX}prod-1`,
        categoryId: activeCat.id,
        brandId: activeBrand.id,
        isActive: true,
        status: "Active",
        price: 150.00
      }
    });

    // P2: Match description, diff category/brand (none for ease)
    await prisma.product.create({
      data: {
        name: "Mechanical Switch Set",
        slug: `${TEST_PREFIX}prod-2`,
        categoryId: activeCat.id,
        isActive: true,
        status: "Active",
        description: "Perfect for quantum computing",
        price: 50.00
      }
    });

    // P3: Inactive
    await prisma.product.create({
      data: {
        name: "Quantum Mouse",
        slug: `${TEST_PREFIX}prod-3`,
        categoryId: activeCat.id,
        isActive: false,
        status: "Active",
        price: 80.00
      }
    });

    // P4: With inventory for stock test
    const p4 = await prisma.product.create({
      data: {
        name: "Gaming Headset",
        slug: `${TEST_PREFIX}prod-4`,
        categoryId: activeCat.id,
        brandId: activeBrand.id,
        isActive: true,
        status: "Active",
        price: 120.00
      }
    });

    await prisma.inventory.create({
      data: {
        productId: p4.id,
        quantityAvailable: 10
      }
    });
  });

  t.after(async () => {
    await prisma.product.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.brand.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.$disconnect();
  });

  await t.test("Search keyword (q)", async () => {
    const res = await request(app).get(`/api/storefront/v1/search?q=quantum`);
    assert.strictEqual(res.status, 200);
    const slugs = res.body.data.map((p: any) => p.slug);
    assert.ok(slugs.includes(`${TEST_PREFIX}prod-1`)); // Name match
    assert.ok(slugs.includes(`${TEST_PREFIX}prod-2`)); // Description match
    assert.ok(!slugs.includes(`${TEST_PREFIX}prod-3`)); // Inactive
    assert.ok(!slugs.includes(`${TEST_PREFIX}prod-4`)); // No match
  });

  await t.test("Filter category", async () => {
    const res = await request(app).get(`/api/storefront/v1/search?category=${TEST_PREFIX}cat-active`);
    assert.strictEqual(res.status, 200);
    const slugs = res.body.data.map((p: any) => p.slug);
    assert.ok(slugs.includes(`${TEST_PREFIX}prod-1`));
  });

  await t.test("Filter brand", async () => {
    const res = await request(app).get(`/api/storefront/v1/search?brand=${TEST_PREFIX}brand-active`);
    assert.strictEqual(res.status, 200);
    const slugs = res.body.data.map((p: any) => p.slug);
    assert.ok(slugs.includes(`${TEST_PREFIX}prod-1`));
    assert.ok(slugs.includes(`${TEST_PREFIX}prod-4`));
  });

  await t.test("Filter price range", async () => {
    const res = await request(app).get(`/api/storefront/v1/search?minPrice=100&maxPrice=130`);
    assert.strictEqual(res.status, 200);
    const slugs = res.body.data.map((p: any) => p.slug);
    assert.ok(!slugs.includes(`${TEST_PREFIX}prod-1`)); // 150
    assert.ok(!slugs.includes(`${TEST_PREFIX}prod-2`)); // 50
    assert.ok(slugs.includes(`${TEST_PREFIX}prod-4`));  // 120
  });

  await t.test("Filter inStock", async () => {
    const res = await request(app).get(`/api/storefront/v1/search?inStock=true`);
    assert.strictEqual(res.status, 200);
    const slugs = res.body.data.map((p: any) => p.slug);
    // Only prod-4 has inventory > 0
    assert.ok(!slugs.includes(`${TEST_PREFIX}prod-1`)); 
    assert.ok(slugs.includes(`${TEST_PREFIX}prod-4`));
  });

  await t.test("Validation error", async () => {
    const res = await request(app).get(`/api/storefront/v1/search?minPrice=100&maxPrice=50`);
    assert.strictEqual(res.status, 400);
  });
});
