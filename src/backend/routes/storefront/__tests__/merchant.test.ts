import test from "node:test";
import assert from "node:assert";
import request from "supertest";
import express from "express";

import storefrontMerchantRouter from "../merchant.routes";
import { errorHandler } from "../../../middlewares/errorHandler";
import { storefrontRequestLogger } from "../../../middlewares/storefront/logging.middleware";

import { prisma } from "../../../config/db";
const app = express();
app.use(express.json());

const storefrontRouter = express.Router();
storefrontRouter.use(storefrontRequestLogger);
storefrontRouter.use("/merchant", storefrontMerchantRouter);
app.use("/api/storefront/v1", storefrontRouter);

app.use(errorHandler);

const TEST_PREFIX = "test-merchant-";

test("Storefront Merchant Feed Integration Tests", async (t) => {
  t.before(async () => {
    await prisma.product.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.category.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });
    await prisma.brand.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } });

    const cat = await prisma.category.create({
      data: { name: "Merchant Cat", slug: `${TEST_PREFIX}cat`, isActive: true }
    });

    const brand = await prisma.brand.create({
      data: { name: "Merchant Brand", slug: `${TEST_PREFIX}brand`, isActive: true }
    });

    // P1: Active, In Stock, all fields
    const p1 = await prisma.product.create({
      data: {
        name: "Merchant Prod 1",
        slug: `${TEST_PREFIX}prod-1`,
        categoryId: cat.id,
        brandId: brand.id,
        isActive: true,
        status: "Active",
        price: 99.99,
        gtin: "1234567890123",
        mpn: "MPN-001",
        sku: "SKU-001",
        condition: "new"
      }
    });
    await prisma.inventory.create({ data: { productId: p1.id, quantityAvailable: 5 } });

    // P2: Active, Out of Stock, no optional fields
    await prisma.product.create({
      data: {
        name: "Merchant Prod 2",
        slug: `${TEST_PREFIX}prod-2`,
        categoryId: cat.id,
        isActive: true,
        status: "Active",
        price: 15.00
      }
    });

    // P3: Inactive
    await prisma.product.create({
      data: {
        name: "Merchant Prod 3",
        slug: `${TEST_PREFIX}prod-3`,
        categoryId: cat.id,
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

  await t.test("JSON Feed Generation", async () => {
    const res = await request(app).get("/api/storefront/v1/merchant/feed.json");
    assert.strictEqual(res.status, 200);
    const data = res.body;

    const items = data.items;
    assert.ok(items.length >= 2);

    const p1 = items.find((i: any) => i.id.includes(TEST_PREFIX) || i.sku === "SKU-001");
    assert.ok(p1);
    assert.strictEqual(p1.availability, "in stock");
    assert.strictEqual(p1.price, "99.99 BDT");
    assert.strictEqual(p1.gtin, "1234567890123");
    assert.strictEqual(p1.mpn, "MPN-001");
    assert.strictEqual(p1.brand, "Merchant Brand");
    assert.strictEqual(p1.googleProductCategory, "Merchant Cat");

    const p2 = items.find((i: any) => i.title === "Merchant Prod 2");
    assert.ok(p2);
    assert.strictEqual(p2.availability, "out of stock");
    assert.strictEqual(p2.price, "15.00 BDT");
    assert.strictEqual(p2.gtin, undefined);
    assert.strictEqual(p2.mpn, undefined);

    const p3 = items.find((i: any) => i.title === "Merchant Prod 3");
    assert.strictEqual(p3, undefined); // Should be excluded due to isActive: false
  });

  await t.test("XML Feed Generation", async () => {
    const res = await request(app).get("/api/storefront/v1/merchant/feed.xml");
    assert.strictEqual(res.status, 200);
    assert.ok(res.text.includes("<?xml"));
    assert.ok(res.text.includes("<g:id>"));
    assert.ok(res.text.includes("1234567890123"));
    assert.ok(!res.text.includes("Merchant Prod 3")); // Excluded
  });
});
