import test from "node:test";
import assert from "node:assert";
import { mapProductToStorefrontDTO, mapCategoryToStorefrontDTO, mapBrandToStorefrontDTO } from "../mappers";

test("Product DTO Sanitization", () => {
  const rawProduct = {
    id: "prod-1",
    name: "Test Product",
    slug: "test-product",
    costPrice: 50.00,
    vendor: { id: "vend-1", name: "Acme Corp" },
    vendorId: "vend-1",
    deletedAt: new Date(),
    status: "Active",
    trackInventory: true,
    inventories: [{ id: "inv-1", quantity: 10 }],
    price: 100.00,
    category: {
      id: "cat-1",
      name: "Test Category",
      slug: "test-category"
    },
    brand: {
      id: "brand-1",
      name: "Test Brand",
      slug: "test-brand"
    }
  };

  const dto = mapProductToStorefrontDTO(rawProduct);

  assert.strictEqual((dto as any).costPrice, undefined);
  assert.strictEqual((dto as any).vendor, undefined);
  assert.strictEqual((dto as any).vendorId, undefined);
  assert.strictEqual((dto as any).deletedAt, undefined);
  assert.strictEqual((dto as any).status, undefined);
  assert.strictEqual((dto as any).trackInventory, undefined);
  assert.strictEqual((dto as any).inventories, undefined);
});

test("Product SEO Fallback", () => {
  const noSeoProduct = {
    id: "prod-1",
    name: "Test Product",
    slug: "test-product",
    shortDescription: "Short desc",
    images: [{ url: "primary.jpg", isPrimary: true }, { url: "secondary.jpg" }]
  };
  
  const dto1 = mapProductToStorefrontDTO(noSeoProduct);
  assert.strictEqual(dto1.seoTitle, "Test Product");
  assert.strictEqual(dto1.seoDescription, "Short desc");
  assert.strictEqual(dto1.ogImage, "primary.jpg");

  const withSeoProduct = {
    id: "prod-2",
    name: "Test Product",
    slug: "test-product",
    shortDescription: "Short desc",
    metaTitle: "SEO Title",
    metaDescription: "SEO Desc",
    ogImage: "seo.jpg",
    images: [{ url: "primary.jpg", isPrimary: true }]
  };

  const dto2 = mapProductToStorefrontDTO(withSeoProduct);
  assert.strictEqual(dto2.seoTitle, "SEO Title");
  assert.strictEqual(dto2.seoDescription, "SEO Desc");
  assert.strictEqual(dto2.ogImage, "seo.jpg");
});

test("Category SEO Fallback", () => {
  const noSeoCategory = {
    id: "cat-1",
    name: "Test Category",
    description: "Category desc",
    image: "cat.jpg",
    slug: "test-category"
  };

  const dto1 = mapCategoryToStorefrontDTO(noSeoCategory);
  assert.strictEqual(dto1.seoTitle, "Test Category");
  assert.strictEqual(dto1.seoDescription, "Category desc");
  assert.strictEqual(dto1.ogImage, "cat.jpg");

  const withSeoCategory = {
    id: "cat-2",
    name: "Test Category",
    description: "Category desc",
    image: "cat.jpg",
    seoTitle: "SEO Cat Title",
    seoDescription: "SEO Cat Desc",
    slug: "test-category"
  };

  const dto2 = mapCategoryToStorefrontDTO(withSeoCategory);
  assert.strictEqual(dto2.seoTitle, "SEO Cat Title");
  assert.strictEqual(dto2.seoDescription, "SEO Cat Desc");
  assert.strictEqual(dto2.ogImage, "cat.jpg");
});

