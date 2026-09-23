import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.get("authorization");
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Authentication is required" });
  try {
    req.user_id = jwt.verify(header.slice(7), process.env.JWT_SECRET).user_id;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
