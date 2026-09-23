import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { pool, query } from "./pool.js";

const migrationsDir = fileURLToPath(new URL("../../migrations", import.meta.url));

/**
 * Applies every pending `NNNN_name.sql` migration exactly once, tracked in the
 * `schema_migrations` table. Each migration runs inside its own transaction.
 */
export async function migrate() {
  await query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name       TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`
  );

  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  const { rows } = await query("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((row) => row.name));
  const ran = [];

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      ran.push(file);
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${error.message}`, { cause: error });
    } finally {
      client.release();
    }
  }

  return ran;
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  try {
    const ran = await migrate();
    console.log(
      ran.length ? `[db] applied ${ran.length} migration(s): ${ran.join(", ")}` : "[db] no pending migrations"
    );
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error(`[db] ${error.message}`);
    process.exit(1);
  }
}
