import test from "node:test";
import assert from "node:assert";
import request from "supertest";
import express from "express";
import crypto from "crypto";
import authRouter from "../auth.routes";
import accountRouter from "../account.routes";
import { errorHandler } from "../../../middlewares/errorHandler";
import { prisma } from "../../../config/db";
import { emailService } from "../../../services/email.service";

const app = express();
app.use(express.json());
const router = express.Router();
router.use("/auth", authRouter);
router.use("/customer", accountRouter);
app.use("/api/storefront/v1", router);
app.use(errorHandler);

test("Storefront Customer Email Verification and Lifecycle Suite", async (suite) => {
  let mockCustomers: any[] = [];
  let mockRefreshTokens: any[] = [];
  let dispatchedEmails: any[] = [];

  const originalSend = (emailService as any).transporter.sendMail;
  const origCustomerFindUnique = prisma.customer.findUnique;
  const origCustomerFindFirst = prisma.customer.findFirst;
  const origCustomerCreate = prisma.customer.create;
  const origCustomerUpdate = prisma.customer.update;
  const origCustomerDeleteMany = prisma.customer.deleteMany;
  const origRefreshTokenCreate = prisma.customerRefreshToken.create;
  const origRefreshTokenUpdate = prisma.customerRefreshToken.update;
  const origRefreshTokenUpdateMany = prisma.customerRefreshToken.updateMany;

  suite.before(() => {
    mockCustomers = [];
    mockRefreshTokens = [];
    dispatchedEmails = [];

    (emailService as any).transporter.sendMail = async (options: any) => {
      dispatchedEmails.push(options);
      return { messageId: "mock-test-id", response: "250 OK" };
    };

    (prisma.customer.findUnique as any) = async ({ where }: any) => {
      if (where.id) return mockCustomers.find(c => c.id === where.id) || null;
      if (where.email) return mockCustomers.find(c => c.email === where.email) || null;
      return null;
    };

    (prisma.customer.findFirst as any) = async ({ where }: any) => {
      return mockCustomers.find(c => {
        if (where.id && c.id !== where.id) return false;
        if (where.email && c.email !== where.email) return false;
        if (where.verificationExpires && where.verificationExpires.gt && c.verificationExpires <= where.verificationExpires.gt) return false;
        if (where.resetPasswordExpires && where.resetPasswordExpires.gt && c.resetPasswordExpires <= where.resetPasswordExpires.gt) return false;
        if (where.pendingEmailVerificationExpires && where.pendingEmailVerificationExpires.gt && c.pendingEmailVerificationExpires <= where.pendingEmailVerificationExpires.gt) return false;
        if (where.OR) {
          const matchOr = where.OR.some((cond: any) => {
            if (cond.verificationToken && c.verificationToken === cond.verificationToken) return true;
            if (cond.pendingEmailVerificationToken && c.pendingEmailVerificationToken === cond.pendingEmailVerificationToken) return true;
            if (cond.email && c.email === cond.email) return true;
            if (cond.pendingEmail && c.pendingEmail === cond.pendingEmail) return true;
            return false;
          });
          if (!matchOr) return false;
        }
        if (where.resetPasswordToken && c.resetPasswordToken !== where.resetPasswordToken) return false;
        if (where.verificationToken && c.verificationToken !== where.verificationToken) return false;
        return true;
      }) || null;
    };

    (prisma.customer.create as any) = async ({ data }: any) => {
      const record = {
        id: `cust-${mockCustomers.length + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        deletedAt: null,
        phone: null,
        phoneVerified: false,
        ...data,
      };
      mockCustomers.push(record);
      return record;
    };

    (prisma.customer.update as any) = async ({ where, data }: any) => {
      const idx = mockCustomers.findIndex(c => c.id === where.id || (where.email && c.email === where.email));
      if (idx !== -1) {
        Object.assign(mockCustomers[idx], data, { updatedAt: new Date() });
        return { ...mockCustomers[idx] };
      }
      return null;
    };

    (prisma.customer.deleteMany as any) = async ({ where }: any) => {
      const before = mockCustomers.length;
      mockCustomers = mockCustomers.filter(c => {
        if (where.email && c.email === where.email) return false;
        return true;
      });
      return { count: before - mockCustomers.length };
    };

    (prisma.customerRefreshToken.create as any) = async ({ data }: any) => {
      const rec = { id: `token-${mockRefreshTokens.length + 1}`, ...data };
      mockRefreshTokens.push(rec);
      return rec;
    };

    (prisma.customerRefreshToken.update as any) = async ({ where, data }: any) => {
      const rec = mockRefreshTokens.find(t => t.tokenHash === where.tokenHash);
      if (rec) Object.assign(rec, data);
      return rec;
    };

    (prisma.customerRefreshToken.updateMany as any) = async ({ where, data }: any) => {
      let count = 0;
      mockRefreshTokens.forEach(t => {
        if (where.customerId && t.customerId === where.customerId) {
          Object.assign(t, data);
          count++;
        }
      });
      return { count };
    };
  });

  suite.after(() => {
    (emailService as any).transporter.sendMail = originalSend;
    prisma.customer.findUnique = origCustomerFindUnique;
    prisma.customer.findFirst = origCustomerFindFirst;
    prisma.customer.create = origCustomerCreate;
    prisma.customer.update = origCustomerUpdate;
    prisma.customer.deleteMany = origCustomerDeleteMany;
    prisma.customerRefreshToken.create = origRefreshTokenCreate;
    prisma.customerRefreshToken.update = origRefreshTokenUpdate;
    prisma.customerRefreshToken.updateMany = origRefreshTokenUpdateMany;
  });

  const testEmail = "test.email.lifecycle@vyzobd.com";
  let registeredCustomerId = "";
  let rawVerificationToken = "";

  await suite.test("1. Registration creates unverified customer and dispatches verification email with raw token", async () => {
    dispatchedEmails = [];
    const res = await request(app)
      .post("/api/storefront/v1/auth/register")
      .send({
        firstName: "Jane",
        lastName: "Doe",
        email: testEmail,
        password: "Password123!",
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, "success");
    assert.ok(res.body.message.includes("Registration successful"));
    assert.ok(res.body.data.id);
    registeredCustomerId = res.body.data.id;

    // Verify DB state
    const customerInDb = mockCustomers.find(c => c.id === registeredCustomerId);
    assert.ok(customerInDb);
    assert.strictEqual(customerInDb.emailVerified, false, "Customer must start emailVerified: false");
    assert.ok(customerInDb.verificationToken, "Hashed verification token must exist in DB");
    assert.ok(customerInDb.verificationExpires, "Verification expiry must exist in DB");

    // Verify dispatched email
    assert.strictEqual(dispatchedEmails.length, 1, "Verification email should have been sent");
    const email = dispatchedEmails[0];
    assert.strictEqual(email.to, testEmail);
    assert.ok(email.subject.includes("Verify"));
    assert.ok(email.html.includes("/verify-email?token="));

    // Extract raw token from email URL
    const match = email.html.match(/token=([a-f0-9]+)/);
    assert.ok(match && match[1], "Raw token must be extracted from email");
    rawVerificationToken = match[1];

    // Token in DB must be hashed
    const expectedHash = crypto.createHash("sha256").update(rawVerificationToken).digest("hex");
    assert.strictEqual(customerInDb.verificationToken, expectedHash, "Token in DB must be SHA-256 hashed");
  });

  await suite.test("2. Verification with invalid token is rejected", async () => {
    const res = await request(app)
      .post("/api/storefront/v1/auth/verify-email")
      .send({
        token: "invalid-token-1234567890abcdef",
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.message.includes("invalid or has expired"));
  });

  await suite.test("3. Verification with expired token is rejected", async () => {
    const cust = mockCustomers.find(c => c.id === registeredCustomerId);
    cust.verificationExpires = new Date(Date.now() - 3600 * 1000); // Expired 1 hour ago

    const res = await request(app)
      .post("/api/storefront/v1/auth/verify-email")
      .send({
        token: rawVerificationToken,
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.message.includes("invalid or has expired"));
  });

  await suite.test("4. Resend verification generates new token and invalidates prior token", async () => {
    dispatchedEmails = [];
    const res = await request(app)
      .post("/api/storefront/v1/auth/resend-verification")
      .send({
        email: testEmail,
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, "success");
    assert.ok(res.body.message.includes("verification email has been sent"));

    assert.strictEqual(dispatchedEmails.length, 1);
    const email = dispatchedEmails[0];
    const match = email.html.match(/token=([a-f0-9]+)/);
    assert.ok(match && match[1]);
    const newRawToken = match[1];
    assert.notStrictEqual(newRawToken, rawVerificationToken, "New token must differ from old token");

    // Old token should fail
    const oldRes = await request(app)
      .post("/api/storefront/v1/auth/verify-email")
      .send({ token: rawVerificationToken });
    assert.strictEqual(oldRes.status, 400);

    rawVerificationToken = newRawToken;
  });

  await suite.test("5. Resend verification does not leak email existence (enumeration defense)", async () => {
    dispatchedEmails = [];
    const res = await request(app)
      .post("/api/storefront/v1/auth/resend-verification")
      .send({
        email: "nonexistent.account.xyz123@vyzobd.com",
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, "success");
    assert.strictEqual(dispatchedEmails.length, 0, "No email dispatched for nonexistent account");
  });

  await suite.test("6. Valid verification token verifies account and clears token (single-use)", async () => {
    const res = await request(app)
      .post("/api/storefront/v1/auth/verify-email")
      .send({
        token: rawVerificationToken,
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, "success");
    assert.strictEqual(res.body.message, "Email verified successfully");
    assert.strictEqual(res.body.data.emailVerified, true);

    // Verify DB state
    const customerInDb = mockCustomers.find(c => c.id === registeredCustomerId);
    assert.strictEqual(customerInDb?.emailVerified, true, "Customer must now be emailVerified: true");
    assert.strictEqual(customerInDb?.verificationToken, null, "Token must be cleared");
    assert.strictEqual(customerInDb?.verificationExpires, null, "Expires must be cleared");

    // Second verification attempt with SAME token must fail (single-use check)
    const replayRes = await request(app)
      .post("/api/storefront/v1/auth/verify-email")
      .send({
        token: rawVerificationToken,
      });
    assert.strictEqual(replayRes.status, 400);
  });

  await suite.test("7. Forgot password sends reset email and resets password securely", async () => {
    dispatchedEmails = [];
    const forgotRes = await request(app)
      .post("/api/storefront/v1/auth/forgot-password")
      .send({ email: testEmail });

    assert.strictEqual(forgotRes.status, 200);
    assert.strictEqual(dispatchedEmails.length, 1);
    const email = dispatchedEmails[0];
    assert.ok(email.subject.includes("Password"));
    const match = email.html.match(/token=([a-f0-9]+)/);
    assert.ok(match && match[1]);
    const rawResetToken = match[1];

    // Reset password with token
    const resetRes = await request(app)
      .post("/api/storefront/v1/auth/reset-password")
      .send({
        token: rawResetToken,
        newPassword: "BrandNewSecurePassword123!",
      });

    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetRes.body.status, "success");

    // Replaying reset token must fail
    const replayResetRes = await request(app)
      .post("/api/storefront/v1/auth/reset-password")
      .send({
        token: rawResetToken,
        newPassword: "AnotherPassword123!",
      });
    assert.strictEqual(replayResetRes.status, 400);
  });

  await suite.test("8. SMTP failure does not crash registration (error isolation)", async () => {
    (emailService as any).transporter.sendMail = async () => {
      throw new Error("SMTP connection timed out");
    };

    const res = await request(app)
      .post("/api/storefront/v1/auth/register")
      .send({
        firstName: "Grace",
        lastName: "Hopper",
        email: "grace.hopper@vyzobd.com",
        password: "Password123!",
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, "success");
    assert.ok(res.body.message.includes("could not send the verification email"));
  });
});
