import test from "node:test";
import assert from "node:assert";
import { emailService } from "../../../services/email.service";

test("Step 4 Payment & Shipment Email Flow Tests", async (t) => {
  let sentEmails: any[] = [];
  
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

  await t.test("Payment success and failed emails do not crash on SMTP failure", async () => {
    const dummyCustomer = { email: "fail@vyzobd.com", firstName: "Test" };
    const dummyOrder = { orderNumber: "ORD-TEST-123", totalAmount: 100, items: [] };
    const dummyPayment = { currency: "BDT", amount: 100, provider: "STRIPE" };
    
    await assert.doesNotReject(async () => {
      await emailService.sendPaymentSuccessEmail(dummyCustomer, dummyPayment, dummyOrder);
      await emailService.sendPaymentFailedEmail(dummyCustomer, dummyPayment, dummyOrder);
    });
    
    assert.strictEqual(sentEmails.length, 2);
    assert.ok(sentEmails[0].subject.includes("Payment Successful"));
    assert.ok(sentEmails[1].subject.includes("Payment Failed"));
    
    sentEmails = [];
  });

  await t.test("Shipment emails work and do not crash on failure", async () => {
    const dummyCustomer = { email: "success@vyzobd.com", firstName: "Test" };
    const dummyOrder = { orderNumber: "ORD-TEST-456", totalAmount: 100, items: [] };
    const dummyShipment = { courier: { name: "Pathao" }, trackingNumber: "TRK123" };

    await assert.doesNotReject(async () => {
      await emailService.sendOrderShippedEmail(dummyCustomer, dummyShipment, dummyOrder);
      await emailService.sendOrderDeliveredEmail(dummyCustomer, dummyShipment, dummyOrder);
    });

    assert.strictEqual(sentEmails.length, 2);
    assert.ok(sentEmails[0].subject.includes("Shipped"));
    assert.ok(sentEmails[1].subject.includes("Delivered"));

    sentEmails = [];
  });
  
  await t.test("Missing customer email does not crash", async () => {
    const dummyCustomer = { email: "", firstName: "Test" };
    const dummyOrder = { orderNumber: "ORD-TEST-789", totalAmount: 100, items: [] };
    const dummyPayment = { currency: "BDT", amount: 100, provider: "STRIPE" };

    await assert.doesNotReject(async () => {
      await emailService.sendPaymentSuccessEmail(dummyCustomer, dummyPayment, dummyOrder);
    });
    
    assert.strictEqual(sentEmails.length, 0);
  });
});
