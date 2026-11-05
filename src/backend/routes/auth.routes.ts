import express from "express";
import {
  login,
  getMe,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth";
import {
  loginLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} from "../middlewares/rateLimiter";
import {
  validateBody,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../middlewares/validation";

const router = express.Router();

router.post("/login", loginLimiter, validateBody(loginSchema), login);
router.post("/logout", requireAuth, logout);
router.post("/refresh", refresh);
router.post("/forgot-password", forgotPasswordLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", resetPasswordLimiter, validateBody(resetPasswordSchema), resetPassword);
router.post("/change-password", requireAuth, validateBody(changePasswordSchema), changePassword);
router.get("/me", requireAuth, getMe);

export default router;

