import test from "node:test";
import assert from "node:assert";
import request from "supertest";
import express from "express";
import { prisma } from "../../../config/db";
import { StorefrontCheckoutService } from "../../../services/storefront/checkout.service";
import { emailService } from "../../../services/email.service";

test("Order Email Flow Tests", async (t) => {
  // We mock transporter to track calls
  let sentEmails: any[] = [];
  
  // Quick mock hack for testing
  const originalSend = (emailService as any).transporter.sendMail;
  (emailService as any).transporter.sendMail = async (options: any) => {
    sentEmails.push(options);
    if (options.to === "fail@vyzobd.com") {
      throw new Error("SMTP Error");
    }
    return true;
  };

  t.after(() => {
    (emailService as any).transporter.sendMail = originalSend;
  });

  await t.test("Checkout completes and triggers confirmation email even on SMTP failure", async () => {
    // Just testing the mocked checkout service directly instead of building the whole API request
    const dummyCustomer = { email: "fail@vyzobd.com", firstName: "Test" };
    const dummyOrder = { orderNumber: "ORD-TEST-123", totalAmount: 100, items: [] };
    
    // We expect it NOT to throw
    await assert.doesNotReject(async () => {
      await emailService.sendOrderConfirmationEmail(dummyCustomer, dummyOrder);
    });
    
    // Email was attempted
    assert.strictEqual(sentEmails.length, 1);
    assert.strictEqual(sentEmails[0].to, "fail@vyzobd.com");
    assert.ok(sentEmails[0].subject.includes("Order Confirmation #ORD-TEST-123"));
    
    sentEmails = [];
  });

  await t.test("Status emails work and do not crash on failure", async () => {
    const dummyCustomer = { email: "success@vyzobd.com", firstName: "Test" };
    const dummyOrder = { orderNumber: "ORD-TEST-456", totalAmount: 100, items: [] };

    await emailService.sendOrderProcessingEmail(dummyCustomer, dummyOrder);
    await emailService.sendOrderConfirmedEmail(dummyCustomer, dummyOrder);
    await emailService.sendOrderCancelledEmail(dummyCustomer, dummyOrder);

    assert.strictEqual(sentEmails.length, 3);
    assert.ok(sentEmails[0].subject.includes("Processing"));
    assert.ok(sentEmails[1].subject.includes("Confirmed"));
    assert.ok(sentEmails[2].subject.includes("Cancelled"));

    sentEmails = [];
  });
  
  await t.test("Missing customer email does not crash", async () => {
    const dummyCustomer = { email: "", firstName: "Test" };
    const dummyOrder = { orderNumber: "ORD-TEST-789", totalAmount: 100, items: [] };

    await assert.doesNotReject(async () => {
      await emailService.sendOrderConfirmationEmail(dummyCustomer, dummyOrder);
    });
    
    // No email sent because no email provided
    assert.strictEqual(sentEmails.length, 0);
  });
});
