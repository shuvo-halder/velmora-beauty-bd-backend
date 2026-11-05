import { z } from "zod";
import express from "express";
import {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
} from "../../controllers/storefront/auth.controller";
import {
  registerMobile,
  verifyMobileRegistration,
  loginMobile,
  verifyMobileLogin,
} from "../../controllers/storefront/auth-mobile.controller";
import { getMyProfile } from "../../controllers/storefront/account.controller";
import { requireCustomerAuth } from "../../middlewares/customerAuth";
import {
  loginLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  registerLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter,
  otpRequestLimiter,
} from "../../middlewares/rateLimiter";
import { validateBody } from "../../middlewares/validation";
import {
  customerRegisterSchema,
  customerLoginSchema,
  customerForgotPasswordSchema,
  customerResetPasswordSchema,
  customerMobileRegisterSchema,
  customerMobileVerifySchema,
  customerMobileLoginSchema,
} from "../../validators/storefront-auth.validator";

const router = express.Router();

// Email flows
router.post("/register", registerLimiter, validateBody(customerRegisterSchema), register);
router.post("/login", loginLimiter, validateBody(customerLoginSchema), login);

// Mobile flows
router.post("/register-mobile", otpRequestLimiter, validateBody(customerMobileRegisterSchema), registerMobile);
router.post("/verify-mobile-registration", registerLimiter, validateBody(customerMobileVerifySchema), verifyMobileRegistration);
router.post("/login-mobile", otpRequestLimiter, validateBody(customerMobileLoginSchema), loginMobile);
router.post("/verify-mobile-login", loginLimiter, validateBody(customerMobileVerifySchema), verifyMobileLogin);

// Token / Session
router.post("/refresh", refresh);
router.post("/logout", requireCustomerAuth, logout);

// Profile and session inspection endpoints for storefront client compatibility
router.get("/me", requireCustomerAuth, getMyProfile);
router.get("/profile", requireCustomerAuth, getMyProfile);

// Password recovery
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validateBody(customerForgotPasswordSchema),
  forgotPassword
);
router.post(
  "/reset-password",
  resetPasswordLimiter,
  validateBody(customerResetPasswordSchema),
  resetPassword
);

// Email verification
router.post("/verify-email", verifyEmailLimiter, verifyEmail);
router.post("/resend-verification", resendVerificationLimiter, validateBody(z.object({ email: z.string().email() })), resendVerificationEmail);

export default router;
