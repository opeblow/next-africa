import { logger } from "../lib/logger.js";

export function notFound(req, res) {
  return res.status(404).json({ error: "Not found", path: req.path, requestId: req.id });
}

// Express error middleware (4 args required). Keep framework/parser failures
// from exposing implementation details while still logging them server-side.
export function errorHandler(error, req, res, _next) {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ error: "Invalid JSON request body", requestId: req.id });
  }
  logger.error(
    { err: error, requestId: req.id, method: req.method, path: req.path },
    "Unhandled API error"
  );
  return res
    .status(500)
    .json({ error: "An unexpected server error occurred", requestId: req.id });
}
