import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url().default("postgresql://user:password@localhost:5432/ecommerce?schema=public"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long for cryptographic security").default("super-secret-jwt-key-change-in-prod"),
  COOKIE_SECRET: z.string().min(10).default("super-secure-cookie-secret-key-for-session-signing"),
  JWT_EXPIRES_IN: z.string().default("1h"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000,http://localhost:5173"),
  GA_MEASUREMENT_ID: z.string().optional(),
  GA_API_SECRET: z.string().optional(),
  GA_PROPERTY_ID: z.string().optional(),
  GOOGLE_CREDENTIALS_JSON: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
});

// Part 9 - Environment Security Startup validation
const requiredVars = ["JWT_SECRET", "DATABASE_URL", "COOKIE_SECRET", "ALLOWED_ORIGINS"];
const missingVars: string[] = [];

requiredVars.forEach((v) => {
  if (!process.env[v]) {
    missingVars.push(v);
  }
});

if (process.env.NODE_ENV === "production" && missingVars.length > 0) {
  console.error(`❌ Security Hardening Startup Error: Missing required production security configuration variables: ${missingVars.join(", ")}`);
  process.exit(1);
}

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:");
  console.error(_env.error.format());
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = _env.data.DATABASE_URL;
}

export const env = _env.data;
