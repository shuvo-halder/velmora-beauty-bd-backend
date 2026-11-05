import { prisma } from "../config/db";
import nodemailer from "nodemailer";
import { AppError } from "../utils/AppError";
import { logger } from "../config/logger";
import { getVerificationEmailHtml, getEmailChangeHtml, getPasswordResetHtml, getOrderConfirmationHtml, getOrderProcessingHtml, getOrderConfirmedHtml, getOrderCancelledHtml, getPaymentSuccessHtml, getPaymentFailedHtml, getOrderShippedHtml, getOrderDeliveredHtml, getReturnRequestedHtml, getReturnApprovedHtml, getReturnRejectedHtml, getReturnReceivedHtml, getRefundRequestedHtml, getRefundCompletedHtml, getRefundRejectedHtml, getAdminOrderNotificationHtml, getAdminPaymentFailedHtml, getAdminLowStockHtml, getAdminReturnRequestedHtml, getAdminRefundHtml, getStaffAssignmentHtml } from "./email/templates";

export class EmailService {
  public transporter: any = {
    sendMail: async (options: any) => {
      const realTransporter = await this.createRealTransporter();
      return realTransporter.sendMail(options);
    }
  };

  public resolveSecure(port: number, configuredSecure?: boolean | null): boolean {
    if (port === 587) {
      return false; // Port 587 MUST always be false for STARTTLS in Nodemailer according to Test F
    }
    if (configuredSecure !== undefined && configuredSecure !== null) {
      return configuredSecure;
    }
    return port === 465;
  }

  public async createRealTransporter(): Promise<nodemailer.Transporter> {
    let setting: any = null;
    try {
      setting = await prisma.sMTPSetting.findFirst();
    } catch {
      // Database may not be initialized in isolated test environments
    }

    if (setting && setting.enabled && setting.host && setting.username) {
      const port = setting.port || 587;
      const secure = this.resolveSecure(port, setting.secure);
      return nodemailer.createTransport({
        host: setting.host,
        port,
        secure,
        auth: {
          user: setting.username,
          pass: setting.password || "",
        },
      });
    }

    // Fallback to env
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const envSecure = process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === "true"
      : this.resolveSecure(port);

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: envSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  
  public async verify(): Promise<boolean> {
    try {
      const realTransporter = await this.createRealTransporter();
      await realTransporter.verify();
      return true;
    } catch (error: any) {
      this.logError("SMTP Verification Failed", error);
      throw error;
    }
  }

  private async getTransporter() {
    return this.transporter;
  }

  private logError(context: string, error: any) {
    const diagnostics = {
      code: error?.code,
      command: error?.command,
      response: error?.response,
      responseCode: error?.responseCode,
      message: error?.message,
    };
    logger.error(`[EMAIL] ${context}: ${error?.message || "Delivery failed"}`, diagnostics);
    console.error(`[EMAIL] ${context}`, diagnostics);
  }

  
  public async getStoreName() {
    let setting: any = null;
    try {
      setting = await prisma.brandingSetting.findFirst();
    } catch {
      // Fallback
    }
    if (setting && (setting.siteName || setting.storeName)) {
      return setting.siteName || setting.storeName;
    }
    return process.env.STORE_NAME || 'Storefront';
  }

  private async getFromAddress() {
    let setting: any = null;
    try {
      setting = await prisma.sMTPSetting.findFirst();
    } catch {
      // Fallback
    }
    const storeName = await this.getStoreName();
    if (setting && setting.enabled && setting.fromEmail) {
      const name = setting.fromName || storeName;
      return `"${name}" <${setting.fromEmail}>`;
    }
    return process.env.SMTP_FROM || `"${storeName}" <noreply@storefront.com>`;
  }

  private async send(mailOptions: any) {
    if (!mailOptions.from) {
       mailOptions.from = await this.getFromAddress();
    }
    const transporter = await this.getTransporter();
    return transporter.sendMail(mailOptions);
  }

  private getStorefrontUrl() {
    let url = process.env.STOREFRONT_URL || "http://localhost:3000";
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    return url;
  }

  private getAdminUrl() {
    let url = process.env.ADMIN_URL || process.env.APP_URL || process.env.STOREFRONT_URL || "http://localhost:3000";
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    return url;
  }

  async sendVerificationEmail(email: string, firstName: string | null | undefined, token: string) {
    if (!process.env.SMTP_HOST && process.env.NODE_ENV === "production") {
      console.warn("[EMAIL] SMTP_HOST not set, verification email may fail.");
    }
    
    const verificationUrl = `${this.getStorefrontUrl()}/verify-email?token=${encodeURIComponent(token)}`;
    const displayName = firstName || "Customer";

    const storeName = await this.getStoreName();
    const mailOptions = {
      to: email,
      subject: "Verify Your Email Address",
      html: getVerificationEmailHtml(displayName, verificationUrl, storeName),
    };

    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError("Verification email delivery failed to recipient", error);
      throw new AppError("Failed to send verification email. Please try again later.", 500, "EMAIL_SEND_FAILED");
    }
  }

