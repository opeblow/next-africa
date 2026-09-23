import { logger } from "../lib/logger.js";

const QUIET_PATHS = new Set(["/api/health", "/api/live", "/api/ready"]);

/** Structured access log with per-request duration and id. */
export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    if (QUIET_PATHS.has(req.path)) return;
    const durationMs = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger[level](
      {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs,
      },
      "request"
    );
  });
  next();
}
