import "dotenv/config";
import pg from "pg";
import { ensureSchema } from "./schema.js";

const dbUrl = new URL(process.env.DATABASE_URL);
const dbName = dbUrl.pathname.slice(1);
const adminUrl = new URL(dbUrl);
adminUrl.pathname = "/postgres";

async function ensureDatabase() {
  const adminPool = new pg.Pool({ connectionString: adminUrl.toString() });
  try {
    const { rows } = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (rows.length === 0) {
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[db] created database "${dbName}"`);
    } else {
      console.log(`[db] database "${dbName}" already exists`);
    }
  } finally {
    await adminPool.end();
  }
}

await ensureDatabase();
await ensureSchema();
console.log("[db] schema ready");
process.exit(0);