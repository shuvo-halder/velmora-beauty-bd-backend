import { PrismaClient } from '@prisma/client';
import { sanitizeRichText } from '../utils/richTextSanitizer';

const prisma = new PrismaClient();

async function migrate() {
  console.log("Starting Rich Text Migration to strip default theme colors...");

  const products = await prisma.product.findMany();
  for (const product of products) {
    let updated = false;
    const data: any = {};
    if (product.description) {
      const sanitized = sanitizeRichText(product.description);
      if (sanitized !== product.description) {
        data.description = sanitized;
        updated = true;
      }
    }
    if (product.shortDescription) {
      const sanitized = sanitizeRichText(product.shortDescription);
      if (sanitized !== product.shortDescription) {
        data.shortDescription = sanitized;
        updated = true;
      }
    }
    if (updated) {
      await prisma.product.update({ where: { id: product.id }, data });
      console.log(`Updated Product: ${product.id}`);
    }
  }

  const pages = await prisma.page.findMany();
  for (const page of pages) {
    if (page.content) {
      const sanitized = sanitizeRichText(page.content);
      if (sanitized !== page.content) {
        await prisma.page.update({ where: { id: page.id }, data: { content: sanitized } });
        console.log(`Updated Page: ${page.id}`);
      }
    }
  }

  const posts = await prisma.blogPost.findMany();
  for (const post of posts) {
    let updated = false;
    const data: any = {};
    if (post.content) {
      const sanitized = sanitizeRichText(post.content);
      if (sanitized !== post.content) {
        data.content = sanitized;
        updated = true;
      }
    }
    if (post.excerpt) {
      const sanitized = sanitizeRichText(post.excerpt);
      if (sanitized !== post.excerpt) {
        data.excerpt = sanitized;
        updated = true;
      }
    }
    if (updated) {
      await prisma.blogPost.update({ where: { id: post.id }, data });
      console.log(`Updated BlogPost: ${post.id}`);
    }
  }
  
  const faqs = await prisma.fAQ.findMany();
  for (const faq of faqs) {
    if (faq.answer) {
      const sanitized = sanitizeRichText(faq.answer);
      if (sanitized !== faq.answer) {
        await prisma.fAQ.update({ where: { id: faq.id }, data: { answer: sanitized } });
        console.log(`Updated FAQ: ${faq.id}`);
      }
    }
  }

  console.log("Migration complete.");
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
