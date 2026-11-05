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

const TEST_PREFIX = "test-facets-";

test("Storefront Search Facets Integration Tests", async (t) => {
  t.before(async () => {
    await prisma.product.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.brand.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });

    const activeCat1 = await prisma.category.create({
      data: { name: "Facet Cat 1", slug: `${TEST_PREFIX}cat-1`, isActive: true }
    });
    const activeCat2 = await prisma.category.create({
      data: { name: "Facet Cat 2", slug: `${TEST_PREFIX}cat-2`, isActive: true }
    });

    const activeBrand1 = await prisma.brand.create({
      data: { name: "Facet Brand 1", slug: `${TEST_PREFIX}brand-1`, isActive: true }
    });
    const activeBrand2 = await prisma.brand.create({
      data: { name: "Facet Brand 2", slug: `${TEST_PREFIX}brand-2`, isActive: true }
    });

    // P1: Cat 1, Brand 1, Price 100, In Stock
    const p1 = await prisma.product.create({
      data: {
        name: "Facet Prod 1",
        slug: `${TEST_PREFIX}prod-1`,
        categoryId: activeCat1.id,
        brandId: activeBrand1.id,
        isActive: true,
        status: "Active",
        price: 100.00
      }
    });
    await prisma.inventory.create({ data: { productId: p1.id, quantityAvailable: 10 } });

    // P2: Cat 1, Brand 2, Price 50, Out of Stock
    await prisma.product.create({
      data: {
        name: "Facet Prod 2",
        slug: `${TEST_PREFIX}prod-2`,
        categoryId: activeCat1.id,
        brandId: activeBrand2.id,
        isActive: true,
        status: "Active",
        price: 50.00
      }
    });

    // P3: Cat 2, Brand 1, Price 200, Out of Stock
    await prisma.product.create({
      data: {
        name: "Facet Prod 3",
        slug: `${TEST_PREFIX}prod-3`,
        categoryId: activeCat2.id,
        brandId: activeBrand1.id,
        isActive: true,
        status: "Active",
        price: 200.00
      }
    });

    // P4: Inactive product (should be ignored)
    await prisma.product.create({
      data: {
        name: "Facet Prod 4",
        slug: `${TEST_PREFIX}prod-4`,
        categoryId: activeCat1.id,
        brandId: activeBrand1.id,
        isActive: false,
        status: "Active",
        price: 10.00
      }
    });
  });

  t.after(async () => {
    await prisma.product.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.brand.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.$disconnect();
  });

  await t.test("Get facets without filters", async () => {
    const res = await request(app).get(`/api/storefront/v1/search/facets`);
    assert.strictEqual(res.status, 200);
    const data = res.body.data;
    
    // There are 3 active test products, plus any existing products. 
    // We check if our test categories/brands are present and have correct counts relative to our inserted data
    // (Since the DB might have other products, counts might be higher if names overlap, but we use unique category IDs)

    const cat1 = data.categories.find((c: any) => c.slug === `${TEST_PREFIX}cat-1`);
    const cat2 = data.categories.find((c: any) => c.slug === `${TEST_PREFIX}cat-2`);
    assert.ok(cat1);
    assert.ok(cat2);
    assert.strictEqual(cat1.count, 2);
    assert.strictEqual(cat2.count, 1);

    const brand1 = data.brands.find((b: any) => b.slug === `${TEST_PREFIX}brand-1`);
    const brand2 = data.brands.find((b: any) => b.slug === `${TEST_PREFIX}brand-2`);
    assert.ok(brand1);
    assert.ok(brand2);
    assert.strictEqual(brand1.count, 2);
    assert.strictEqual(brand2.count, 1);

    // Stock
    // At least 1 in stock, 2 out of stock from our test data
    assert.ok(data.availability.inStock >= 1);
    assert.ok(data.availability.outOfStock >= 2);

    // Price
    assert.ok(data.priceRange.min !== undefined);
    assert.ok(data.priceRange.max !== undefined);
  });

  await t.test("Get facets with category filter", async () => {
    // If we filter by cat-1, brand counts should change
    const res = await request(app).get(`/api/storefront/v1/search/facets?category=${TEST_PREFIX}cat-1`);
    assert.strictEqual(res.status, 200);
    const data = res.body.data;

    // Inside cat-1, brand-1 has 1 product, brand-2 has 1 product
    const brand1 = data.brands.find((b: any) => b.slug === `${TEST_PREFIX}brand-1`);
    const brand2 = data.brands.find((b: any) => b.slug === `${TEST_PREFIX}brand-2`);
    assert.ok(brand1);
    assert.ok(brand2);
    assert.strictEqual(brand1.count, 1);
    assert.strictEqual(brand2.count, 1);
  });

  await t.test("Validation error", async () => {
    const res = await request(app).get(`/api/storefront/v1/search/facets?minPrice=100&maxPrice=50`);
    assert.strictEqual(res.status, 400);
  });
});