  async sendEmailChangeVerificationEmail(newEmail: string, firstName: string | null | undefined, token: string) {
    const verificationUrl = `${this.getStorefrontUrl()}/verify-email-change?token=${encodeURIComponent(token)}`;
    const displayName = firstName || "Customer";

    const storeName = await this.getStoreName();
    const mailOptions = {
      to: newEmail,
      subject: "Confirm Your New Email Address",
      html: getEmailChangeHtml(displayName, verificationUrl, storeName),
    };

    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError("Email change verification delivery failed to recipient", error);
      throw new AppError("Failed to send verification email to the new address. Please try again.", 500, "EMAIL_SEND_FAILED");
    }
  }

  async sendPasswordResetEmail(email: string, firstName: string | null | undefined, rawToken: string) {
    const resetUrl = `${this.getStorefrontUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const displayName = firstName || "Customer";

    const storeName = await this.getStoreName();
    const mailOptions = {
      to: email,
      subject: "Reset Your Password",
      html: getPasswordResetHtml(displayName, resetUrl, storeName),
    };

    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError("Password reset email delivery failed to recipient", error);
      throw new AppError("Failed to send password reset email. Please try again later.", 500, "EMAIL_SEND_FAILED");
    }
  }

  async sendAdminPasswordResetEmail(email: string, firstName: string | null | undefined, rawToken: string) {
    const resetUrl = `${this.getAdminUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const displayName = firstName || "Admin";

    const storeName = await this.getStoreName();
    const mailOptions = {
      to: email,
      subject: "Reset Your Password",
      html: getPasswordResetHtml(displayName, resetUrl, storeName),
    };

    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError("Admin password reset email delivery failed to recipient", error);
    }
  }

  async sendOrderConfirmationEmail(customer: { email: string; firstName?: string | null; lastName?: string | null }, order: any) {
    if (!customer || !customer.email) return;
    const displayName = customer.firstName || "Customer";
    const storeName = await this.getStoreName();
    const mailOptions = {
      to: customer.email,
      subject: `Order Confirmation #${order.orderNumber}`,
      html: getOrderConfirmationHtml(displayName, order, storeName),
    };
    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Order confirmation email delivery failed for order ${order.orderNumber}`, error);
    }
  }

  async sendOrderProcessingEmail(customer: { email: string; firstName?: string | null; lastName?: string | null }, order: any) {
    if (!customer || !customer.email) return;
    const displayName = customer.firstName || "Customer";
    const storeName = await this.getStoreName();
    const mailOptions = {
      to: customer.email,
      subject: `Your Order #${order.orderNumber} is Processing`,
      html: getOrderProcessingHtml(displayName, order, storeName),
    };
    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Order processing email delivery failed for order ${order.orderNumber}`, error);
    }
  }

  async sendOrderConfirmedEmail(customer: { email: string; firstName?: string | null; lastName?: string | null }, order: any) {
    if (!customer || !customer.email) return;
    const displayName = customer.firstName || "Customer";
    const storeName = await this.getStoreName();
    const mailOptions = {
      to: customer.email,
      subject: `Your Order #${order.orderNumber} is Confirmed`,
      html: getOrderConfirmedHtml(displayName, order, storeName),
    };
    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Order confirmed email delivery failed for order ${order.orderNumber}`, error);
    }
  }

  async sendOrderCancelledEmail(customer: { email: string; firstName?: string | null; lastName?: string | null }, order: any) {
    if (!customer || !customer.email) return;
    const displayName = customer.firstName || "Customer";
    const storeName = await this.getStoreName();
    const mailOptions = {
      to: customer.email,
      subject: `Your Order #${order.orderNumber} is Cancelled`,
      html: getOrderCancelledHtml(displayName, order, storeName),
    };
    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Order cancelled email delivery failed for order ${order.orderNumber}`, error);
    }
  }

  async sendPaymentSuccessEmail(customer: { email: string; firstName?: string | null; lastName?: string | null }, payment: any, order: any) {
    if (!customer || !customer.email) return;
    const displayName = customer.firstName || "Customer";
    const storeName = await this.getStoreName();
    const mailOptions = {
      to: customer.email,
      subject: `Payment Successful for Order #${order.orderNumber}`,
      html: getPaymentSuccessHtml(displayName, payment, order, storeName),
    };
    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Payment success email delivery failed for order ${order.orderNumber}`, error);
    }
  }

  async sendPaymentFailedEmail(customer: { email: string; firstName?: string | null; lastName?: string | null }, payment: any, order: any) {
    if (!customer || !customer.email) return;
    const displayName = customer.firstName || "Customer";
    const storeName = await this.getStoreName();
    const mailOptions = {
      to: customer.email,
      subject: `Payment Failed for Order #${order.orderNumber}`,
      html: getPaymentFailedHtml(displayName, payment, order, storeName),
    };
    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Payment failed email delivery failed for order ${order.orderNumber}`, error);
    }
  }

  async sendOrderShippedEmail(customer: { email: string; firstName?: string | null; lastName?: string | null }, shipment: any, order: any) {
    if (!customer || !customer.email) return;
    const displayName = customer.firstName || "Customer";
    const storeName = await this.getStoreName();
    const mailOptions = {
      to: customer.email,
      subject: `Your Order #${order.orderNumber} has Shipped`,
      html: getOrderShippedHtml(displayName, shipment, order, storeName),
    };
    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Order shipped email delivery failed for order ${order.orderNumber}`, error);
    }
  }

  async sendOrderDeliveredEmail(customer: { email: string; firstName?: string | null; lastName?: string | null }, shipment: any, order: any) {
    if (!customer || !customer.email) return;
    const displayName = customer.firstName || "Customer";
    const storeName = await this.getStoreName();
    const mailOptions = {
      to: customer.email,
      subject: `Your Order #${order.orderNumber} has been Delivered`,
      html: getOrderDeliveredHtml(displayName, shipment, order, storeName),
    };
    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Order delivered email delivery failed for order ${order.orderNumber}`, error);
    }
  }

  async sendReturnRequestedEmail(customer: { email: string; firstName?: string | null; lastName?: string | null }, returnReq: any, order: any) {
    if (!customer || !customer.email) return;
    const displayName = customer.firstName || "Customer";
    const storeName = await this.getStoreName();
    const mailOptions = {
      to: customer.email,
      subject: `Return Requested for Order #${order.orderNumber}`,
      html: getReturnRequestedHtml(displayName, returnReq, order, storeName),
    };
    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Return requested email delivery failed for order ${order.orderNumber}`, error);
    }
  }

  async sendReturnApprovedEmail(customer: { email: string; firstName?: string | null; lastName?: string | null }, returnReq: any, order: any) {
    if (!customer || !customer.email) return;
    const displayName = customer.firstName || "Customer";
    const storeName = await this.getStoreName();
    const mailOptions = {
      to: customer.email,
      subject: `Return Approved for Order #${order.orderNumber}`,
      html: getReturnApprovedHtml(displayName, returnReq, order, storeName),
    };
    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Return approved email delivery failed for order ${order.orderNumber}`, error);
    }
  }

  async sendReturnRejectedEmail(customer: { email: string; firstName?: string | null; lastName?: string | null }, returnReq: any, order: any) {
    if (!customer || !customer.email) return;
    const displayName = customer.firstName || "Customer";
    const storeName = await this.getStoreName();
    const mailOptions = {
      to: customer.email,
      subject: `Return Rejected for Order #${order.orderNumber}`,
      html: getReturnRejectedHtml(displayName, returnReq, order, storeName),
    };
    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Return rejected email delivery failed for order ${order.orderNumber}`, error);
    }
  }

  async sendReturnReceivedEmail(customer: { email: string; firstName?: string | null; lastName?: string | null }, returnReq: any, order: any) {
    if (!customer || !customer.email) return;
    const displayName = customer.firstName || "Customer";
    const storeName = await this.getStoreName();
    const mailOptions = {
      to: customer.email,
      subject: `Return Received for Order #${order.orderNumber}`,
      html: getReturnReceivedHtml(displayName, returnReq, order, storeName),
    };
    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Return received email delivery failed for order ${order.orderNumber}`, error);
    }
  }

  async sendRefundRequestedEmail(customer: { email: string; firstName?: string | null; lastName?: string | null }, refund: any, order: any) {
    if (!customer || !customer.email) return;
    const displayName = customer.firstName || "Customer";
    const storeName = await this.getStoreName();
    const mailOptions = {
      to: customer.email,
      subject: `Refund Requested for Order #${order.orderNumber}`,
      html: getRefundRequestedHtml(displayName, refund, order, storeName),
    };
    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Refund requested email delivery failed for order ${order.orderNumber}`, error);
    }
  }

  async sendRefundCompletedEmail(customer: { email: string; firstName?: string | null; lastName?: string | null }, refund: any, order: any) {
    if (!customer || !customer.email) return;
    const displayName = customer.firstName || "Customer";
    const storeName = await this.getStoreName();
    const mailOptions = {
      to: customer.email,
      subject: `Refund Completed for Order #${order.orderNumber}`,
      html: getRefundCompletedHtml(displayName, refund, order, storeName),
    };
    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Refund completed email delivery failed for order ${order.orderNumber}`, error);
    }
  }

  async sendRefundRejectedEmail(customer: { email: string; firstName?: string | null; lastName?: string | null }, refund: any, order: any) {
    if (!customer || !customer.email) return;
    const displayName = customer.firstName || "Customer";
    const storeName = await this.getStoreName();
    const mailOptions = {
      to: customer.email,
      subject: `Refund Rejected for Order #${order.orderNumber}`,
      html: getRefundRejectedHtml(displayName, refund, order, storeName),
    };
    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Refund rejected email delivery failed for order ${order.orderNumber}`, error);
    }
  }

  async getAdminRecipients(): Promise<string[]> {
    const recipients: string[] = [];
    try {
      const storeSetting = await prisma.storeSetting.findFirst();
      if (storeSetting && storeSetting.supportEmail) {
        recipients.push(storeSetting.supportEmail);
      }
      
      if (recipients.length === 0) {
        const superAdmins = await prisma.user.findMany({
          where: { role: { name: 'SUPER_ADMIN' }, isActive: true, deletedAt: null }
        });
        recipients.push(...superAdmins.map(u => u.email));
      }
    } catch (error) {
      logger.error("[EmailService] Failed to resolve admin recipients", error);
    }
    
    return Array.from(new Set(recipients)).filter(Boolean);
  }

  async sendAdminOrderNotificationEmail(order: any) {
    const recipients = await this.getAdminRecipients();
    if (!recipients.length) return;
    
    let customerInfo = { name: "Guest", email: "N/A" };
    if (order.customer) {
      customerInfo = { name: (order.customer.firstName + " " + (order.customer.lastName || "")).trim(), email: order.customer.email };
    } else if (order.customerEmail) {
      customerInfo.email = order.customerEmail;
    }
    const adminUrl = process.env.ADMIN_URL || "http://localhost:3000";

    const storeName = await this.getStoreName();
    const mailOptions = {
      to: recipients.join(','),
      subject: `New Order: #${order.orderNumber}`,
      html: getAdminOrderNotificationHtml(order, customerInfo, adminUrl, storeName),
    };

    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Admin order notification failed for order ${order.orderNumber}`, error);
    }
  }

  async sendAdminPaymentFailedEmail(payment: any, order: any) {
    const recipients = await this.getAdminRecipients();
    if (!recipients.length) return;
    
    let customerInfo = { name: "Guest", email: "N/A" };
    if (order.customer) {
      customerInfo = { name: (order.customer.firstName + " " + (order.customer.lastName || "")).trim(), email: order.customer.email };
    } else if (order.customerEmail) {
      customerInfo.email = order.customerEmail;
    }
    const adminUrl = process.env.ADMIN_URL || "http://localhost:3000";

    const storeName = await this.getStoreName();
    const mailOptions = {
      to: recipients.join(','),
      subject: `Payment Failed: #${order.orderNumber}`,
      html: getAdminPaymentFailedHtml(order, payment, customerInfo, adminUrl, storeName),
    };

    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Admin payment failed email delivery failed for order ${order.orderNumber}`, error);
    }
  }

  async sendAdminLowStockEmail(product: any, variant: any, currentStock: number, threshold: number) {
    const recipients = await this.getAdminRecipients();
    if (!recipients.length) return;
    
    const adminUrl = process.env.ADMIN_URL || "http://localhost:3000";

    const storeName = await this.getStoreName();
    const mailOptions = {
      to: recipients.join(','),
      subject: `Low Stock Alert: ${product.name}`,
      html: getAdminLowStockHtml(product, variant, currentStock, threshold, adminUrl, storeName),
    };

    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Admin low stock email delivery failed for product ${product.id}`, error);
    }
  }

  async sendAdminReturnRequestedEmail(returnReq: any, order: any) {
    const recipients = await this.getAdminRecipients();
    if (!recipients.length) return;
    
    let customerInfo = { name: "Guest", email: "N/A" };
    if (order.customer) {
      customerInfo = { name: (order.customer.firstName + " " + (order.customer.lastName || "")).trim(), email: order.customer.email };
    } else if (order.customerEmail) {
      customerInfo.email = order.customerEmail;
    }
    const adminUrl = process.env.ADMIN_URL || "http://localhost:3000";

    const storeName = await this.getStoreName();
    const mailOptions = {
      to: recipients.join(','),
      subject: `Return Requested: #${order.orderNumber}`,
      html: getAdminReturnRequestedHtml(returnReq, order, customerInfo, adminUrl, storeName),
    };

    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Admin return requested email delivery failed for order ${order.orderNumber}`, error);
    }
  }

  async sendAdminRefundEmail(refund: any, order: any, type: 'Requested' | 'Completed' | 'Rejected') {
    const recipients = await this.getAdminRecipients();
    if (!recipients.length) return;
    
    const adminUrl = process.env.ADMIN_URL || "http://localhost:3000";

    const storeName = await this.getStoreName();
    const mailOptions = {
      to: recipients.join(','),
      subject: `Refund ${type}: #${order.orderNumber}`,
      html: getAdminRefundHtml(refund, order, type, adminUrl, storeName),
    };

    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Admin refund ${type} email delivery failed for order ${order.orderNumber}`, error);
    }
  }

  async sendStaffAssignmentEmail(staff: any, order: any) {
    if (!staff || !staff.email) return;
    
    const adminUrl = process.env.ADMIN_URL || "http://localhost:3000";

    const storeName = await this.getStoreName();
    const mailOptions = {
      to: staff.email,
      subject: `Order Assigned: #${order.orderNumber}`,
      html: getStaffAssignmentHtml(staff, order, adminUrl, storeName),
    };

    try {
      await this.send(mailOptions);
    } catch (error: any) {
      this.logError(`Staff assignment email delivery failed for order ${order.orderNumber}`, error);
    }
  }
}

export const emailService = new EmailService();
