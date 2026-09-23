import { migrate } from "./migrate.js";

/**
 * Ensures the database is up to date by applying pending migrations.
 * Safe to call on every boot and from tests (all migrations are idempotent).
 */
export async function ensureSchema() {
  return migrate();
}
