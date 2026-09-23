import { randomUUID } from "node:crypto";

/** Attaches a stable request id (honouring a caller-supplied one) to every response. */
export function requestId(req, res, next) {
  const incoming = req.get("x-request-id");
  req.id = incoming && incoming.length <= 128 ? incoming : randomUUID();
  res.setHeader("x-request-id", req.id);
  next();
}
