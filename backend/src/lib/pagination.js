const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/** Parses `limit` + opaque `cursor` from a query string. */
export function parsePagination(query = {}) {
  const requested = Number(query.limit);
  const limit = Number.isFinite(requested)
    ? Math.min(Math.max(Math.trunc(requested), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  let cursor = null;
  if (typeof query.cursor === "string" && query.cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(query.cursor, "base64url").toString("utf8"));
      if (decoded?.created_at && decoded?.id) cursor = decoded;
    } catch {
      cursor = null;
    }
  }
  return { limit, cursor };
}

export function encodeCursor(row) {
  if (!row) return null;
  return Buffer.from(JSON.stringify({ created_at: row.created_at, id: row.id })).toString("base64url");
}