test("Brand SEO Fallback", () => {
  const noSeoBrand = {
    id: "brand-1",
    name: "Test Brand",
    description: "Brand desc",
    logoUrl: "logo.jpg",
    slug: "test-brand"
  };

  const dto1 = mapBrandToStorefrontDTO(noSeoBrand);
  assert.strictEqual(dto1.seoTitle, "Test Brand");
  assert.strictEqual(dto1.seoDescription, "Brand desc");
  assert.strictEqual(dto1.ogImage, "logo.jpg");

  const withSeoBrand = {
    id: "brand-2",
    name: "Test Brand",
    description: "Brand desc",
    logoUrl: "logo.jpg",
    slug: "test-brand",
    seoTitle: "SEO Brand Title",
    seoDescription: "SEO Brand Desc",
  };

  const dto2 = mapBrandToStorefrontDTO(withSeoBrand);
  assert.strictEqual(dto2.seoTitle, "SEO Brand Title"); 
  assert.strictEqual(dto2.seoDescription, "SEO Brand Desc");
});

test("Product DTO - Nested FAQs mapping and field sanitization", () => {
  // 1. List query / no productFaqs included
  const listProduct = {
    id: "prod-1",
    name: "List Product",
    slug: "list-product",
  };
  const listDto = mapProductToStorefrontDTO(listProduct);
  assert.strictEqual(listDto.faqs, undefined);

  // 2. Empty productFaqs returns empty array []
  const emptyFaqsProduct = {
    id: "prod-2",
    name: "Empty FAQs Product",
    slug: "empty-faqs-product",
    productFaqs: [],
  };
  const emptyFaqsDto = mapProductToStorefrontDTO(emptyFaqsProduct);
  assert.deepStrictEqual(emptyFaqsDto.faqs, []);

  // 3. Product with valid, inactive, and deleted FAQs
  const productWithFaqs = {
    id: "prod-3",
    name: "Product with FAQs",
    slug: "product-with-faqs",
    productFaqs: [
      {
        id: "pf-2",
        productId: "prod-3",
        faqId: "faq-2",
        sortOrder: 10,
        createdAt: new Date("2026-01-02"),
        updatedAt: new Date("2026-01-02"),
        faq: {
          id: "faq-2",
          question: "Second Question?",
          answer: "Second Answer.",
          isActive: true,
          deletedAt: null,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
        }
      },
      {
        id: "pf-1",
        productId: "prod-3",
        faqId: "faq-1",
        sortOrder: 0,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        faq: {
          id: "faq-1",
          question: "First Question?",
          answer: "First Answer.",
          isActive: true,
          deletedAt: null,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
        }
      },
      {
        id: "pf-3",
        productId: "prod-3",
        faqId: "faq-3",
        sortOrder: 5,
        faq: {
          id: "faq-3",
          question: "Inactive Question?",
          answer: "Inactive Answer.",
          isActive: false,
          deletedAt: null,
        }
      },
      {
        id: "pf-4",
        productId: "prod-3",
        faqId: "faq-4",
        sortOrder: 6,
        faq: {
          id: "faq-4",
          question: "Deleted Question?",
          answer: "Deleted Answer.",
          isActive: true,
          deletedAt: new Date("2026-01-05"),
        }
      }
    ],
  };

  const dto = mapProductToStorefrontDTO(productWithFaqs);
  assert.ok(Array.isArray(dto.faqs));
  assert.strictEqual(dto.faqs?.length, 2);

  // Verify sort order
  assert.strictEqual(dto.faqs[0].id, "faq-1");
  assert.strictEqual(dto.faqs[0].question, "First Question?");
  assert.strictEqual(dto.faqs[0].answer, "First Answer.");
  assert.strictEqual(dto.faqs[0].sortOrder, 0);

  assert.strictEqual(dto.faqs[1].id, "faq-2");
  assert.strictEqual(dto.faqs[1].question, "Second Question?");
  assert.strictEqual(dto.faqs[1].answer, "Second Answer.");
  assert.strictEqual(dto.faqs[1].sortOrder, 10);

  // Verify internal fields are not exposed
  assert.strictEqual((dto.faqs[0] as any).isActive, undefined);
  assert.strictEqual((dto.faqs[0] as any).deletedAt, undefined);
  assert.strictEqual((dto.faqs[0] as any).createdAt, undefined);
  assert.strictEqual((dto.faqs[0] as any).updatedAt, undefined);
  assert.strictEqual((dto.faqs[0] as any).productId, undefined);
  assert.strictEqual((dto.faqs[0] as any).faqId, undefined);
});

