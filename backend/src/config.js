import "dotenv/config";

/**
 * Central, typed-ish configuration. Values are read once at import time so a
 * process cannot silently drift from its environment mid-run.
 *
 * `assertEnv()` performs the fail-fast check for required secrets and is called
 * from the real server bootstrap (not from tests, which supply their own env).
 */

function bool(value, fallback = false) {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

function num(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const nodeEnv = process.env.NODE_ENV || "development";
const TEST_MODE =
  process.env.NODE_ENV === "test" ||
  process.env.NODE_TEST_CONTEXT !== undefined ||
  process.argv.some((arg) => arg.includes("--test"));

export const config = {
  nodeEnv,
  port: num(process.env.PORT, 3001),
  logLevel: process.env.LOG_LEVEL || (TEST_MODE ? "silent" : "info"),
  logPretty: bool(process.env.LOG_PRETTY, nodeEnv === "development" && !TEST_MODE),
  trustProxy: bool(process.env.TRUST_PROXY, false),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  cors: {
    origins: (process.env.FRONTEND_ORIGIN || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  openai: {
    timeoutMs: num(process.env.OPENAI_TIMEOUT_MS, 30_000),
    maxRetries: num(process.env.OPENAI_MAX_RETRIES, 2),
    retryBaseMs: num(process.env.OPENAI_RETRY_BASE_MS, 400),
  },
  rateLimit: {
    enabled: bool(process.env.RATE_LIMIT_ENABLED, true) && !TEST_MODE,
    windowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    max: num(process.env.RATE_LIMIT_MAX, 300),
    authMax: num(process.env.RATE_LIMIT_AUTH_MAX, 50),
    captureMax: num(process.env.RATE_LIMIT_CAPTURE_MAX, 60),
  },
};

const REQUIRED = ["DATABASE_URL", "JWT_SECRET"];

export function missingEnv() {
  return REQUIRED.filter((key) => !process.env[key]);
}

export function assertEnv() {
  const missing = missingEnv();
  if (missing.length) {
    const list = missing.join(", ");
    throw new Error(
      `Missing required environment variable(s): ${list}. Copy backend/.env.example to backend/.env and fill them in.`
    );
  }
}

export const isTest = () => TEST_MODE;
