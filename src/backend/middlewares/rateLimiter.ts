import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import { AuditService } from "../services/audit.service";

/**
 * Extracts and normalizes the client IP address from the request.
 * Correctly accounts for reverse proxies (e.g. Apache) when Express "trust proxy" is configured.
 */
export const getClientIp = (req: Request): string => {
  let ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
  // If IPv6 mapped IPv4 address (::ffff:127.0.0.1), extract clean IPv4
  if (typeof ip === "string" && ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }
  return ip;
};

interface LimiterConfig {
  max: number;
  minutes: number;
  actionName: string;
  skipSuccessfulRequests?: boolean;
  skip?: (req: Request) => boolean;
}

const createLimiter = ({
  max,
  minutes,
  actionName,
  skipSuccessfulRequests = false,
  skip
}: LimiterConfig) => {
  return rateLimit({
    windowMs: minutes * 60 * 1000,
    max,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests,
    keyGenerator: (req: Request) => getClientIp(req),
    skip: skip || ((req: Request) => req.method === "OPTIONS"),
    validate: {
      trustProxy: false, // We use custom getClientIp to safely resolve IPs
      xForwardedForHeader: false,
      forwardedHeader: false,
    },
    handler: async (req: Request, res: Response) => {
      const ip = getClientIp(req);
      
      console.warn(`[RATE_LIMIT] ${actionName} rate limit exceeded by IP: ${ip} on path: ${req.originalUrl || req.path}`);

      try {
        await AuditService.createLog(
          null,
          "RATE_LIMIT_EXCEEDED",
          "Security",
          null,
          null,
          {
            action: actionName,
            path: req.originalUrl || req.path,
            ipAddress: ip,
            userAgent: req.headers["user-agent"] || null,
          },
          req
        );
      } catch (err) {
        console.error("Failed to log rate limit exceeded:", err);
      }

      res.status(429).json({
        status: "fail",
        error: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests from this IP, please try again later."
      });
    }
  });
};

// Global API rate limiter (300 requests/minute per IP, skipping OPTIONS & health checks)
export const globalLimiter = createLimiter({
  max: 300,
  minutes: 1,
  actionName: "GLOBAL_API_ATTEMPT",
  skip: (req: Request) => {
    if (req.method === "OPTIONS") return true;
    const path = req.path || "";
    if (path === "/health" || path === "/api/v1/health" || path.startsWith("/docs")) return true;
    return false;
  }
});

// Dedicated Public Storefront read limiter (300 requests/minute per IP)
export const publicLimiter = createLimiter({
  max: 300,
  minutes: 1,
  actionName: "PUBLIC_API_ATTEMPT",
});

// Dedicated Authentication rate limiter (5 failed attempts/minute per IP; successful logins do NOT penalize)
export const loginLimiter = createLimiter({
  max: 5,
  minutes: 1,
  actionName: "LOGIN_ATTEMPT",
  skipSuccessfulRequests: true
});

// Dedicated Forgot Password rate limiter (5 requests/15 minutes per IP)
export const forgotPasswordLimiter = createLimiter({
  max: 5,
  minutes: 15,
  actionName: "FORGOT_PASSWORD_ATTEMPT",
  skipSuccessfulRequests: true
});

// Dedicated Reset Password rate limiter (10 requests/15 minutes per IP)
export const resetPasswordLimiter = createLimiter({
  max: 10,
  minutes: 15,
  actionName: "RESET_PASSWORD_ATTEMPT",
  skipSuccessfulRequests: true
});

// Dedicated Register rate limiter (5 requests/60 minutes per IP)
export const registerLimiter = createLimiter({
  max: 5,
  minutes: 60,
  actionName: "REGISTER_ATTEMPT",
});

// Dedicated Verify Email rate limiter (10 requests/15 minutes per IP)
export const verifyEmailLimiter = createLimiter({
  max: 10,
  minutes: 15,
  actionName: "VERIFY_EMAIL_ATTEMPT",
  skipSuccessfulRequests: true
});

// Dedicated Resend Verification rate limiter (3 requests/60 minutes per IP)
export const resendVerificationLimiter = createLimiter({
  max: 3,
  minutes: 60,
  actionName: "RESEND_VERIFICATION_ATTEMPT",
});

// Dedicated OTP Request limiter (5 requests/minute per IP, NO skipping successes to prevent timing enumeration attacks)
export const otpRequestLimiter = createLimiter({
  max: 5,
  minutes: 1,
  actionName: "OTP_REQUEST_ATTEMPT",
  skipSuccessfulRequests: false
});
