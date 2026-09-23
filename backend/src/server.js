import "dotenv/config";
import { app } from "./app.js";
import { ensureSchema } from "./db/schema.js";
import { pool } from "./db/pool.js";
import { assertEnv, config, missingEnv } from "./config.js";
import { logger } from "./lib/logger.js";

try {
  assertEnv();
} catch (error) {
  console.error(`[config] ${error.message}`);
  process.exit(1);
}

if (missingEnv().includes("JWT_SECRET")) {
  logger.warn("JWT_SECRET is not set — access tokens cannot be signed securely");
}
if (!process.env.OPENAI_API_KEY) {
  logger.warn("OPENAI_API_KEY is not set — capture endpoints will return 503");
}
if (config.cors.origins.length === 0) {
  logger.warn("FRONTEND_ORIGIN is not set — CORS currently allows all origins (fine for local dev)");
}

try {
  await ensureSchema();
  logger.info("database schema ready");
} catch (error) {
  logger.error({ err: error }, "database schema setup failed");
  process.exit(1);
}

const server = app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, "NEXT Africa backend listening");
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutting down");
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => logger.error({ err: reason }, "unhandled rejection"));
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "uncaught exception");
  process.exit(1);
});
